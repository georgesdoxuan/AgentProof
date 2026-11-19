import "server-only";
import { createAudit, db, normalizeUrl } from "./engine";
import { sendAlert } from "./optout";

// Daily watch of a team's pages, without AI: fetch the HTML, keep what matters to a shopping agent
// (title, third-party scripts, forms, buttons, fields, iframes), and compare with yesterday's list.
// Product names, prices and tracking tokens are left out, so a new promo or a new product does not count as a change.
// Every page is read the same way (rendered in a real browser by Jina Reader), so two reads of an unchanged page match.
// ponytail: free Jina tier (20 pages a minute, no key); set JINA_API_KEY if more teams watch more pages.

const DAY = 86400_000;
const MONTH = 30 * DAY;
const HOUR = 3600_000;
const PER_TICK = 2; // monthly audits launched per tick
export const INTERVALS = [1, 6, 24, 168]; // hours between two checks of a page
export const SCORE_DROPS = [5, 10, 20]; // score drop (points) that triggers an alert
const CHECK_ROOM = 40_000; // one page check: rendered read (≤ 25 s) + static check (≤ 12 s)
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

type Automation = {
  id: number; team_id: string; url: string; mode: string; signature: string[] | null; created_by: string | null;
  last_auto_audit_at?: string | null; users: { email: string } | null;
};

// The static check, as signature lines: a robots.txt that shuts agents out, a new captcha or a lost UCP profile is a change.
// Left out: "access" and an unreadable robots.txt, since a request that fails once is noise (the rendered read already says if the page is gone).
const STATIC = "contrôle: ";
export const staticLines = (items: StaticItem[]) =>
  items.filter((i) => i.key !== "access" && i.key !== "error" && !(i.key === "robots" && i.tone === "none")).map((i) => `${STATIC}${i.label}`);

type Alert = { event: string; domain: string; text: string; link: string };

// Team alerts besides e-mail: Slack, Discord or any https endpoint (n8n, Make, Zapier). Each gets the payload it reads.
export async function notifyTeam(teamId: string, msg: Alert) {
  const { data: team } = await db.from("teams").select("webhook_url").eq("id", teamId).single();
  const url = team?.webhook_url as string | null;
  return url ? postWebhook(url, msg) : false;
}

export async function postWebhook(url: string, msg: Alert) {
  const host = new URL(url).hostname;
  const line = `AgentProof · ${msg.domain} : ${msg.text}${msg.link ? ` ${msg.link}` : ""}`;
  const body = host === "hooks.slack.com" ? { text: line } : /(^|\.)discord(app)?\.com$/.test(host) ? { content: line } : { source: "agentproof", ...msg };
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(8000), redirect: "error" });
  return res.ok;
}

// What a team may store as webhook: https, a real host name (no IP, no localhost), no credentials in the URL.
export function webhookOk(raw: string) {
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && !u.username && !u.password && !u.port && /\.[a-z]{2,}$/i.test(u.hostname) && !/(^|\.)(localhost|local|internal)$/i.test(u.hostname);
  } catch {
    return false;
  }
}

