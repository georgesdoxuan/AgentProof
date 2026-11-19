import "server-only";
import { EXCLUDED, PAY_REACHED_BANK, blockerNames, db, paymentVerdicts } from "./engine";
import { missionTitle, type Lang } from "./i18n";
import { fixHints, loadSpace, type SiteView } from "./space";

// Espace › Corrections: every fix the team's audits ask for, across every site, from the same source as the home's
// « À corriger » cards (SiteView.blockers: latest finished audit of each site and device, agent-only outcomes left out,
// fixes marked in the `fixes` table). Two more sources the cards do not show: fixes already proven (status "done") and
// the real payment tests whose verdict is a site problem (never reached the bank). No table of its own.
export type CorrectionStatus = "todo" | "back" | "check" | "done";
export type CorrectionKind = "journey" | "payment";

export type Correction = {
  id: string; // anchor on the page (#c-…): letters, digits and dashes only
  kind: CorrectionKind;
  site: SiteView;
  type: string; // blocker type (journey) or payment verdict (payment)
  label: string;
  impact: 0 | 1 | 2 | 3; // 0 out of score (anti-bot, stock), then missions lost; a blocked payment is 3
  missions: number; // missions lost (journey), payment runs that failed (payment)
  status: CorrectionStatus;
  at: string; // date of the audit that found it
  auditId: string; // the report to open
  run: { id: number; detail: string | null; shot: string | null; url: string | null } | null; // proof: capture, replay
  replayAudit: string; // the ?a= of the replay link (the payment test's own audit for a payment)
  hits: { n: number; title: string; runId: number }[]; // missions it stopped, numbered as in the report
  who: string[]; // payment only: "sans compte", "connecté"
  hint: string;
};

const PAY_HINT: Record<Lang, Record<string, string>> = {
  fr: {
    card_form_unusable: "Rendre le formulaire de carte utilisable : champs étiquetés, iframe du prestataire chargée, aucun masque de saisie qui bloque la frappe.",
    not_reached_payment: "Raccourcir le tunnel jusqu’à la carte : livraison et adresse sur une étape, aucun champ obligatoire caché, bouton « Continuer » toujours visible.",
    login_required: "Proposer la commande en invité jusqu’au paiement, sans fenêtre de compte obligatoire.",
    bot_block: "L’anti-bot bloque l’agent sur le tunnel de commande : laisser passer les agents d’achat identifiés (Web Bot Auth, liste d’autorisation) sur le panier et le paiement.",
    other: "Ouvrir le replay du test de paiement pour voir l’écran exact où l’agent s’arrête.",
  },
  en: {
    card_form_unusable: "Make the card form usable: labelled fields, the provider's iframe loaded, no input mask that blocks typing.",
    not_reached_payment: "Shorten the path to the card: shipping and address on one step, no hidden required field, a “Continue” button always visible.",
    login_required: "Offer guest checkout all the way to payment, with no mandatory account window.",
    bot_block: "The anti-bot blocks the agent in the checkout: let identified shopping agents through (Web Bot Auth, allow list) on the cart and payment.",
    other: "Open the payment test replay to see the exact screen where the agent stops.",
  },
};
// Verdicts that say nothing about the site (the agent ran out of steps, a technical error): left out, as in the score.
const PAY_AGENT = ["inconclusive", "technical_error"];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const impactOf = (type: string, missions: number): Correction["impact"] => (EXCLUDED.includes(type) ? 0 : missions >= 3 ? 3 : missions === 2 ? 2 : 1);

