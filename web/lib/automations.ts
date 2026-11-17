import "server-only";
import { createAudit, db, normalizeUrl } from "./engine";
import { sendMail } from "./auth";

// Daily watch of a team's pages, without AI: fetch the HTML, keep what matters to a shopping agent
// (title, third-party scripts, forms, buttons, fields, iframes), and compare with yesterday's list.
// Product names, prices and tracking tokens are left out, so a new promo or a new product does not count as a change.
// Every page is read the same way (rendered in a real browser by Jina Reader), so two reads of an unchanged page match.
// ponytail: free Jina tier (20 pages a minute, no key); set JINA_API_KEY if more teams watch more pages.

const DAY = 86400_000;
const PER_TICK = 2; // one fetch (≤ 25 s) each, inside a 60 s tick: 2880 pages a day
const MISSIONS = Number(process.env.FORM_MISSIONS ?? 5);

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", eacute: "é", egrave: "è", agrave: "à", ccedil: "ç", ecirc: "ê", times: "×" };
const decode = (s: string) =>
  s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e: string) =>
    e[0] === "#" ? String.fromCodePoint(parseInt(e.slice(e[1] === "x" || e[1] === "X" ? 2 : 1), e[1] === "x" || e[1] === "X" ? 16 : 10)) : (ENTITIES[e.toLowerCase()] ?? m),
  );
const clean = (s: string) => decode(s.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim().slice(0, 60);
const attr = (tag: string, name: string) => decode(tag.match(new RegExp(`\\s${name}\\s*=\\s*["']([^"']*)["']`, "i"))?.[1] ?? "").trim();

export function signature(html: string): string[] {
  const out = new Set<string>();
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  if (title) out.add(`titre: ${clean(title)}`);
  // Scripts from other sites: a new captcha, cookie banner or chat widget is exactly what blocks agents. Query strings are cache busters.
  for (const m of html.matchAll(/<script\b[^>]*\ssrc\s*=\s*["']([^"']+)["']/gi)) {
    try {
      const u = new URL(m[1], "https://x.invalid");
      if (u.hostname !== "x.invalid") out.add(`script: ${u.hostname}`);
    } catch {}
  }
  for (const m of html.matchAll(/<iframe\b[^>]*>/gi)) {
    try {
      out.add(`iframe: ${new URL(attr(m[0], "src"), "https://x.invalid").hostname}`);
    } catch {}
  }
  for (const m of html.matchAll(/<form\b[^>]*>/gi)) out.add(`formulaire: ${attr(m[0], "action").split("?")[0] || "(même page)"}`);
  for (const m of html.matchAll(/<(input|select|textarea)\b[^>]*>/gi)) {
    const type = attr(m[0], "type") || m[1].toLowerCase();
    if (type === "hidden") continue;
    out.add(`champ: ${type} ${attr(m[0], "name") || attr(m[0], "aria-label") || attr(m[0], "placeholder")}`.trim());
  }
  for (const m of html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)) {
    const label = attr(m[0], "aria-label") || clean(m[2]);
    // No digits ("Panier (3)", prices) and no lone symbols ("×", "›"): only words describe the structure.
    if (/\p{L}{2}/u.test(label) && !/\d/.test(label)) out.add(`bouton: ${label}`);
  }
  return [...out].sort();
}

