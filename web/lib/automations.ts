import "server-only";
import { createAudit, db, normalizeUrl } from "./engine";
import { sendMail } from "./auth";

// Daily watch of a team's pages, without AI: fetch the HTML, keep what matters to a shopping agent
// (title, third-party scripts, forms, buttons, fields, iframes), and compare with yesterday's list.
// Product names, prices and tracking tokens are left out, so a new promo or a new product does not count as a change.
// Every page is read the same way (rendered in a real browser by Jina Reader), so two reads of an unchanged page match.
// ponytail: free Jina tier (20 pages a minute, no key); set JINA_API_KEY if more teams watch more pages.

const DAY = 86400_000;
const MONTH = 30 * DAY;
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

// Monthly follow-up (the 149 €/month offer): a full audit every 30 days on each page the team marked "monthly",
// whatever the daily watch says. The score drop alert fires when that audit closes (engine closeAudits).
export async function runMonthlyAudits(log: string[]) {
  const due = new Date(Date.now() - MONTH).toISOString();
  const { data } = await db
    .from("automations")
    .select("id, team_id, url, created_by, last_audit_at, users:created_by(email)")
    .eq("enabled", true)
    .eq("monthly", true)
    .or(`last_audit_at.is.null,last_audit_at.lt.${due}`)
    .limit(PER_TICK);
  for (const a of (data ?? []) as any[]) {
    // Reserve first, so two ticks never launch the same monthly audit.
    let q = db.from("automations").update({ last_audit_at: new Date().toISOString() }).eq("id", a.id);
    q = a.last_audit_at ? q.eq("last_audit_at", a.last_audit_at) : q.is("last_audit_at", null);
    const { data: reserved } = await q.select("id");
    if (!reserved?.length) continue;
    const auditId = await createAudit(a.url, { missions: MISSIONS, teamId: a.team_id, createdBy: a.created_by ?? undefined, email: a.users?.email }).catch(() => null);
    await db.from("automation_checks").insert({ automation_id: a.id, status: "monthly", detail: auditId ? "Audit mensuel lancé." : "Audit mensuel impossible à lancer.", audit_id: auditId });
    log.push(`automation ${a.id}: monthly audit ${auditId}`);
  }
}

// ---------- free static check: what a robot sees without a browser (no AI, no H credit) ----------
// Shown next to the agent's results: it answers "Shopify already reads the code" with both readings side by side.
const BROWSER_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const AI_AGENTS = ["ChatGPT-User", "Claude-User", "Perplexity-User", "GPTBot", "OAI-SearchBot", "ClaudeBot", "PerplexityBot", "Google-Extended"];
const SHOPPING_AGENTS = ["ChatGPT-User", "Claude-User", "Perplexity-User"]; // fetch pages for a user, in real time
const ANTI_BOT: [RegExp, string][] = [
  [/google\.com\/recaptcha|recaptcha\/api|grecaptcha/i, "reCAPTCHA"],
  [/hcaptcha\.com/i, "hCaptcha"],
  [/challenges\.cloudflare\.com|cf-turnstile/i, "Cloudflare Turnstile"],
  [/datadome/i, "DataDome"],
  [/px-cdn\.net|perimeterx|px-cloud\.net/i, "HUMAN (PerimeterX)"],
  [/queue-it\.net/i, "Queue-it"],
  [/kasada|\/ips\.js/i, "Kasada"],
];
const PLATFORMS: [RegExp, string][] = [
  [/cdn\.shopify\.com|Shopify\.theme/i, "Shopify"],
  [/demandware|sfcc-|\/on\/demandware/i, "Salesforce Commerce Cloud"],
  [/prestashop/i, "PrestaShop"],
  [/woocommerce/i, "WooCommerce"],
  [/Magento|mage\/cookies/i, "Magento"],
  [/bigcommerce/i, "BigCommerce"],
  [/wix\.com|wixstatic/i, "Wix"],
];

export type StaticItem = { key: string; label: string; tone: "pass" | "warn" | "fail" | "none"; detail: string };

