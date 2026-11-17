import "server-only";
import { db } from "./engine";
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
  recommendations: string | null;
  site_id: number;
  sites: { domain: string; name: string; url: string } | null;
  users: { email: string } | null;
  runs: SpaceRun[];
  payment_test: string | null;
  pay: { status: string; verdict: string | null; with_login: boolean }[]; // real payment test runs linked to this audit
  s: ReturnType<typeof summarize>;
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
};

export const siteKey = (domain: string, device: string) => (device === "mobile" ? `${domain}/mobile` : domain);
export const deviceLabel = (d: string) => (d === "mobile" ? "Mobile" : "Ordinateur");
export const shortDate = (d: string) =>
  new Date(d).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export async function loadSpace(teamId: string) {
  const [{ data }, { data: fixes }, { data: board }] = await Promise.all([
    db
      .from("audits")
      .select(
        "id, created_at, device, status, compare_to, recommendations, site_id, payment_test, sites(domain, name, url), users:created_by(email), runs(id, status, success, blocker_type, blocker_detail, screenshot_url, final_url)",
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
  const all = ((data ?? []) as unknown as Omit<SpaceAudit, "s" | "pay">[]).map((a) => ({ ...a, pay: a.payment_test ? payBy.get(a.payment_test) ?? [] : [], s: summarize(a.runs) }));
  const byId = new Map(all.map((a) => [a.id, a]));
  // Competitor audits show inside the main site, not as sites of their own.
  const competitorIds = new Set(all.map((a) => a.compare_to).filter(Boolean));
  const audits = all.filter((a) => !competitorIds.has(a.id));

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
      };
      sites.set(key, v);
    }
    v.audits.push(a);
    if (a.status !== "done") v.running ??= a;
    else if (!a.runs.length) continue; // payment-only test: no missions, must not hide the latest real audit
    else if (!v.latest) v.latest = a;
    else v.previous ??= a;
  }

  for (const v of sites.values()) {
    const done = v.audits.filter((a) => a.status === "done");
    v.competitor = done.map((a) => a.compare_to && byId.get(a.compare_to)).find((c) => c && c.status === "done") || undefined;
    if (!v.latest) continue;
    const latestAt = Date.parse(v.latest.created_at);
    const siteFixes = (fixes ?? []).filter((f) => f.site_id === v.site_id && f.device === v.device);
    v.blockers = v.latest.s.blockers.map(([type, missions]) => {
      const fix = siteFixes.find((f) => f.blocker_type === type);
      return {
        type,
        missions,
        run: v.latest!.runs.find((r) => r.success === false && r.blocker_type === type && r.screenshot_url) ?? v.latest!.runs.find((r) => r.blocker_type === type),
        state: !fix ? "todo" : Date.parse(fix.fixed_at) > latestAt ? "check" : "back",
      };
    });
    const present = new Set(v.blockers.map((b) => b.type));
    v.verified = siteFixes.filter((f) => Date.parse(f.fixed_at) < latestAt && !present.has(f.blocker_type)).map((f) => f.blocker_type);
  }

  return { audits, sites: [...sites.values()] };
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
  page_error_or_timeout: "Réduire le temps de chargement des pages produit et panier, et corriger les erreurs serveur.",
  other: "Ouvrir le replay de la mission pour voir l'écran exact où l'agent s'arrête.",
};