export async function checkAutomation(a: Automation) {
  let sig: string[];
  try {
    const html = await fetchPage(a.url);
    sig = signature(html);
    if (sig.length < 5) throw new Error("page vide ou anti-bot (moins de 5 éléments lus)"); // a challenge page must never become the reference
    sig = [...sig, ...staticLines(await staticCheck(a.url, html))].sort();
  } catch (e) {
    await db.from("automation_checks").insert({ automation_id: a.id, status: "error", detail: `Page illisible : ${(e as Error).message}`.slice(0, 300) });
    return "error";
  }
  if (!a.signature) {
    await db.from("automations").update({ signature: sig }).eq("id", a.id);
    await db.from("automation_checks").insert({ automation_id: a.id, status: "baseline", detail: `Référence enregistrée (${sig.length} éléments suivis).` });
    return "baseline";
  }
  // A reference saved before the static check was watched: adopt today's static lines silently, so they are not "new".
  const before = a.signature.some((x) => x.startsWith(STATIC)) ? a.signature : [...a.signature, ...sig.filter((x) => x.startsWith(STATIC))];
  const { added, removed } = diff(before, sig);
  if (!added.length && !removed.length) {
    await db.from("automation_checks").insert({ automation_id: a.id, status: "same" });
    return "same";
  }
  const lines = [...added.map((x) => `+ ${x}`), ...removed.map((x) => `− ${x}`)];
  const detail = `${added.length} ajout${added.length > 1 ? "s" : ""}, ${removed.length} retrait${removed.length > 1 ? "s" : ""} : ${lines.slice(0, 6).join(" · ")}${lines.length > 6 ? " …" : ""}`;
  const email = a.users?.email;
  // At most one automatic audit a day per page: a page that changes every hour must not spend the whole H budget.
  const auditToday = !!a.last_auto_audit_at && Date.now() - new Date(a.last_auto_audit_at).getTime() < DAY;
  const auditId =
    a.mode === "audit" && !auditToday
      ? await createAudit(a.url, { missions: MISSIONS, teamId: a.team_id, createdBy: a.created_by ?? undefined, email, auto: true }).catch(() => null)
      : null;
  await db.from("automations").update({ signature: sig, ...(auditId ? { last_auto_audit_at: new Date().toISOString() } : {}) }).eq("id", a.id);
  const note = a.mode === "audit" && auditToday ? " (audit déjà relancé aujourd'hui)" : "";
  await db.from("automation_checks").insert({ automation_id: a.id, status: "changed", detail: `${detail}${note}`.slice(0, 1000), audit_id: auditId });
  await notifyTeam(a.team_id, {
    event: "page_changed",
    domain: normalizeUrl(a.url).domain,
    text: `${a.url} a changé. ${lines.slice(0, 6).join(" · ")}${auditId ? " Un nouvel audit est lancé." : ""}`,
    link: `${process.env.PUBLIC_URL ?? ""}${auditId ? `/audit/${auditId}` : "/espace/automations"}`,
  }).catch(() => false);
  if (email) {
    const link = `${process.env.PUBLIC_URL ?? ""}${auditId ? `/audit/${auditId}` : "/espace/automations"}`;
    await sendAlert(
      email,
      `AgentProof : ${normalizeUrl(a.url).domain} a changé`,
      `La page ${a.url} a changé depuis la dernière vérification.\n\n${lines.slice(0, 20).join("\n")}\n\n` +
        (auditId ? `Un nouvel audit est lancé, tu recevras le rapport à la fin :\n${link}` : `Relance un audit pour vérifier que les agents peuvent toujours acheter :\n${link}`),
      link,
    ).catch(() => false);
  }
  return "changed";
}

// Called from the tick: enabled automations whose own interval (1 h to a week) has passed, oldest first, while the tick has room.
// Reserve first, so two ticks never check the same page twice. The deploy hook sets last_checked_at to null: due at once.
export async function runDueAutomations(log: string[], room: () => number) {
  const due = new Date(Date.now() - HOUR).toISOString();
  const { data } = await db
    .from("automations")
    .select("id, team_id, url, mode, signature, created_by, last_checked_at, last_auto_audit_at, interval_hours, users:created_by(email)")
    .eq("enabled", true)
    .or(`last_checked_at.is.null,last_checked_at.lt.${due}`)
    .order("last_checked_at", { ascending: true, nullsFirst: true })
    .limit(50);
  const ready = ((data ?? []) as any[]).filter((a) => !a.last_checked_at || Date.now() - new Date(a.last_checked_at).getTime() >= (a.interval_hours ?? 24) * HOUR);
  for (const a of ready) {
    if (room() < CHECK_ROOM) {
      log.push("automations postponed");
      break;
    }
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
    const auditId = await createAudit(a.url, { missions: MISSIONS, teamId: a.team_id, createdBy: a.created_by ?? undefined, email: a.users?.email, auto: true }).catch(() => null);
    await db.from("automation_checks").insert({ automation_id: a.id, status: "monthly", detail: auditId ? "Audit mensuel lancé." : "Audit mensuel impossible à lancer.", audit_id: auditId });
    log.push(`automation ${a.id}: monthly audit ${auditId}`);
  }
}

