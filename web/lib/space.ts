import { locale, type Lang } from "./i18n";
import "server-only";
import { AGENT_ONLY, EXCLUDED, db } from "./engine";
import { summarize } from "./ui";

// Everything the team space shows comes from one read: the team's audits, grouped by site.
export type SpaceRun = {
  id: number;
  status: string;
  success: boolean | null;
  blocker_type: string | null;
  blocker_detail: string | null;
  screenshot_url: string | null;
  final_url: string | null;
};

export type SpaceAudit = {
  id: string;
  created_at: string;
  device: string;
  status: string;
  compare_to: string | null;
  model: string | null;
  title: string | null; // custom name given by the team; null = the site's domain
  favorite: boolean;
  deleted_at: string | null; // in the trash since then
  recommendations: string | null;
  site_id: number;
  sites: { domain: string; name: string; url: string } | null;
  users: { email: string } | null;
  runs: SpaceRun[];
  payment_test: string | null;
  proof_of: string | null; // proof audit: replays only the missions this blocker stopped
  pay: { status: string; verdict: string | null; with_login: boolean }[]; // real payment test runs linked to this audit
  s: ReturnType<typeof summarize>;
  label: string; // name shown everywhere: title or domain, plus " (1)", " (2)"… when another report has the same name
};

export type Fix = { site_id: number; device: string; blocker_type: string; fixed_at: string };

export type Blocker = {
  type: string;
  missions: number;
  run: SpaceRun | undefined; // a run that hit it, for the capture
  state: "todo" | "check" | "back"; // to fix · marked fixed, rerun to verify · marked fixed, still there
};

export type SiteView = {
  key: string; // "domain" or "domain/mobile", also the URL segment
  domain: string;
  name: string;
  label: string; // domain, plus " (1)"… when another site (other device) has the same one
  url: string;
  site_id: number;
  device: string;
  audits: SpaceAudit[]; // newest first, competitor audits left out
  latest: SpaceAudit | undefined; // latest finished audit
  previous: SpaceAudit | undefined; // the finished one before
  running: SpaceAudit | undefined;
  blockers: Blocker[]; // from the latest finished audit, most missions first
  verified: string[]; // marked fixed, then gone in a later audit
  competitor: SpaceAudit | undefined;
  rank: { pos: number; of: number } | null; // public leaderboard
  proofs: SpaceAudit[]; // proof audits of a fix, newest first (kept out of audits, latest and previous)
};

// A site in the trash: every report of that site and device is in the trash. Restoring it brings back the reports trashed with it.
export type TrashedSite = {
  key: string;
  domain: string;
  label: string;
  site_id: number;
  device: string;
  deleted_at: string; // latest move to the trash
  audits: SpaceAudit[]; // its reports in the trash, newest first
  running: boolean; // an audit still playing missions: no permanent delete yet
};