export async function loadCorrections(teamId: string, lang: Lang) {
  const { sites, audits } = await loadSpace(teamId);
  const names = blockerNames(lang);
  const hints = fixHints(lang);

  // The missions each blocker stopped, numbered like the report (by mission position): one read for every latest audit.
  const latestIds = sites.map((s) => s.latest?.id).filter(Boolean) as string[];
  // The latest real payment test of each site (from its newest audit that has one, finished or payment-only).
  const payOf = new Map<string, { audit: string; test: string }>();
  for (const s of sites) {
    const a = s.audits.find((x) => x.status === "done" && x.payment_test);
    if (a) payOf.set(s.key, { audit: a.id, test: a.payment_test! });
  }
  const payIds = [...payOf.values()].map((p) => p.test);
  const [{ data: runs }, { data: payRuns }] = await Promise.all([
    latestIds.length
      ? db.from("runs").select("id, audit_id, success, blocker_type, missions(title, position)").in("audit_id", latestIds)
      : Promise.resolve({ data: [] as any[] }),
    payIds.length
      ? db.from("runs").select("id, audit_id, status, payment_verdict, with_login, blocker_detail, screenshot_url, final_url, created_at").in("audit_id", payIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);
  const runsBy = new Map<string, any[]>();
  for (const r of runs ?? []) runsBy.set(r.audit_id, [...(runsBy.get(r.audit_id) ?? []), r]);
  for (const list of runsBy.values()) list.sort((a, b) => (a.missions?.position ?? 0) - (b.missions?.position ?? 0));

  const out: Correction[] = [];
  for (const site of sites) {
    const latest = site.latest;
    if (latest) {
      const numbered = runsBy.get(latest.id) ?? [];
      for (const b of site.blockers) {
        out.push({
          id: `c-${slug(site.key)}-${slug(b.type)}`,
          kind: "journey",
          site,
          type: b.type,
          label: names[b.type] ?? b.type,
          impact: impactOf(b.type, b.missions),
          missions: b.missions,
          status: b.state,
          at: latest.created_at,
          auditId: latest.id,
          run: b.run ? { id: b.run.id, detail: b.run.blocker_detail, shot: b.run.screenshot_url, url: b.run.final_url } : null,
          replayAudit: latest.id,
          hits: numbered
            .map((r, i) => ({ r, n: i + 1 }))
            .filter(({ r }) => r.success === false && r.blocker_type === b.type)
            .map(({ r, n }) => ({ n, title: missionTitle(r.missions?.title, lang), runId: r.id })),
          who: [],
          hint: hints[b.type] ?? hints.other,
        });
      }
      // Proven fixes: kept so the « Corrigées » filter shows what the team already solved.
      for (const type of site.verified) {
        out.push({
          id: `c-${slug(site.key)}-${slug(type)}`,
          kind: "journey",
          site,
          type,
          label: names[type] ?? type,
          impact: impactOf(type, 0),
          missions: 0,
          status: "done",
          at: latest.created_at,
          auditId: latest.id,
          run: null,
          replayAudit: latest.id,
          hits: [],
          who: [],
          hint: hints[type] ?? hints.other,
        });
      }
    }

    // Payment: one line per verdict that stops the payment before the bank, merged across "no account" / "signed in".
    const pay = payOf.get(site.key);
    if (!pay) continue;
    const mine = (payRuns ?? []).filter((r) => r.audit_id === pay.test && (r.status === "done" || r.status === "error"));
    const failed = mine.filter((r) => !PAY_REACHED_BANK.includes(r.payment_verdict ?? "") && !PAY_AGENT.includes(r.payment_verdict ?? "technical_error"));
    const byVerdict = new Map<string, any[]>();
    for (const r of failed) byVerdict.set(r.payment_verdict ?? "other", [...(byVerdict.get(r.payment_verdict ?? "other") ?? []), r]);
    const audit = audits.find((a) => a.id === pay.audit)!;
    for (const [verdict, rs] of byVerdict) {
      const shown = rs.find((r) => r.screenshot_url) ?? rs[0];
      out.push({
        id: `p-${slug(site.key)}-${slug(verdict)}`,
        kind: "payment",
        site,
        type: verdict,
        label: paymentVerdicts(lang)[verdict] ?? verdict,
        impact: 3,
        missions: rs.length,
        status: "todo",
        at: audit.created_at,
        auditId: audit.id,
        run: { id: shown.id, detail: shown.blocker_detail, shot: shown.screenshot_url, url: shown.final_url },
        replayAudit: pay.test,
        hits: [],
        who: [...new Set(rs.map((r) => (r.with_login ? (lang === "en" ? "signed in" : "connecté") : lang === "en" ? "no account" : "sans compte")))],
        hint: PAY_HINT[lang][verdict] ?? PAY_HINT[lang].other,
      });
    }
  }
  return { items: out, sites, audits };
}