// ---------- free static check: what a robot sees without a browser (no AI, no H credit) ----------
// Shown next to the agent's results: it answers "Shopify already reads the code" with both readings side by side.
const BROWSER_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const AI_AGENTS = ["ChatGPT-User", "Claude-User", "Perplexity-User", "GPTBot", "OAI-SearchBot", "ClaudeBot", "PerplexityBot", "Google-Extended"];
const SHOPPING_AGENTS = ["ChatGPT-User", "Claude-User", "Perplexity-User"]; // fetch pages for a user, in real time
// One row per assistant a shopper uses. live: the robots name of its real-time fetcher (blocking it shuts the shopper out);
// the other names feed the assistant's answers or training. Google-Extended only controls Gemini's use of the content. ua: the user agent its fetcher announces; null = it browses with a normal Chrome
// (Gemini in Chrome, Grok), so the plain browser request stands for it. Grok publishes no robots name: it follows "*".
const ASSISTANTS = [
  { name: "ChatGPT", live: "ChatGPT-User", robots: ["ChatGPT-User", "OAI-SearchBot", "GPTBot"], ua: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot" },
  { name: "Claude", live: "Claude-User", robots: ["Claude-User", "Claude-SearchBot", "ClaudeBot"], ua: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Claude-User/1.0; +Claude-User@anthropic.com)" },
  { name: "Perplexity", live: "Perplexity-User", robots: ["Perplexity-User", "PerplexityBot"], ua: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Perplexity-User/1.0; +https://perplexity.ai/perplexity-user)" },
  { name: "Gemini", live: null, robots: ["Google-Extended"], ua: null },
  { name: "Grok", live: "*", robots: ["*"], ua: null },
];
const CHALLENGE = /cf-chl|challenge-platform|captcha-delivery|_Incapsula_|px-captcha|Just a moment\.\.\./i;
export type AgentAccess = { name: string; tone: "pass" | "warn" | "fail" | "none"; robots: string[]; http: number | null; challenge: boolean; ownUa: boolean };
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

async function get(u: string, ms = 6000, ua = BROWSER_UA) {
  try {
    const r = await fetch(u, { headers: { "User-Agent": ua, Accept: "text/html,application/json,text/plain,*/*" }, signal: AbortSignal.timeout(ms), cache: "no-store" });
    return { status: r.status, text: r.ok ? (await r.text()).slice(0, 2_000_000) : "" };
  } catch {
    return { status: 0, text: "" };
  }
}

// robots.txt groups: an agent obeys its own group, else the "*" group. Returns the AI agents shut out of the whole site.
export function robotsBlocked(txt: string, agents = AI_AGENTS): string[] {
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
  return agents.filter((a) => (groups.find((g) => g.agents.includes(a.toLowerCase())) ?? groups.find((g) => g.agents.includes("*")))?.all);
}

// Per assistant: does robots.txt shut it out, and what does the home page answer to its user agent?
// fail = its live fetcher is refused (robots or HTTP); warn = only its answer/training bots are refused; none = can't tell.
export async function agentAccess(url: string): Promise<AgentAccess[]> {
  const origin = new URL(url).origin;
  const [robots, browser, ...own] = await Promise.all([
    get(`${origin}/robots.txt`),
    get(url),
    ...ASSISTANTS.map((a) => (a.ua ? get(url, 8000, a.ua) : null)),
  ]);
  // Our request comes from a server, not the assistant's own IPs: a refusal only counts when the same request with a
  // browser user agent gets through, i.e. the site targets that assistant. Otherwise the site refuses every plain request
  // (shown in the static check) and we can't tell. Chrome-based assistants get no HTTP verdict: the agent's run covers them.
  const browserOk = browser.status === 200 && !CHALLENGE.test(browser.text);
  return ASSISTANTS.map((a, i) => {
    const res = own[i];
    const blocked = robots.status === 200 ? robotsBlocked(robots.text, a.robots) : [];
    const challenge = !!res && res.status === 200 && CHALLENGE.test(res.text);
    const http = res && browserOk ? res.status : null;
    const refused = (http !== null && (http !== 200 || challenge)) || (!!a.live && blocked.includes(a.live));
    const tone = refused ? "fail" : blocked.length ? "warn" : a.ua && http === null ? "none" : "pass";
    return { name: a.name, tone, robots: blocked, http, challenge, ownUa: !!a.ua };
  });
}

// rendered: the page as a real browser drew it, when the caller already has it (the site watch): no second rendered read.
export async function staticCheck(url: string, rendered?: string): Promise<StaticItem[]> {
  const origin = new URL(url).origin;
  const [robots, home, llms, catalog, ucp, acp] = await Promise.all([
    get(`${origin}/robots.txt`), get(url), get(`${origin}/llms.txt`), get(`${origin}/products.json?limit=1`),
    get(`${origin}/.well-known/ucp`), get(`${origin}/.well-known/acp.json`),
  ]);
  let productText = "";
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
    html = rendered ?? (await fetchPage(url).catch(() => ""));
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
    productText = product.text;
    const hasProduct = /"@type"\s*:\s*"Product"/.test(product.text);
    items.push({ key: "catalog", label: "Catalogue public lisible (products.json)", tone: "pass", detail: "Un agent peut lister produits, prix et variantes sans parcourir les pages." });
    if (product.status === 200)
      items.push(
        hasProduct
          ? { key: "product", label: "Fiche produit décrite pour les machines", tone: "pass", detail: `schema.org Product présent sur /products/${handle}.` }
          : { key: "product", label: "Fiche produit sans données Product", tone: "warn", detail: `Pas de schema.org Product sur /products/${handle} : prix et disponibilité restent à lire à l'écran.` },
      );
  }

  items.push(...protocolItems(ucp, acp, html, productText));

  items.push(
    llms.status === 200 && !/<html/i.test(llms.text)
      ? { key: "llms", label: "llms.txt présent", tone: "pass", detail: "Le site donne aux IA un résumé de ses pages." }
      : { key: "llms", label: "Pas de llms.txt", tone: "none", detail: "Facultatif : un fichier qui résume le site pour les IA." },
  );
  return items;
}

// Agentic commerce protocols: the "API road" an agent can take instead of the screen.
// UCP (Google + Shopify): public profile at /.well-known/ucp. ACP (OpenAI + Stripe): no official public file, so only a
// manifest at /.well-known/acp.json counts as proof. WebMCP: tools the page registers for in-browser agents (modelContext).
// ponytail: WebMCP is looked for in the home page HTML only; tools registered by a script loaded later are missed.
const isJson = (r: { status: number; text: string }) => r.status === 200 && /^\s*[{[]/.test(r.text);
export function protocolItems(ucp: { status: number; text: string }, acp: { status: number; text: string }, html: string, productHtml = ""): StaticItem[] {
  const items: StaticItem[] = [];
  const caps = isJson(ucp) ? [...new Set(ucp.text.match(/dev\.ucp\.[a-z_.]+/g) ?? [])] : [];
  items.push(
    isJson(ucp)
      ? {
          key: "ucp",
          label: caps.some((c) => c.startsWith("dev.ucp.shopping.checkout")) ? "Profil UCP avec checkout" : "Profil UCP publié",
          tone: caps.some((c) => c.startsWith("dev.ucp.shopping.checkout")) ? "pass" : "warn",
          detail: caps.length ? `Capacités déclarées : ${caps.slice(0, 6).join(", ")}.` : "Le fichier /.well-known/ucp existe mais ne déclare aucune capacité lisible.",
        }
      : { key: "ucp", label: "Pas de profil UCP", tone: "warn", detail: "Aucun fichier /.well-known/ucp : les agents de Google et de Shopify ne peuvent pas acheter par API, seulement par l'écran." },
  );
  items.push(
    isJson(acp)
      ? { key: "acp", label: "Manifeste ACP publié", tone: "pass", detail: "Fichier /.well-known/acp.json présent : le site annonce un checkout pour les agents (OpenAI, Stripe)." }
      : { key: "acp", label: "Pas de manifeste ACP public", tone: "none", detail: "Facultatif : ACP passe souvent par Stripe sans fichier public, l'absence ne prouve rien." },
  );
  if (html)
    items.push(
      /modelContext|registerTool\s*\(/.test(html)
        ? { key: "webmcp", label: "Outils WebMCP dans la page", tone: "pass", detail: "La page déclare des outils qu'un agent du navigateur peut appeler sans lire l'écran." }
        : { key: "webmcp", label: "Pas d'outil WebMCP sur l'accueil", tone: "none", detail: "Standard en essai dans Chrome : un agent doit cliquer comme un humain." },
    );
  const all = `${html}\n${productHtml}`;
  const ret = /MerchantReturnPolicy|hasMerchantReturnPolicy/.test(all);
  const ship = /OfferShippingDetails|shippingDetails/.test(all);
  if (html || productHtml)
    items.push(
      ret && ship
        ? { key: "policies", label: "Livraison et retours décrits pour les machines", tone: "pass", detail: "schema.org déclare les frais de port et la politique de retour." }
        : {
            key: "policies",
            label: "Livraison ou retours absents des données structurées",
            tone: "warn",
            detail: `Manque : ${[!ship && "frais de port (shippingDetails)", !ret && "politique de retour (hasMerchantReturnPolicy)"].filter(Boolean).join(", ")}. Un agent doit les chercher à l'écran.`,
          },
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
    .order("created_at", { ascending: false }) // newest first: a fresh audit is read within a minute, older ones fill in after
    .limit(1);
  for (const a of (data ?? []) as any[]) {
    const pending = { pending_at: new Date().toISOString() };
    let q = db.from("audits").update({ static_check: pending }).eq("id", a.id);
    q = a.static_check ? q.eq("static_check->>pending_at", a.static_check.pending_at) : q.is("static_check", null);
    const { data: reserved } = await q.select("id");
    if (!reserved?.length) continue;
    const [items, agents] = await Promise.all([
      staticCheck(a.sites.url).catch((e) => [{ key: "error", label: "Analyse impossible", tone: "none", detail: String(e).slice(0, 200) }]),
      agentAccess(a.sites.url).catch(() => null),
    ]);
    await db.from("audits").update({ static_check: { checked_at: new Date().toISOString(), items, agents } }).eq("id", a.id);
    log.push(`static check ${a.id}: ${items.length} items`);
  }
}

export async function listAutomations(teamId: string) {
  const { data } = await db
    .from("automations")
    .select("id, url, enabled, mode, monthly, interval_hours, last_audit_at, last_checked_at, automation_checks(id, checked_at, status, detail, audit_id)")
    .eq("team_id", teamId)
    .order("created_at")
    .order("checked_at", { referencedTable: "automation_checks", ascending: false })
    .limit(7, { referencedTable: "automation_checks" });
  return data ?? [];
}