export const siteKey = (domain: string, device: string) => (device === "mobile" ? `${domain}/mobile` : domain);
export const deviceLabel = (d: string, lang: Lang = "fr") => (d === "mobile" ? "Mobile" : lang === "en" ? "Desktop" : "Ordinateur");
export const shortDate = (d: string, lang: Lang = "fr") =>
  new Date(d).toLocaleDateString(locale(lang), { timeZone: "Europe/Paris", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

// Same name twice: the oldest keeps it, the next ones get " (1)", " (2)"… in creation order, like the Finder.
// Counted over everything the team has (trash included), so a number never moves when a report is trashed or restored.
export function numberDuplicates<T>(items: T[], name: (x: T) => string, created: (x: T) => string) {
  const seen = new Map<string, number>();
  const out = new Map<T, string>();
  for (const x of [...items].sort((a, b) => Date.parse(created(a)) - Date.parse(created(b)))) {
    const n = name(x);
    const k = n.trim().toLocaleLowerCase("fr");
    const i = seen.get(k) ?? 0;
    seen.set(k, i + 1);
    out.set(x, n && i ? `${n} (${i})` : n);
  }
  return out;
}

const reportName = (a: { title: string | null; sites: { domain: string } | null }) => a.title || a.sites?.domain || "";

// The " (n)" a report of this team carries in the lists, for pages that load one report on its own.
export async function reportSuffix(audit: { id: string; team_id: string | null; kind: string; title: string | null; sites: { domain: string } | null }) {
  if (!audit.team_id || audit.kind !== "checkout" || !reportName(audit)) return "";
  const { data } = await db
    .from("audits")
    .select("id, created_at, title, compare_to, sites(domain)")
    .eq("team_id", audit.team_id)
    .eq("kind", "checkout")
    .order("created_at", { ascending: false })
    .limit(200);
  const rows = (data ?? []) as unknown as { id: string; created_at: string; title: string | null; compare_to: string | null; sites: { domain: string } | null }[];
  const competitors = new Set(rows.map((a) => a.compare_to).filter(Boolean));
  const mine = rows.filter((a) => !competitors.has(a.id));
  const row = mine.find((a) => a.id === audit.id);
  if (!row) return "";
  const label = numberDuplicates(mine, reportName, (a) => a.created_at).get(row) ?? "";
  return label.slice(reportName(row).length);
}

export async function loadSpace(teamId: string) {
  const [{ data }, { data: fixes }, { data: board }] = await Promise.all([
    db
      .from("audits")
      .select(
        "id, created_at, device, status, compare_to, model, title, favorite, deleted_at, recommendations, site_id, payment_test, proof_of, sites(domain, name, url), users:created_by(email), runs(id, status, success, blocker_type, blocker_detail, screenshot_url, final_url)",
      )
      .eq("team_id", teamId)
      .eq("kind", "checkout")
      .order("created_at", { ascending: false })
      .limit(200),
    db.from("fixes").select("site_id, device, blocker_type, fixed_at").eq("team_id", teamId),
    db.from("site_scores").select("domain, device, score").order("score", { ascending: false, nullsFirst: false }),
  ]);

  // Real payment tests are separate audits linked by payment_test: one extra read for their verdicts.
  const payIds = (data ?? []).map((a: any) => a.payment_test).filter(Boolean);
  const { data: payRuns } = payIds.length
    ? await db.from("runs").select("audit_id, status, payment_verdict, with_login").in("audit_id", payIds).order("with_login")
    : { data: [] as { audit_id: string; status: string; payment_verdict: string | null; with_login: boolean }[] };
  const payBy = new Map<string, SpaceAudit["pay"]>();
  for (const r of payRuns ?? []) payBy.set(r.audit_id, [...(payBy.get(r.audit_id) ?? []), { status: r.status, verdict: r.payment_verdict, with_login: r.with_login }]);
  const all = ((data ?? []) as unknown as Omit<SpaceAudit, "s" | "pay" | "label">[]).map((a) => ({ ...a, pay: a.payment_test ? payBy.get(a.payment_test) ?? [] : [], s: summarize(a.runs), label: "" }));
  const byId = new Map(all.map((a) => [a.id, a]));
  // Competitor audits show inside the main site, not as sites of their own.
  const competitorIds = new Set(all.map((a) => a.compare_to).filter(Boolean));
  // Reports in the trash leave every view (sites, checklist, home) until restored; the trash page lists them.
  const trash = all.filter((a) => !competitorIds.has(a.id) && a.deleted_at).sort((x, y) => Date.parse(y.deleted_at!) - Date.parse(x.deleted_at!));
  const audits = all.filter((a) => !competitorIds.has(a.id) && !a.deleted_at);
  const reports = all.filter((a) => !competitorIds.has(a.id));
  const labels = numberDuplicates(reports, reportName, (a) => a.created_at);
  for (const a of all) a.label = labels.get(a) ?? reportName(a);
  // A site is one domain on one device: desktop and mobile of the same domain are two sites with the same name.
  const firstAudit = new Map<string, { key: string; domain: string; at: string }>();
  for (const a of [...reports].reverse()) {
    if (!a.sites) continue;
    const key = siteKey(a.sites.domain, a.device);
    if (!firstAudit.has(key)) firstAudit.set(key, { key, domain: a.sites.domain, at: a.created_at });
  }
  const siteLabels = numberDuplicates([...firstAudit.values()], (x) => x.domain, (x) => x.at);
  const siteLabel = (key: string, domain: string) => siteLabels.get(firstAudit.get(key)!) ?? domain;

  const sites = new Map<string, SiteView>();
  for (const a of audits) {
    if (!a.sites) continue;
    const key = siteKey(a.sites.domain, a.device);
    let v = sites.get(key);
    if (!v) {
      const ranked = (board ?? []).filter((b) => b.device === a.device);
      const pos = ranked.findIndex((b) => b.domain === a.sites!.domain);
      v = {
        key,
        domain: a.sites.domain,
        name: a.sites.name,
        label: siteLabel(key, a.sites.domain),
        url: a.sites.url,
        site_id: a.site_id,
        device: a.device,
        audits: [],
        latest: undefined,
        previous: undefined,
        running: undefined,
        blockers: [],
        verified: [],
        competitor: undefined,
        rank: pos >= 0 ? { pos: pos + 1, of: ranked.length } : null,
        proofs: [],
      };
      sites.set(key, v);
    }
    if (a.proof_of) {
      v.proofs.push(a);
      continue;
    }
    v.audits.push(a);
    if (a.status !== "done") v.running ??= a;
    else if (!a.runs.length) continue; // payment-only test: no missions, must not hide the latest real audit
    else if (!v.latest) v.latest = a;
    else v.previous ??= a;
  }

  for (const v of sites.values()) {
    const done = v.audits.filter((a) => a.status === "done");
    v.competitor = done.map((a) => a.compare_to && byId.get(a.compare_to)).find((c) => c && c.status === "done" && c.site_id !== v.site_id) || undefined; // same site = model comparison, not a competitor
    if (!v.latest) continue;
    const latestAt = Date.parse(v.latest.created_at);
    const siteFixes = (fixes ?? []).filter((f) => f.site_id === v.site_id && f.device === v.device);
    // Agent-only outcomes (catalogue, step count) are nothing the site can fix: kept in the report, out of the checklist.
    // A proof audit after the fix decides: every counted mission passes = proven, one still blocked = back.
    const proofOf = (type: string, fixedAt: string) => {
      const p = v.proofs.find((x) => x.proof_of === type && x.status === "done" && Date.parse(x.created_at) > Date.parse(fixedAt));
      const counted = (p?.runs ?? []).filter((r) => r.status === "done" && r.success !== null && !EXCLUDED.includes(r.blocker_type ?? ""));
      return !counted.length ? null : counted.every((r) => r.success) ? "proven" : "failed";
    };
    const proven: string[] = [];
    v.blockers = v.latest.s.blockers.filter(([type]) => !AGENT_ONLY.includes(type)).flatMap(([type, missions]): Blocker[] => {
      const fix = siteFixes.find((f) => f.blocker_type === type);
      const proof = fix && Date.parse(fix.fixed_at) > latestAt ? proofOf(type, fix.fixed_at) : null;
      if (proof === "proven") {
        proven.push(type);
        return [];
      }
      return [{
        type,
        missions,
        run: v.latest!.runs.find((r) => r.success === false && r.blocker_type === type && r.screenshot_url) ?? v.latest!.runs.find((r) => r.blocker_type === type),
        state: !fix ? "todo" : proof === "failed" ? "back" : Date.parse(fix.fixed_at) > latestAt ? "check" : "back",
      }];
    });
    const present = new Set(v.blockers.map((b) => b.type));
    v.verified = [...proven, ...siteFixes.filter((f) => Date.parse(f.fixed_at) < latestAt && !present.has(f.blocker_type)).map((f) => f.blocker_type)];
  }

  // Sites with nothing left outside the trash show in Sites › Corbeille.
  const trashedSites = new Map<string, TrashedSite>();
  for (const a of trash) {
    if (!a.sites) continue;
    const key = siteKey(a.sites.domain, a.device);
    if (sites.has(key)) continue;
    let v = trashedSites.get(key);
    if (!v) trashedSites.set(key, (v = { key, domain: a.sites.domain, label: siteLabel(key, a.sites.domain), site_id: a.site_id, device: a.device, deleted_at: a.deleted_at!, audits: [], running: false }));
    v.audits.push(a);
    if (a.status !== "done") v.running = true;
  }
  for (const v of trashedSites.values()) v.audits.sort((x, y) => Date.parse(y.created_at) - Date.parse(x.created_at));

  return { audits, trash, sites: [...sites.values()], trashedSites: [...trashedSites.values()] };
}

// What to fix first across every site: blockers still open, the ones costing the most missions first.
export function priorities(sites: SiteView[], n = 3) {
  return sites
    .flatMap((site) => site.blockers.filter((b) => b.state !== "check").map((b) => ({ site, b })))
    .sort((x, y) => y.b.missions - x.b.missions)
    .slice(0, n);
}

// Concrete first fix per blocker, shown next to the AI plan so every checklist line says what to do.
export const FIX_HINT: Record<string, string> = {
  cookie_banner: "Garder le bandeau cookies hors du bouton « Ajouter au panier » et mettre « Tout refuser » au même niveau que « Accepter ».",
  popup: "Retarder la pop-up newsletter après l'ajout au panier, avec une croix de fermeture visible et cliquable.",
  search_failed: "Rendre la recherche accessible depuis toutes les pages et renvoyer des résultats sur des requêtes simples (« pull noir »).",
  filter_failed: "Utiliser de vrais liens ou cases à cocher pour les filtres, et mettre à jour la liste sans rechargement ambigu.",
  size_selector: "Utiliser des boutons ou un menu natif pour la taille, avec un libellé lisible et l'état « indisponible » explicite.",
  button_unresponsive: "Vérifier que le bouton réagit au premier clic, sans script bloquant ni élément transparent posé dessus.",
  captcha_or_bot_block: "Laisser passer les agents d'achat identifiés, ou réserver le captcha aux comportements vraiment suspects.",
  login_required: "Proposer la commande en invité avant toute création de compte.",
  out_of_stock: "Masquer ou signaler clairement les produits en rupture dans les listes et la recherche.",
  mission_not_applicable: "Rien à corriger : la mission demande un produit que le catalogue ne propose pas. Elle sort du score.",
  agent_out_of_steps: "L'agent a manqué d'étapes avant de conclure. Ouvrir le replay : un parcours trop long vers le checkout coûte aussi des ventes.",
  page_error_or_timeout: "Réduire le temps de chargement des pages produit et panier, et corriger les erreurs serveur.",
  other: "Ouvrir le replay de la mission pour voir l'écran exact où l'agent s'arrête.",
};
const FIX_HINT_EN: Record<string, string> = {
  cookie_banner: "Keep the cookie banner away from the “Add to cart” button and put “Reject all” on the same level as “Accept”.",
  popup: "Delay the newsletter pop-up until after add-to-cart, with a visible, clickable close button.",
  search_failed: "Make search reachable from every page and return results for simple queries (“black sweater”).",
  filter_failed: "Use real links or checkboxes for filters, and update the list without an ambiguous reload.",
  size_selector: "Use buttons or a native menu for size, with a readable label and an explicit “unavailable” state.",
  button_unresponsive: "Check that the button reacts to the first click, with no blocking script or transparent element on top.",
  captcha_or_bot_block: "Let identified shopping agents through, or keep the captcha for truly suspicious behaviour.",
  login_required: "Offer guest checkout before any account creation.",
  out_of_stock: "Hide or clearly flag out-of-stock products in lists and search.",
  mission_not_applicable: "Nothing to fix: the mission asks for a product the catalogue does not offer. It is left out of the score.",
  agent_out_of_steps: "The agent ran out of steps before concluding. Open the replay: a journey to checkout that is too long also costs sales.",
  page_error_or_timeout: "Reduce the loading time of product and cart pages, and fix server errors.",
  other: "Open the mission replay to see the exact screen where the agent stops.",
};
export const fixHints = (lang: Lang) => (lang === "en" ? FIX_HINT_EN : FIX_HINT);
