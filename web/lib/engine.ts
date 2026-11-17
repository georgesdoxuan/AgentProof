import "server-only";
import { createClient } from "@supabase/supabase-js";

// ---------- clients ----------
export const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
  auth: { persistSession: false },
});

const H = process.env.HAI_BASE_URL ?? "https://agp.eu.hcompany.ai";
const AGENT = process.env.H_AGENT ?? "agentproof-shopper";
const JUDGE_MODEL = process.env.HF_MODEL ?? "Qwen/Qwen3.5-9B";

export class RateLimited extends Error {}

async function h(path: string, init: RequestInit = {}) {
  const res = await fetch(path.startsWith("http") ? path : `${H}/api/v2${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${process.env.HAI_API_KEY}`, "Content-Type": "application/json", ...init.headers },
    cache: "no-store",
  });
  if (res.status === 429) throw new RateLimited("H API rate limit");
  if (!res.ok) throw new Error(`H ${res.status} ${path}: ${(await res.text()).slice(0, 300)}`);
  return res;
}

// ---------- types ----------
export const BLOCKERS: Record<string, string> = {
  none: "Aucun",
  cookie_banner: "Bandeau cookies",
  popup: "Pop-up",
  search_failed: "Recherche inutilisable",
  filter_failed: "Filtres inutilisables",
  size_selector: "Sélecteur de taille / variante",
  button_unresponsive: "Bouton qui ne réagit pas",
  captcha_or_bot_block: "Captcha / blocage anti-bot",
  login_required: "Compte obligatoire",
  out_of_stock: "Rupture de stock",
  page_error_or_timeout: "Erreur ou page trop lente",
  other: "Autre",
};

type Answer = { reached_checkout: boolean; blocker_type: string; blocker_detail: string; final_url: string; steps_summary: string };

