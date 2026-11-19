import "server-only";
import { db } from "./engine";

// Credits: the unit a team's subscription counts. 1 credit = 1 mission an agent runs on a site.
// A full audit is 5 missions, so 5 credits; a mission costs us about $0.03 of H run time, so even the free quota
// stays far below a euro of cost. The ledger (table credit_usage) is written by database triggers on runs:
// every audit, whatever started it (form, automation, deploy hook, monthly follow-up), and every replay.
//
// HYPOTHÈSE À VALIDER PAR GEORGES : the rates and quotas below. Change them here, nothing else to touch:
// usage is stored per mission and priced at read time, so a new rate also reprices past months.
export const RATES = {
  manual: 1, // mission of an audit launched by hand (competitor and model comparison included)
  automation: 1, // mission of an automatic audit (page changed, deploy hook, monthly follow-up)
  replay: 1, // a failed mission the engine runs a second time
  payment: 2, // real payment test: longer journey, a real card, two runs when a test account exists
} as const;
export type Kind = keyof typeof RATES;

// Credits included per calendar month. Prices mirror the public offers (home page › Tarifs).
export const PLANS = {
  free: { credits: 15, fr: "Classement (gratuit)", en: "Ranking (free)", price: null }, // 3 audits a month to try
  monthly: { credits: 150, fr: "Suivi mensuel", en: "Monthly tracking", price: 149 }, // a daily automatic audit on one site
  agency: { credits: 600, fr: "Agences", en: "Agencies", price: null }, // several client sites
  demo: { credits: 5000, fr: "Démo", en: "Demo", price: null }, // the demo space: the limit never shows on stage
} as const;
export type PlanId = keyof typeof PLANS;
export const planOf = (p: string | null | undefined): PlanId => (p && p in PLANS ? (p as PlanId) : "free");

export const ALERTS = [80, 100] as const; // % of the monthly credits that triggers a team alert

// The billing period is the calendar month (UTC): renews on the 1st.
export function period(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end, key: start.toISOString().slice(0, 7) };
}

// Straight-line projection of the month's usage from what was used so far. Null in the first hours (too noisy).
export function projection(used: number, now: Date, start: Date, end: Date) {
  const elapsed = now.getTime() - start.getTime();
  return elapsed < 12 * 3600_000 ? null : Math.round((used * (end.getTime() - start.getTime())) / elapsed);
}

type UsageRow = { kind: Kind; audit_id: string | null; site_id: number | null; device: string | null; created_at: string };
const credits = (rows: { kind: Kind }[]) => rows.reduce((n, r) => n + (RATES[r.kind] ?? 1), 0);

// One read for the page and the launch form: plan, usage this month, by type, by site, latest audits.
export async function loadCredits(teamId: string, now = new Date()) {
  const { start, end } = period(now);
  const [{ data: team }, { data }] = await Promise.all([
    db.from("teams").select("plan").eq("id", teamId).single(),
    db.from("credit_usage").select("kind, audit_id, site_id, device, created_at").eq("team_id", teamId).gte("created_at", start.toISOString()).order("created_at", { ascending: false }).limit(5000),
  ]);
  const rows = (data ?? []) as UsageRow[];
  const plan = planOf(team?.plan);
  const included = PLANS[plan].credits;
  const used = credits(rows);

  const siteIds = [...new Set(rows.map((r) => r.site_id).filter((x): x is number => x != null))];
  const { data: sites } = siteIds.length ? await db.from("sites").select("id, domain").in("id", siteIds) : { data: [] as { id: number; domain: string }[] };
  const domain = new Map((sites ?? []).map((s) => [s.id, s.domain]));

  const byKind = (Object.keys(RATES) as Kind[]).map((kind) => ({ kind, credits: credits(rows.filter((r) => r.kind === kind)) })).filter((k) => k.credits);
  const siteMap = new Map<string, { domain: string; device: string; credits: number }>();
  const auditMap = new Map<string, { audit_id: string; domain: string; device: string; at: string; credits: number; kinds: Set<Kind> }>();
  for (const r of rows) {
    const d = (r.site_id != null && domain.get(r.site_id)) || "—";
    const sk = `${d}/${r.device}`;
    const s = siteMap.get(sk) ?? { domain: d, device: r.device ?? "desktop", credits: 0 };
    s.credits += RATES[r.kind] ?? 1;
    siteMap.set(sk, s);
    if (!r.audit_id) continue;
    const a = auditMap.get(r.audit_id) ?? { audit_id: r.audit_id, domain: d, device: r.device ?? "desktop", at: r.created_at, credits: 0, kinds: new Set<Kind>() };
    a.credits += RATES[r.kind] ?? 1;
    a.kinds.add(r.kind);
    if (r.created_at < a.at) a.at = r.created_at; // dated when it started, not when a replay ran
    auditMap.set(r.audit_id, a);
  }
  return {
    plan,
    included,
    used,
    left: Math.max(0, included - used),
    pct: included ? Math.round((used / included) * 100) : 0,
    renews: end,
    projected: projection(used, now, start, end),
    byKind,
    bySite: [...siteMap.values()].sort((x, y) => y.credits - x.credits),
    recent: [...auditMap.values()].sort((x, y) => y.at.localeCompare(x.at)).slice(0, 12),
  };
}

