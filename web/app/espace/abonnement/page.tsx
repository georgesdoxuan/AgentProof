import Link from "next/link";
import { Hint } from "@/lib/hint";
import { redirect } from "next/navigation";
import { teamContext } from "@/lib/auth";
import { ALERTS, type Kind, PLANS, RATES, loadCredits } from "@/lib/credits";
import { db } from "@/lib/engine";
import { locale, tr } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import { Chip, DeviceTag, Group, Note, Row } from "@/lib/ui";
import { SpaceShell } from "../shell";

export async function generateMetadata() {
  return { title: `${(await getLang()) === "en" ? "Plan and credits" : "Abonnement et crédits"} · AgentProof` };
}

// The team's subscription: credits used this month against the plan, what used them, and when it renews.
// Visible to every role: a viewer can see why audits slow down. Payment is not wired, so "Change plan" says « Bientôt ».
export default async function Abonnement() {
  const ctx = await teamContext();
  if (!ctx) redirect("/connexion?next=/espace/abonnement");
  if (!ctx.team) redirect("/espace");
  const { team, teams } = ctx;
  const lang = await getLang();
  const t = tr(lang);
  const loc = locale(lang);
  const [c, { data: settings }] = await Promise.all([loadCredits(team.id), db.from("teams").select("webhook_url").eq("id", team.id).single()]);
  const plan = PLANS[c.plan];
  const n = (x: number) => x.toLocaleString(loc);
  const cr = (x: number) => `${n(x)} ${t(x > 1 ? "crédits" : "crédit", x === 1 ? "credit" : "credits")}`;
  const renews = c.renews.toLocaleDateString(loc, { day: "numeric", month: "long", timeZone: "UTC" });
  const level = c.pct >= 100 ? "fail" : c.pct >= ALERTS[0] ? "warn" : "ok";
  const over = c.projected != null && c.projected > c.included;
  const KIND: Record<Kind, [string, string]> = {
    manual: [t("Audits lancés à la main", "Audits run by hand"), t("Une mission d'achat, concurrent et comparaison de modèles compris", "One shopping mission, competitor and model comparison included")],
    automation: [t("Automations", "Automations"), t("Mission d'un audit relancé tout seul : page modifiée, mise en ligne, suivi mensuel", "Mission of an audit run on its own: page changed, release, monthly follow-up")],
    replay: [t("Missions rejouées", "Replayed missions"), t("Une mission en échec relancée une seconde fois par l'agent", "A failed mission the agent runs a second time")],
    payment: [t("Tests de paiement", "Payment tests"), t("Un vrai paiement avec la carte de l'équipe", "A real payment with the team's card")],
  };
  const bar = level === "fail" ? "bg-fail" : level === "warn" ? "bg-warn" : "bg-blue";

  return (
    <SpaceShell
      narrow
      team={team}
      teams={teams}
      title={t("Abonnement et crédits", "Plan and credits")}
      hint={t(
        "Chaque mission qu'un agent fait sur un site utilise un crédit. Un audit complet, ce sont cinq missions, donc cinq crédits.",
        "Every mission an agent runs on a site uses one credit. A full audit is five missions, so five credits.",
      )}
    >
      <Group title={t("Ce mois-ci", "This month")} footer={t(`Les crédits repartent à zéro le ${renews}.`, `Credits reset on ${renews}.`)}>
        <div className="grid gap-5 p-6 sm:p-8">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <p className="type-title tabular-nums">
              {n(c.used)}
              <span className="type-headline font-normal text-ink-2"> {t("sur", "of")} {cr(c.included)}</span>
            </p>
            <p className={`type-small font-semibold ${level === "fail" ? "text-fail" : level === "warn" ? "text-warn" : "text-ink-2"}`}>
              {level === "fail" ? t("Crédits épuisés", "No credits left") : t(`${n(c.left)} restants`, `${n(c.left)} left`)}
            </p>
          </div>
          <div
            role="meter"
            aria-label={t("Crédits utilisés ce mois-ci", "Credits used this month")}
            aria-valuemin={0}
            aria-valuemax={c.included}
            aria-valuenow={Math.min(c.used, c.included)}
            aria-valuetext={t(`${n(c.used)} crédits sur ${n(c.included)}, ${c.pct} %`, `${n(c.used)} of ${n(c.included)} credits, ${c.pct}%`)}
            className="relative h-2.5 overflow-hidden rounded-full bg-fill"
          >
            <span className={`absolute inset-y-0 left-0 rounded-full ${bar} transition-[width] duration-500 motion-reduce:transition-none`} style={{ width: `${Math.min(100, c.pct)}%` }} />
            {/* The 80 % alert, marked on the track so the first warning is never a surprise. */}
            <span aria-hidden className="absolute inset-y-0 w-px bg-bg-2/80 dark:bg-tile" style={{ left: `${ALERTS[0]}%` }} />
          </div>
          <dl className="grid grid-cols-3 gap-x-4 gap-y-3 sm:gap-x-8">
            <div>
              <dt className="type-caption text-ink-2">{t("Utilisés", "Used")}</dt>
              <dd className="font-semibold tabular-nums">{t(`${c.pct} %`, `${c.pct}%`)}</dd>
            </div>
            <div>
              <dt className="type-caption text-ink-2">{t("Renouvellement", "Renews")}</dt>
              <dd className="font-semibold">{renews}</dd>
            </div>
            <div>
              <dt className="type-caption text-ink-2">{t("Projection fin de mois", "Month-end projection")}</dt>
              <dd className={`font-semibold tabular-nums ${over ? "text-warn" : ""}`}>
                {c.projected == null ? t("Trop tôt pour estimer", "Too early to tell") : cr(c.projected)}
                {over && <span className="type-caption block font-normal">{t("Au-delà du forfait à ce rythme", "Over the plan at this pace")}</span>}
              </dd>
            </div>
          </dl>
          {level !== "ok" && (
            <div role="status">
              <Note icon={level === "fail" ? "info" : "trend"}>
                {level === "fail"
                  ? t("Crédits épuisés · audits toujours ouverts pendant l'essai, rien n'est facturé.", "Credits used up · audits still run during the trial, nothing is charged.")
                  : t(`Plus de ${ALERTS[0]} % des crédits utilisés.`, `Over ${ALERTS[0]}% of credits used.`)}
              </Note>
            </div>
          )}
        </div>
      </Group>

      <Group title={t("Offre", "Plan")} footer={t("Le paiement en ligne n'est pas encore ouvert : l'offre se change bientôt ici.", "Online payment is not open yet: you will soon change plan here.")}>
        <Row>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">{plan[lang]}</span>
            <span className="type-small text-ink-2">
              {t(`${n(plan.credits)} crédits par mois`, `${n(plan.credits)} credits a month`)}
              {plan.price ? t(` · ${plan.price} € par mois`, ` · €${plan.price} a month`) : ""}
            </span>
          </span>
          <Chip icon="none" tone="pass">{t("Actif", "Active")}</Chip>
        </Row>
        <Row className="justify-between">
          <Link href="/#tarifs" className="more">
            {t("Voir les tarifs", "See pricing")}
          </Link>
          <button type="button" disabled className="btn btn-dark min-h-9 cursor-not-allowed px-4 text-[14px] opacity-50">
            {t("Changer d'offre · bientôt", "Change plan · soon")}
          </button>
        </Row>
      </Group>

      <Group title={t("Par type", "By type")} footer={t("Barème provisoire, susceptible d'évoluer avant l'ouverture du paiement.", "Provisional rates, may change before payment opens.")} aside={<Chip icon="info">{t("Provisoire", "Provisional")}</Chip>}>
        {(Object.keys(RATES) as Kind[]).map((k) => {
          const used = c.byKind.find((b) => b.kind === k)?.credits ?? 0;
          return (
            <Row key={k}>
              <span className="min-w-0 flex-1">
                <span className="block">{KIND[k][0]}</span>
                <span className="type-caption text-ink-2">
                  {KIND[k][1]} · {cr(RATES[k])}
                </span>
              </span>
              <span className={`tabular-nums ${used ? "font-semibold" : "text-ink-2"}`}>{cr(used)}</span>
            </Row>
          );
        })}
      </Group>

      <Group title={t("Par site", "By site")}>
        {c.bySite.length ? (
          c.bySite.map((s) => (
            <Row key={`${s.domain}/${s.device}`}>
              <span className="min-w-0 flex-1">
                <span className="block truncate">{s.domain}</span>
                <span className="type-caption text-ink-2">
                  <DeviceTag device={s.device} lang={lang} />
                </span>
              </span>
              <span className="w-24 max-sm:hidden" aria-hidden>
                <span className="block h-1.5 overflow-hidden rounded-full bg-fill">
                  <span className="block h-full rounded-full bg-blue" style={{ width: `${Math.max(4, (s.credits / Math.max(1, c.bySite[0].credits)) * 100)}%` }} />
                </span>
              </span>
              <span className="w-24 text-right font-semibold tabular-nums">{cr(s.credits)}</span>
            </Row>
          ))
        ) : (
          <Row>
            <span className="text-ink-2">{t("Aucun crédit utilisé", "No credits used")}</span>
          </Row>
        )}
      </Group>

      {c.recent.length > 0 && (
        <Group title={t("Derniers audits", "Latest audits")}>
          {c.recent.map((a) => (
            <Link key={a.audit_id} href={`/audit/${a.audit_id}`} className="block hover:bg-fill/50">
              <Row>
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{a.domain}</span>
                  <span className="type-caption text-ink-2">
                    {new Date(a.at).toLocaleDateString(loc, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })} ·{" "}
                    {(Object.keys(RATES) as Kind[]).filter((k) => a.kinds.has(k)).map((k) => KIND[k][0]).join(", ")}
                  </span>
                </span>
                <span className="font-semibold tabular-nums">{cr(a.credits)}</span>
              </Row>
            </Link>
          ))}
        </Group>
      )}

      <Group title={t("Alertes", "Alerts")}>
        <Row>
          <span className="min-w-0 flex-1">
            <Hint
              tip={
                settings?.webhook_url
                  ? t("Par e-mail au propriétaire de l'espace et sur le canal réglé dans Automations.", "By e-mail to the space owner and on the channel set in Automations.")
                  : t("Par e-mail au propriétaire de l'espace. Ajoute Slack ou un webhook dans Automations pour les recevoir aussi là.", "By e-mail to the space owner. Add Slack or a webhook in Automations to get them there too.")
              }
            >
              {t(`À ${ALERTS.join(" % et ")} %`, `At ${ALERTS.join("% and ")}%`)}
            </Hint>
          </span>
          <Link href="/espace/automations" className="more">
            {t("Régler", "Set up")}
          </Link>
        </Row>
      </Group>
    </SpaceShell>
  );
}