// ---------- audits ----------
export function normalizeUrl(input: string) {
  const u = new URL(/^https?:\/\//.test(input.trim()) ? input.trim() : `https://${input.trim()}`);
  if (!["http:", "https:"].includes(u.protocol) || !u.hostname.includes(".")) throw new Error("URL invalide");
  return { url: `${u.protocol}//${u.hostname}${u.pathname === "/" ? "" : u.pathname}`, domain: u.hostname.replace(/^www\./, "") };
}

export async function createAudit(input: string, opts: { device?: "desktop" | "mobile"; missions?: number; compareTo?: string; email?: string } = {}) {
  const { url, domain } = normalizeUrl(input);
  const { data: site, error: e1 } = await db
    .from("sites")
    .upsert({ domain, name: domain, url }, { onConflict: "domain", ignoreDuplicates: false })
    .select()
    .single();
  if (e1) throw e1;
  const { data: audit, error: e2 } = await db
    .from("audits")
    .insert({ site_id: site.id, device: opts.device ?? "desktop", compare_to: opts.compareTo ?? null, email: opts.email ?? null })
    .select()
    .single();
  if (e2) throw e2;
  const { data: missions } = await db.from("missions").select("id").eq("active", true).order("position").limit(opts.missions ?? 10);
  await db.from("runs").insert(missions!.map((m) => ({ audit_id: audit.id, mission_id: m.id })));
  return audit.id as string;
}

// ---------- tick: the only place that calls H, max 5 requests per call ----------
// ponytail: one global budget per tick, driven by an n8n cron every minute. Free H keys allow 5 req/min.
const MAX_ACTIVE = 3; // H Free plan: 3 concurrent sessions
const STALE_MIN = 20;

export async function tick() {
  let budget = Number(process.env.H_BUDGET_PER_TICK ?? 5);
  const log: string[] = [];
  try {
    // 1. check launched runs, oldest checked first (1 request each, +1 for the screenshot when done)
    const { data: launched } = await db
      .from("runs")
      .select("*, missions(title), audits(device)")
      .eq("status", "launched")
      .order("checked_at", { ascending: true, nullsFirst: true })
      .limit(2);
    for (const run of launched ?? []) {
      if (budget < 2) break;
      budget--;
      const events = await (await h(`/sessions/${run.session_id}/events?sort=-timestamp&size=15`)).json();
      const done = finishedState(events.items, run);
      if (!done) {
        await db.from("runs").update({ checked_at: new Date().toISOString() }).eq("id", run.id);
        continue;
      }
      budget--;
      await finalize(run, events.items, done);
      log.push(`finalized run ${run.id}`);
    }

    // 2. launch todo runs while slots and budget remain
    const { count: active } = await db.from("runs").select("id", { count: "exact", head: true }).eq("status", "launched");
    const slots = Math.min(MAX_ACTIVE - (active ?? 0), budget);
    if (slots > 0) {
      const { data: todo } = await db
        .from("runs")
        .select("*, missions(instruction), audits(device, sites(url))")
        .eq("status", "todo")
        .order("created_at")
        .limit(slots);
      for (const run of todo ?? []) {
        budget--;
        const res = await h("/sessions", { method: "POST", body: JSON.stringify(sessionRequest(run)) });
        const s = await res.json();
        await db
          .from("runs")
          .update({ status: "launched", session_id: s.id, agent_view_url: s.agent_view_url, launched_at: new Date().toISOString() })
          .eq("id", run.id);
        log.push(`launched run ${run.id}`);
      }
    }
  } catch (e) {
    if (!(e instanceof RateLimited)) throw e;
    log.push("rate limited, next tick");
  }

  // 3. close finished audits (no H request)
  await closeAudits(log);
  return { log, budgetLeft: budget };
}

function sessionRequest(run: { id: number; missions: { instruction: string }; audits: { device: string; sites: { url: string } } }) {
  const url = run.audits.sites.url;
  const overrides: Record<string, unknown> = { "agent.environments[kind=web].start_url": url };
  if (run.audits.device === "mobile") overrides["agent.environments[kind=web].mode"] = { type: "visual", width: 390, height: 844 };
  return {
    agent: AGENT,
    messages: `Site à tester : ${url}\nMission : ${run.missions.instruction}`,
    overrides,
    max_steps: 30,
    max_time_s: 480,
    group_id: `agentproof-${run.id}`,
  };
}

type Ev = { type: string; data: Record<string, any>; timestamp: string };

function finishedState(items: Ev[], run: { launched_at: string }) {
  if (items.some((e) => e.type === "AgentErrorEvent")) return "error";
  if (items.some((e) => e.type === "AgentCompletionEvent")) return "completed";
  if (Date.now() - new Date(run.launched_at).getTime() > STALE_MIN * 60_000) return "stale";
  return null;
}

async function finalize(run: any, items: Ev[], state: string) {
  const obs = items.find((e) => e.type === "AgentEvent" && e.data.kind === "observation_event" && e.data.image?.source);
  const answerEv = items.find((e) => e.type === "AgentEvent" && e.data.kind === "tool_result" && e.data.tool_req?.tool_name === "answer");
  const metrics = items.find((e) => e.type === "MetricsUpdateEvent")?.data.metrics;
  const usage = metrics?.cost_per_model?.[0] ?? {};
  const answer: Answer | null = answerEv?.data.tool_req.args ?? null;

  let screenshot_url: string | null = null;
  if (obs) {
    const img = await h(obs.data.image.source);
    const path = `${run.id}.png`;
    await db.storage.from("screenshots").upload(path, await img.arrayBuffer(), { contentType: "image/png", upsert: true });
    screenshot_url = db.storage.from("screenshots").getPublicUrl(path).data.publicUrl;
  }

  const judge = screenshot_url ? await judgeScreenshot(screenshot_url, run.missions?.title, answer).catch((e) => ({ error: String(e) })) : null;
  const agentSays = !!answer?.reached_checkout;
  const judgeSays = judge && "is_checkout_page" in judge ? !!judge.is_checkout_page : agentSays;
  const blocker = answer?.blocker_type ?? (state === "error" ? "page_error_or_timeout" : "other");

  await db
    .from("runs")
    .update({
      status: "done",
      h_status: state,
      reached_checkout: agentSays,
      success: agentSays && judgeSays,
      blocker_type: agentSays && judgeSays ? "none" : agentSays ? (judge as any)?.blocker_type ?? "other" : blocker,
      blocker_detail: answer?.blocker_detail ?? (state === "stale" ? "Session trop longue, arrêtée." : "L'agent n'a pas rendu de réponse."),
      agent_answer: answer,
      judge,
      final_url: answer?.final_url ?? obs?.data.metadata?.url ?? null,
      screenshot_url,
      steps: metrics?.steps ?? null,
      input_tokens: usage.input_tokens ?? null,
      cached_tokens: usage.cached_tokens ?? null,
      output_tokens: usage.output_tokens ?? null,
      cost_usd: metrics?.total_cost ?? usage.total_cost ?? null,
      duration_s: (new Date(items[0]?.timestamp ?? Date.now()).getTime() - new Date(run.launched_at).getTime()) / 1000,
      finished_at: new Date().toISOString(),
    })
    .eq("id", run.id);
}

async function closeAudits(log: string[]) {
  const { data: audits } = await db.from("audits").select("id, sites(domain), runs(status, success, blocker_type, blocker_detail, missions(title))").eq("status", "running");
  for (const a of audits ?? []) {
    if (a.runs.some((r: any) => r.status === "todo" || r.status === "launched")) continue;
    const recommendations = await writeRecommendations((a.sites as any).domain, a.runs).catch((e) => `Plan de corrections indisponible (${e}).`);
    await db.from("audits").update({ status: "done", finished_at: new Date().toISOString(), recommendations }).eq("id", a.id);
    log.push(`audit ${a.id} done`);
    if (process.env.N8N_NOTIFY_URL) {
      const done = a.runs.length;
      const ok = a.runs.filter((r: any) => r.success).length;
      await fetch(process.env.N8N_NOTIFY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audit_id: a.id, domain: (a.sites as any).domain, score: Math.round((100 * ok) / Math.max(done, 1)), runs: done, url: `${process.env.PUBLIC_URL ?? ""}/audit/${a.id}` }),
      }).catch(() => {});
    }
  }
}