// Used from the tick: tell each team once when it crosses 80 % then 100 % of its month (webhook/Slack + owner e-mail).
// teams.credit_alert remembers the last one sent ("2026-11:80"), compare-and-set so two ticks never send it twice.
// ponytail: scans every team's month each tick; fine for tens of teams, move to a trigger-fed counter past that.
export async function creditAlerts(log: string[] = []) {
  const { start, key } = period();
  const [{ data: teams }, { data: rows }] = await Promise.all([
    db.from("teams").select("id, name, plan, credit_alert, owner_id, users:owner_id(email)"),
    db.from("credit_usage").select("team_id, kind").gte("created_at", start.toISOString()).limit(50000),
  ]);
  for (const t of (teams ?? []) as any[]) {
    const included = PLANS[planOf(t.plan)].credits;
    const used = credits((rows ?? []).filter((r) => r.team_id === t.id) as { kind: Kind }[]);
    const level = [...ALERTS].reverse().find((a) => used * 100 >= a * included);
    if (!level) continue;
    const sent = typeof t.credit_alert === "string" && t.credit_alert.startsWith(`${key}:`) ? Number(t.credit_alert.slice(8)) : 0;
    if (sent >= level) continue;
    let q = db.from("teams").update({ credit_alert: `${key}:${level}` }).eq("id", t.id);
    q = t.credit_alert ? q.eq("credit_alert", t.credit_alert) : q.is("credit_alert", null);
    const { data: won } = await q.select("id");
    if (!won?.length) continue;
    const link = `${process.env.PUBLIC_URL ?? ""}/espace/reglages/abonnement`;
    const text =
      level >= 100
        ? `l'espace « ${t.name} » a utilisé tous ses crédits du mois (${used} sur ${included}). Les audits restent possibles pendant l'essai ; pense à changer d'offre.`
        : `l'espace « ${t.name} » a utilisé ${Math.round((used / included) * 100)} % de ses crédits du mois (${used} sur ${included}).`;
    const { notifyTeam } = await import("./automations");
    await notifyTeam(t.id, { event: "credits", domain: t.name, text, link }).catch(() => false);
    const email = t.users?.email as string | undefined;
    if (email) {
      const { sendAlert } = await import("./optout");
      await sendAlert(email, `AgentProof : ${level} % des crédits du mois utilisés`, `Bonjour,\n\n${text[0].toUpperCase()}${text.slice(1)}\n\nLe détail par site et par type :\n${link}`, link).catch(() => false);
    }
    log.push(`credits ${t.id}: alert ${level}%`);
  }
}

// The month's credits alone, for the sidebar gauge: one light read, no per-site breakdown.
export async function creditsLeft(teamId: string, now = new Date()) {
  const { start, end } = period(now);
  const [{ data: team }, { data }] = await Promise.all([
    db.from("teams").select("plan").eq("id", teamId).single(),
    db.from("credit_usage").select("kind").eq("team_id", teamId).gte("created_at", start.toISOString()).limit(5000),
  ]);
  const plan = planOf(team?.plan);
  return { plan, included: PLANS[plan].credits, used: credits((data ?? []) as { kind: Kind }[]), renews: end.toISOString() };
}