// Big shops block plain server requests (403 from their anti-bot), and plain HTML misses what JavaScript draws.
// Jina Reader opens the page in a real browser and returns the rendered HTML: one source for every read.
async function fetchPage(url: string) {
  const res = await fetch(`https://r.jina.ai/${url}`, {
    headers: { "X-Return-Format": "html", ...(process.env.JINA_API_KEY ? { Authorization: `Bearer ${process.env.JINA_API_KEY}` } : {}) },
    signal: AbortSignal.timeout(25_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`le lecteur de page répond ${res.status}`);
  return (await res.text()).slice(0, 3_000_000);
}

export function diff(before: string[], after: string[]) {
  const a = new Set(before), b = new Set(after);
  return { added: after.filter((x) => !a.has(x)), removed: before.filter((x) => !b.has(x)) };
}

type Automation = { id: number; team_id: string; url: string; mode: string; signature: string[] | null; created_by: string | null; users: { email: string } | null };

export async function checkAutomation(a: Automation) {
  let sig: string[];
  try {
    sig = signature(await fetchPage(a.url));
    if (sig.length < 5) throw new Error("page vide ou anti-bot (moins de 5 éléments lus)"); // a challenge page must never become the reference
  } catch (e) {
    await db.from("automation_checks").insert({ automation_id: a.id, status: "error", detail: `Page illisible : ${(e as Error).message}`.slice(0, 300) });
    return "error";
  }
  if (!a.signature) {
    await db.from("automations").update({ signature: sig }).eq("id", a.id);
    await db.from("automation_checks").insert({ automation_id: a.id, status: "baseline", detail: `Référence enregistrée (${sig.length} éléments suivis).` });
    return "baseline";
  }
  const { added, removed } = diff(a.signature, sig);
  if (!added.length && !removed.length) {
    await db.from("automation_checks").insert({ automation_id: a.id, status: "same" });
    return "same";
  }
  const lines = [...added.map((x) => `+ ${x}`), ...removed.map((x) => `− ${x}`)];
  const detail = `${added.length} ajout${added.length > 1 ? "s" : ""}, ${removed.length} retrait${removed.length > 1 ? "s" : ""} : ${lines.slice(0, 6).join(" · ")}${lines.length > 6 ? " …" : ""}`;
  const email = a.users?.email;
  const auditId =
    a.mode === "audit" ? await createAudit(a.url, { missions: MISSIONS, teamId: a.team_id, createdBy: a.created_by ?? undefined, email }).catch(() => null) : null;
  await db.from("automations").update({ signature: sig }).eq("id", a.id);
  await db.from("automation_checks").insert({ automation_id: a.id, status: "changed", detail: detail.slice(0, 1000), audit_id: auditId });
  if (email) {
    const link = `${process.env.PUBLIC_URL ?? ""}${auditId ? `/audit/${auditId}` : "/espace/automations"}`;
    await sendMail(
      email,
      `AgentProof : ${normalizeUrl(a.url).domain} a changé`,
      `La page ${a.url} a changé depuis la dernière vérification.\n\n${lines.slice(0, 20).join("\n")}\n\n` +
        (auditId ? `Un nouvel audit est lancé, tu recevras le rapport à la fin :\n${link}` : `Relance un audit pour vérifier que les agents peuvent toujours acheter :\n${link}`),
      link,
    ).catch(() => false);
  }
  return "changed";
}

// Called from the tick: a few enabled automations not checked for 24 h. Reserve first, so two ticks never check the same page twice.
export async function runDueAutomations(log: string[]) {
  const due = new Date(Date.now() - DAY).toISOString();
  const { data } = await db
    .from("automations")
    .select("id, team_id, url, mode, signature, created_by, last_checked_at, users:created_by(email)")
    .eq("enabled", true)
    .or(`last_checked_at.is.null,last_checked_at.lt.${due}`)
    .order("last_checked_at", { ascending: true, nullsFirst: true })
    .limit(PER_TICK);
  for (const a of (data ?? []) as any[]) {
    let q = db.from("automations").update({ last_checked_at: new Date().toISOString() }).eq("id", a.id);
    q = a.last_checked_at ? q.eq("last_checked_at", a.last_checked_at) : q.is("last_checked_at", null);
    const { data: reserved } = await q.select("id");
    if (!reserved?.length) continue;
    log.push(`automation ${a.id}: ${await checkAutomation(a)}`);
  }
}

export async function listAutomations(teamId: string) {
  const { data } = await db
    .from("automations")
    .select("id, url, enabled, mode, last_checked_at, automation_checks(id, checked_at, status, detail, audit_id)")
    .eq("team_id", teamId)
    .order("created_at")
    .order("checked_at", { referencedTable: "automation_checks", ascending: false })
    .limit(7, { referencedTable: "automation_checks" });
  return data ?? [];
}