// ---------- Hugging Face (light models) ----------
async function hf(messages: unknown[], max_tokens = 400) {
  const res = await fetch("https://router.huggingface.co/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.HF_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: JUDGE_MODEL, messages, max_tokens, temperature: 0 }),
  });
  if (!res.ok) throw new Error(`HF ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const text: string = (await res.json()).choices[0].message.content ?? "";
  return text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}

export async function judgeScreenshot(imageUrl: string, mission: string | undefined, answer: Answer | null) {
  const out = await hf(
    [
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              `Screenshot of the last page an AI shopping agent saw on an e-commerce site. Mission: ${mission ?? "reach checkout"}. ` +
              `The agent claims reached_checkout=${answer?.reached_checkout}. ` +
              `A checkout page asks for login, email, shipping address or payment after leaving the cart. ` +
              `Reply with JSON only: {"is_checkout_page": boolean, "blocking_overlay": boolean, "blocker_type": one of ${Object.keys(BLOCKERS).join("|")}, "reason": "short French sentence"}`,
          },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      },
    ],
    200,
  );
  return JSON.parse(out.slice(out.indexOf("{"), out.lastIndexOf("}") + 1));
}

async function writeRecommendations(domain: string, runs: any[]) {
  const lines = runs.map((r) => `- ${r.missions?.title}: ${r.success ? "réussi" : `échec (${r.blocker_type}) ${r.blocker_detail ?? ""}`}`).join("\n");
  return hf(
    [
      {
        role: "user",
        content:
          `Tu es expert e-commerce. Un agent IA a tenté d'acheter sur ${domain}. Résultats par mission :\n${lines}\n\n` +
          `Écris en français, en texte simple sans markdown. Base-toi uniquement sur ces résultats, n'invente aucun problème. ` +
          `S'il y a des échecs : au plus 3 lignes numérotées, classées par nombre de missions touchées, chacune « problème → correction concrète côté site ». ` +
          `Si tout a réussi : une seule phrase qui le dit, puis une seule phrase de conseil pour rester accessible aux agents IA.`,
      },
    ],
    500,
  );
}

// ---------- replay: public trajectory, step by step ----------
export type ReplayStep = { url: string; image: string; action: string | null; element: string | null; x: number | null; y: number | null; thought: string | null };

export async function getReplay(runId: number) {
  const shareUrl = await shareRun(runId);
  if (!shareUrl) return null;
  // Shared trajectories and their screenshots are public: no key, no rate limit.
  const t = await (await fetch(shareUrl, { next: { revalidate: 3600 } })).json();
  const steps: ReplayStep[] = [];
  for (const e of t.events ?? []) {
    const ev = e.data?.event;
    if (ev?.kind === "observation_event" && ev.observation?.image?.source) {
      steps.push({ url: ev.observation.url, image: ev.observation.image.source, action: null, element: null, x: null, y: null, thought: null });
    } else if (ev?.kind === "policy_event" && steps.length) {
      const last = steps[steps.length - 1];
      const req = ev.tool_reqs?.[0];
      last.action = req?.tool_name ?? null;
      last.element = req?.args?.element ?? req?.args?.text ?? req?.args?.url ?? null;
      last.x = typeof req?.args?.x === "number" ? req.args.x : null;
      last.y = typeof req?.args?.y === "number" ? req.args.y : null;
      last.thought = ev.message?.reasoning_content?.trim() || ev.message?.content?.trim() || null;
    }
  }
  return { objective: t.objective as string, answer: t.answer, steps };
}

// ---------- share link (1 H request, once per run) ----------
export async function shareRun(runId: number) {
  const { data: run } = await db.from("runs").select("id, session_id, share_url").eq("id", runId).single();
  if (!run?.session_id) return null;
  if (run.share_url) return run.share_url as string;
  const { share_url } = await (await h(`/sessions/${run.session_id}/share`, { method: "POST" })).json();
  const full = `${H}${share_url}`;
  await db.from("runs").update({ share_url: full }).eq("id", run.id);
  return full;
}