async function get(u: string, ms = 6000) {
  try {
    const r = await fetch(u, { headers: { "User-Agent": BROWSER_UA, Accept: "text/html,application/json,text/plain,*/*" }, signal: AbortSignal.timeout(ms), cache: "no-store" });
    return { status: r.status, text: r.ok ? (await r.text()).slice(0, 2_000_000) : "" };
  } catch {
    return { status: 0, text: "" };
  }
}

// robots.txt groups: an agent obeys its own group, else the "*" group. Returns the AI agents shut out of the whole site.
export function robotsBlocked(txt: string): string[] {
  const groups: { agents: string[]; all: boolean }[] = [];
  let cur: { agents: string[]; all: boolean } | null = null;
  let agentLine = false;
  for (const raw of txt.split(/\r?\n/)) {
    const m = raw.replace(/#.*/, "").trim().match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const k = m[1].toLowerCase(), v = m[2].trim();
    if (k === "user-agent") {
      if (!cur || !agentLine) groups.push((cur = { agents: [], all: false }));
      cur.agents.push(v.toLowerCase());
      agentLine = true;
    } else {
      agentLine = false;
      if (cur && k === "disallow" && v === "/") cur.all = true;
    }
  }
  return AI_AGENTS.filter((a) => (groups.find((g) => g.agents.includes(a.toLowerCase())) ?? groups.find((g) => g.agents.includes("*")))?.all);
}

export async function staticCheck(url: string): Promise<StaticItem[]> {
  const origin = new URL(url).origin;
  const [robots, home, llms, catalog] = await Promise.all([get(`${origin}/robots.txt`), get(url), get(`${origin}/llms.txt`), get(`${origin}/products.json?limit=1`)]);
  const items: StaticItem[] = [];

  if (robots.status === 200) {
    const blocked = robotsBlocked(robots.text);
    const shopping = blocked.filter((a) => SHOPPING_AGENTS.includes(a));
    items.push(
      shopping.length
        ? { key: "robots", label: "robots.txt ferme le site aux agents d'achat", tone: "fail", detail: `Interdits sur tout le site : ${blocked.join(", ")}. Ces agents lisent la page pour un client, en direct.` }
        : blocked.length
          ? { key: "robots", label: "robots.txt bloque certains robots IA", tone: "warn", detail: `Interdits : ${blocked.join(", ")}. Les agents d'achat restent autorisés, mais le site sort des réponses de ces IA.` }
          : { key: "robots", label: "robots.txt laisse passer les agents IA", tone: "pass", detail: "Aucune règle n'interdit tout le site à GPTBot, ChatGPT-User, ClaudeBot, PerplexityBot ou Google-Extended." },
    );
  } else if (robots.status === 404) items.push({ key: "robots", label: "Pas de robots.txt", tone: "pass", detail: "Rien n'est interdit aux agents." });
  else items.push({ key: "robots", label: "robots.txt illisible", tone: "none", detail: robots.status ? `Le site répond ${robots.status}.` : "Pas de réponse." });

  // A plain request with a browser user agent: what an agent without a full browser gets.
  let html = home.text;
  if (home.status !== 200) {
    items.push({ key: "access", label: "Le site refuse une requête automatique simple", tone: "warn", detail: `Réponse ${home.status || "absente"} sans navigateur complet : les agents qui lisent le HTML directement sont bloqués.` });
    html = await fetchPage(url).catch(() => "");
    // The reader often gets the anti-bot challenge too: a page that thin says nothing about captcha or schema.org.
    if (signature(html).length < 5) html = "";
  } else items.push({ key: "access", label: "Page d'accueil lisible sans navigateur", tone: "pass", detail: "Un agent qui lit le HTML obtient la page." });

  if (html) {
    const bots = ANTI_BOT.filter(([re]) => re.test(html)).map(([, n]) => n);
    items.push(
      bots.length
        ? { key: "antibot", label: "Protection anti-bot ou captcha détectée", tone: "warn", detail: `${bots.join(", ")}. Un vrai agent d'achat risque un défi qu'il ne doit pas résoudre.` }
        : { key: "antibot", label: "Aucun captcha ni anti-bot dans la page d'accueil", tone: "pass", detail: "Aucun script connu (reCAPTCHA, hCaptcha, Turnstile, DataDome, HUMAN, Kasada, Queue-it)." },
    );
    const types = new Set<string>();
    for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi))
      for (const t of m[1].matchAll(/"@type"\s*:\s*"([^"]+)"/g)) types.add(t[1]);
    const search = types.has("SearchAction");
    items.push({
      key: "schema",
      label: types.size ? "Données structurées présentes" : "Aucune donnée structurée sur l'accueil",
      tone: types.size ? "pass" : "warn",
      detail: types.size
        ? `Types schema.org : ${[...types].slice(0, 8).join(", ")}.${search ? " La recherche du site est déclarée (SearchAction)." : " La recherche du site n'est pas déclarée (SearchAction)."}`
        : "Pas de JSON-LD schema.org : un agent doit tout deviner à partir de l'écran.",
    });
    const platform = PLATFORMS.find(([re]) => re.test(html))?.[1];
    if (platform) items.push({ key: "platform", label: `Plateforme : ${platform}`, tone: "none", detail: "Détectée dans le code de la page d'accueil." });
  }

  // Shopify: the public catalogue, and a product page's structured data.
  if (catalog.status === 200 && catalog.text.trim().startsWith("{")) {
    const handle = (JSON.parse(catalog.text).products?.[0]?.handle as string) ?? null;
    const product = handle ? await get(`${origin}/products/${handle}`) : { status: 0, text: "" };
    const hasProduct = /"@type"\s*:\s*"Product"/.test(product.text);
    items.push({ key: "catalog", label: "Catalogue public lisible (products.json)", tone: "pass", detail: "Un agent peut lister produits, prix et variantes sans parcourir les pages." });
    if (product.status === 200)
      items.push(
        hasProduct
          ? { key: "product", label: "Fiche produit décrite pour les machines", tone: "pass", detail: `schema.org Product présent sur /products/${handle}.` }
          : { key: "product", label: "Fiche produit sans données Product", tone: "warn", detail: `Pas de schema.org Product sur /products/${handle} : prix et disponibilité restent à lire à l'écran.` },
      );
  }

  items.push(
    llms.status === 200 && !/<html/i.test(llms.text)
      ? { key: "llms", label: "llms.txt présent", tone: "pass", detail: "Le site donne aux IA un résumé de ses pages." }
      : { key: "llms", label: "Pas de llms.txt", tone: "none", detail: "Facultatif : un fichier qui résume le site pour les IA." },
  );
  return items;
}

// Tick: the static check of new audits, one per tick (it can take 20 s when the reader fallback is needed).
// Reserved with a timestamp, so a tick killed halfway lets a later one try again after 10 minutes.
export async function runStaticChecks(log: string[]) {
  const since = new Date(Date.now() - DAY).toISOString();
  const stale = new Date(Date.now() - 10 * 60_000).toISOString();
  const { data } = await db
    .from("audits")
    .select("id, static_check, sites(url)")
    .eq("kind", "checkout")
    .gte("created_at", since)
    .or(`static_check.is.null,static_check->>pending_at.lt.${stale}`)
    .order("created_at")
    .limit(1);
  for (const a of (data ?? []) as any[]) {
    const pending = { pending_at: new Date().toISOString() };
    let q = db.from("audits").update({ static_check: pending }).eq("id", a.id);
    q = a.static_check ? q.eq("static_check->>pending_at", a.static_check.pending_at) : q.is("static_check", null);
    const { data: reserved } = await q.select("id");
    if (!reserved?.length) continue;
    const items = await staticCheck(a.sites.url).catch((e) => [{ key: "error", label: "Analyse impossible", tone: "none", detail: String(e).slice(0, 200) }]);
    await db.from("audits").update({ static_check: { checked_at: new Date().toISOString(), items } }).eq("id", a.id);
    log.push(`static check ${a.id}: ${items.length} items`);
  }
}

export async function listAutomations(teamId: string) {
  const { data } = await db
    .from("automations")
    .select("id, url, enabled, mode, monthly, last_audit_at, last_checked_at, automation_checks(id, checked_at, status, detail, audit_id)")
    .eq("team_id", teamId)
    .order("created_at")
    .order("checked_at", { referencedTable: "automation_checks", ascending: false })
    .limit(7, { referencedTable: "automation_checks" });
  return data ?? [];
}
