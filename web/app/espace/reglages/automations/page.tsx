import Link from "next/link";
import { redirect } from "next/navigation";
import { Hint } from "@/lib/hint";
import { canLaunch, teamContext } from "@/lib/auth";
import { AUTO_AUDIT_MISSIONS, listAutomations } from "@/lib/automations";
import { RATES } from "@/lib/credits";
import { db } from "@/lib/engine";
import { Chip, Chips, Empty, Icon, Note, Row, StatusGlyph, type Tone } from "@/lib/ui";
import { AutoSubmitSelect, ConfirmButton, CopyField, Flash, KeepScroll } from "../../controls";
import { SpaceShell } from "../../shell";
import { shortDate } from "@/lib/space";
import { locale, tr, type Lang, type T } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

export const metadata = { title: "Automations · AgentProof" };

const HOUR = 3600_000;
// Server render time, read once per request (the page is dynamic).
const clock = () => Date.now();
const MONTH = 30 * 24 * HOUR;

// "il y a 3 h", "dans 21 h", "dans 12 j": the nearest unit, as Linear or Vercel show a schedule.
function rel(ms: number, lang: Lang) {
  const f = new Intl.RelativeTimeFormat(locale(lang), { numeric: "auto", style: "short" });
  const m = Math.round(ms / 60_000);
  if (Math.abs(m) < 60) return f.format(m, "minute");
  const h = Math.round(m / 60);
  if (Math.abs(h) < 48) return f.format(h, "hour");
  return f.format(Math.round(h / 24), "day");
}

const labels = (t: T) => ({
  CHECK: {
    baseline: ["none", t("Référence enregistrée", "Baseline saved")],
    same: ["pass", t("Aucun changement", "No change")],
    changed: ["warn", t("Page modifiée", "Page changed")],
    error: ["fail", t("Page illisible", "Page unreadable")],
    monthly: ["none", t("Audit mensuel", "Monthly audit")],
    deploy: ["none", t("Mise en ligne reçue", "Release received")],
  } as Record<string, [Tone, string]>,
  INTERVALS: [
    ["1", t("Toutes les heures", "Every hour")],
    ["6", t("Toutes les 6 h", "Every 6 h")],
    ["24", t("Chaque jour", "Every day")],
    ["168", t("Chaque semaine", "Every week")],
  ] as [string, string][],
  DROPS: [
    ["5", t("5 points", "5 points")],
    ["10", t("10 points", "10 points")],
    ["20", t("20 points", "20 points")],
  ] as [string, string][],
  // Answers of /api/automations, shown as a toast.
  OK: {
    saved: t("Enregistré", "Saved"),
    added: t("Page ajoutée : première vérification dans la minute", "Page added: first check within a minute"),
    removed: t("Page retirée", "Page removed"),
    paused: t("Surveillance en pause", "Monitoring paused"),
    resumed: t("Surveillance reprise", "Monitoring resumed"),
    checked: t("Page vérifiée", "Page checked"),
    tested: t("Enregistré, message de test envoyé", "Saved, test message sent"),
    webhook_off: t("Webhook retiré", "Webhook removed"),
  } as Record<string, string>,
  ERR: {
    role: t("Seuls le propriétaire et les admins modifient les automations.", "Only the owner and admins change automations."),
    url: t("Adresse invalide : indique le domaine public d'un site, par exemple https://www.exemple.fr.", "Invalid address: enter a site's public domain, for example https://www.example.com."),
    max: t("20 pages suivies au maximum par équipe.", "20 tracked pages at most per team."),
    webhook: t("Le webhook doit commencer par https:// et viser un nom de domaine.", "The webhook must start with https:// and point to a domain name."),
    test: t("Webhook enregistré, mais le message de test a été refusé. Vérifie l'adresse.", "Webhook saved, but the test message was refused. Check the address."),
    cap: t("Le plafond est un nombre entier de 1 à 10 000, ou vide pour aucun plafond.", "The cap is a whole number from 1 to 10,000, or empty for no cap."),
    check: t("Page illisible pour l'instant (anti-bot ou page vide). Réessaie plus tard.", "Page unreadable for now (anti-bot or empty page). Try again later."),
    value: t("Valeur refusée. Recharge la page et réessaie.", "Value refused. Reload the page and try again."),
    server: t("Enregistrement impossible pour l'instant. Réessaie dans un instant.", "Could not save right now. Try again in a moment."),
  } as Record<string, string>,
});

// One card per function: a bare line icon and a title, facts on the right, the rows inside.
function Card({ id, icon, title, tip, aside, children }: { id: string; icon: string; title: string; tip?: React.ReactNode; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-1">
        <h2 className="type-headline flex items-center gap-2.5">
          <Icon name={icon} className="h-[20px] w-[20px] text-ink-2" />
          {tip ? <Hint tip={tip}>{title}</Hint> : title}
        </h2>
        {aside && <Chips>{aside}</Chips>}
      </div>
      <div className="overflow-hidden rounded-[18px] bg-tile">{children}</div>
    </section>
  );
}

// On/off switch that saves at once: a one-button form, so it works before the page's scripts load.
function Switch({ on, label, disabled, fields }: { on: boolean; label: string; disabled?: boolean; fields: Record<string, string> }) {
  return (
    <form action="/api/automations" method="post" className="flex">
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button role="switch" aria-checked={on} aria-label={label} title={label} disabled={disabled} className="ap-switch" />
    </form>
  );
}

const hiddenForm = (action: string, id: number) => (
  <>
    <input type="hidden" name="action" value={action} />
    <input type="hidden" name="id" value={id} />
  </>
);

const site = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "");
const input = "h-10 rounded-[10px] bg-bg-2 px-3 text-[15px] outline-none ring-blue placeholder:text-ink-2 focus-visible:ring-2 disabled:opacity-60 dark:bg-[#2c2c2e]";

export default async function Automations({ searchParams }: { searchParams: Promise<{ slack?: string; ok?: string; err?: string }> }) {
  const ctx = await teamContext();
  if (!ctx) redirect("/connexion?next=/espace/reglages/automations");
  if (!ctx.team) redirect("/espace");
  const { team } = ctx;
  const [items, { data: settings }, lang, sp] = await Promise.all([
    listAutomations(team.id),
    db.from("teams").select("webhook_url, hook_token, score_drop, site_credit_cap").eq("id", team.id).single(),
    getLang(),
    searchParams,
  ]);
  const admin = canLaunch(team.role);
  const t = tr(lang);
  const { CHECK, INTERVALS, DROPS, OK, ERR } = labels(t);
  const now = clock();
  const onSlack = !!settings?.webhook_url?.startsWith("https://hooks.slack.com/");
  const hookUrl = settings?.hook_token ? `${process.env.PUBLIC_URL ?? ""}/api/hooks/${settings.hook_token}` : null;
  const cap = (settings?.site_credit_cap as number | null | undefined) ?? null;
  const auditCost = AUTO_AUDIT_MISSIONS * RATES.automation;
  const active = items.filter((a: any) => a.enabled).length;
  const cr = (n: number) => t(`${n} crédit${n > 1 ? "s" : ""}`, `${n} credit${n > 1 ? "s" : ""}`);
  const credit = (n: number) => (
    <Chip icon="credit">{cr(n)}</Chip>
  );
  const when = (label: string, value: string) => (
    <span className="whitespace-nowrap">
      <span className="text-ink-2">{label} </span>
      {value}
    </span>
  );
  const flash = sp.err && ERR[sp.err] ? { tone: "err" as const, text: ERR[sp.err] } : sp.ok && OK[sp.ok] ? { tone: "ok" as const, text: OK[sp.ok] } : null;
  const slackNote =
    sp.slack === "ok"
      ? { tone: "ok" as const, text: t("Slack branché : un message de test vient de partir.", "Slack connected: a test message was just sent.") }
      : sp.slack === "refused"
        ? { tone: "err" as const, text: t("Connexion à Slack annulée ou expirée. Recommence.", "Slack connection cancelled or expired. Try again.") }
        : sp.slack === "error"
          ? { tone: "err" as const, text: t("Slack n'a pas donné de webhook. Réessaie dans un instant.", "Slack gave no webhook. Try again in a moment.") }
          : null;
  const toast = flash ?? slackNote;

  // Next page check: paused = none; never checked, or overdue = at the next tick (every minute).
  const nextCheck = (a: any) => {
    if (!a.enabled) return null;
    if (!a.last_checked_at) return t("dans la minute", "within a minute");
    const at = new Date(a.last_checked_at).getTime() + (a.interval_hours ?? 24) * HOUR;
    return at <= now + 60_000 ? t("dans la minute", "within a minute") : rel(at - now, lang);
  };
  const nextMonthly = (a: any) => {
    if (!a.enabled || !a.monthly) return null;
    if (!a.last_audit_at) return t("dans la minute", "within a minute");
    const at = new Date(a.last_audit_at).getTime() + MONTH;
    return at <= now ? t("dans la minute", "within a minute") : shortDate(new Date(at).toISOString(), lang);
  };

  return (
    <SpaceShell
      narrow
      settings
      hint={t(
        "AgentProof relit tes pages comme un agent d'achat (bandeau cookies, captcha, boutons, formulaires, robots.txt). Si quelque chose change, tu es prévenu, et un audit peut repartir tout seul. Les prix et les produits ne comptent pas.",
        "AgentProof rereads your pages as a shopping agent would (cookie banner, captcha, buttons, forms, robots.txt). When something changes, you are told, and an audit can start on its own. Prices and products do not count.",
      )}
    >
      <div className="grid gap-3">
        <div className="grid gap-1">
          <h2 className="text-[24px] font-semibold leading-tight tracking-[0.004em]">{t("Automations", "Automations")}</h2>
          <p className="text-ink-2">{t("AgentProof surveille tes pages et te prévient quand un agent risque d'être bloqué.", "AgentProof watches your pages and tells you when an agent may get blocked.")}</p>
        </div>
        <Chips>
          <Chip icon="eye" tone={active ? "pass" : "plain"}>
            {items.length
              ? t(`${active} page${active > 1 ? "s" : ""} surveillée${active > 1 ? "s" : ""} sur ${items.length}`, `${active} of ${items.length} page${items.length > 1 ? "s" : ""} monitored`)
              : t("Aucune page surveillée", "No page monitored")}
          </Chip>
          <Chip icon="mail">{onSlack ? t("Alertes : e-mail et Slack", "Alerts: e-mail and Slack") : settings?.webhook_url ? t("Alertes : e-mail et webhook", "Alerts: e-mail and webhook") : t("Alertes : e-mail", "Alerts: e-mail")}</Chip>
          <Chip icon="credit">{t("Vérifications gratuites", "Checks are free")}</Chip>
        </Chips>
      </div>

      {!admin && <Note icon="lock">{t("Lecture seule : un admin gère les automations.", "Read-only: an admin manages automations.")}</Note>}

      {/* ---------- 1. Page monitoring: free, one row per page ---------- */}
      <Card
        id="pages"
        icon="eye"
        title={t("Surveillance des pages", "Page monitoring")}
        tip={t(
          "Chaque page est relue à la fréquence choisie. La première lecture enregistre la référence ; ensuite, tout changement de structure (script, bouton, formulaire, robots.txt) déclenche une alerte. Une même modification n'est signalée qu'une fois par 24 h.",
          "Each page is reread at the chosen frequency. The first read saves the baseline; then any structural change (script, button, form, robots.txt) triggers an alert. The same change is reported once per 24 h at most.",
        )}
        aside={<Chip icon="credit" tone="pass">{t("Gratuit", "Free")}</Chip>}
      >
        {items.length === 0 && (
          <Empty icon="eye" title={t("Aucune page surveillée", "No page monitored")} className="rounded-none! bg-transparent! py-10!">
            {t("Ajoute l'accueil, une fiche produit ou le panier ci-dessous.", "Add the home page, a product page or the cart below.")}
          </Empty>
        )}
        {items.map((a: any) => {
          const last = a.automation_checks.find((c: any) => c.status !== "monthly");
          const [tone, label]: [Tone, string] = last ? (CHECK[last.status] ?? ["none", last.status]) : ["none", t("Pas encore vérifiée", "Not checked yet")];
          const next = nextCheck(a);
          return (
            <div key={a.id} className="border-b border-hairline last:border-0">
              <Row className="items-start! border-0 py-4">
                <span className="grid min-w-0 flex-1 basis-[min(100%,260px)] gap-1.5">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${a.enabled ? "bg-pass" : "bg-ink-2/50"}`} aria-hidden />
                    <a href={a.url} target="_blank" rel="noreferrer" className="truncate font-semibold hover:underline" title={a.url}>
                      {site(a.url)}
                    </a>
                    <span className={`type-caption shrink-0 font-semibold ${a.enabled ? "text-pass" : "text-ink-2"}`}>{a.enabled ? t("Active", "Active") : t("En pause", "Paused")}</span>
                  </span>
                  <span className="type-small flex flex-wrap gap-x-4 gap-y-1">
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                      <StatusGlyph tone={tone} />
                      {label}
                    </span>
                    {when(t("Dernière :", "Last:"), a.last_checked_at ? rel(new Date(a.last_checked_at).getTime() - now, lang) : "—")}
                    {when(t("Prochaine :", "Next:"), next ?? t("en pause", "paused"))}
                  </span>
                </span>
                {admin ? (
                  <span className="flex shrink-0 items-center gap-3 max-sm:w-full max-sm:justify-between">
                    <form action="/api/automations" method="post">
                      {hiddenForm("interval", a.id)}
                      <AutoSubmitSelect name="interval" defaultValue={String(a.interval_hours ?? 24)} label={t(`Fréquence pour ${site(a.url)}`, `Frequency for ${site(a.url)}`)} options={INTERVALS} />
                    </form>
                    <Switch
                      on={a.enabled}
                      label={a.enabled ? t(`Mettre ${site(a.url)} en pause`, `Pause ${site(a.url)}`) : t(`Reprendre ${site(a.url)}`, `Resume ${site(a.url)}`)}
                      fields={{ action: "state", id: String(a.id), state: a.enabled ? "off" : "on" }}
                    />
                  </span>
                ) : (
                  <Chip>{INTERVALS.find(([v]) => v === String(a.interval_hours ?? 24))?.[1]}</Chip>
                )}
              </Row>
              <details className="group px-5 pb-3">
                <summary className="type-small inline-flex min-h-8 cursor-pointer list-none items-center gap-4 text-ink-2 [&::-webkit-details-marker]:hidden">
                  <span className="inline-flex items-center gap-1 font-semibold text-link hover:underline">
                    {t("Historique", "History")}
                    <svg viewBox="0 0 24 24" className="h-3 w-3 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </span>
                </summary>
                <div className="mt-1 grid gap-0 rounded-[12px] bg-bg-2 px-4 py-1 dark:bg-[#2c2c2e]">
                  {a.automation_checks.length ? (
                    a.automation_checks.map((c: any) => {
                      const [ct, cl]: [Tone, string] = CHECK[c.status] ?? ["none", c.status];
                      return (
                        <div key={c.id} className="type-small flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b border-hairline py-2 last:border-0">
                          <span className="w-24 shrink-0 text-ink-2 tabular-nums">{shortDate(c.checked_at, lang)}</span>
                          <span className="inline-flex items-center gap-1.5 font-semibold">
                            <StatusGlyph tone={ct} />
                            {cl}
                          </span>
                          {c.audit_id && (
                            <Link href={`/audit/${c.audit_id}`} className="font-semibold text-link hover:underline">
                              {t("Voir l'audit", "See the audit")}
                            </Link>
                          )}
                          {c.detail && <span className="min-w-0 basis-full break-words text-ink-2">{c.detail}</span>}
                        </div>
                      );
                    })
                  ) : (
                    <p className="type-small py-2 text-ink-2">{t("Aucune vérification pour l'instant.", "No check yet.")}</p>
                  )}
                  {admin && (
                    <div className="type-small flex flex-wrap gap-x-5 gap-y-1 border-t border-hairline py-2.5">
                      <form action="/api/automations" method="post">
                        {hiddenForm("check", a.id)}
                        <button className="font-semibold text-link hover:underline">{t("Vérifier maintenant", "Check now")}</button>
                      </form>
                      <form action="/api/automations" method="post">
                        {hiddenForm("delete", a.id)}
                        <ConfirmButton message={t(`Ne plus surveiller ${a.url} ?`, `Stop monitoring ${a.url}?`)} className="font-semibold text-fail hover:underline">
                          {t("Retirer la page", "Remove the page")}
                        </ConfirmButton>
                      </form>
                    </div>
                  )}
                </div>
              </details>
            </div>
          );
        })}
        {admin && (
          <form action="/api/automations" method="post" className="flex flex-wrap items-center gap-3 border-t border-hairline bg-tile px-5 py-4">
            <input type="hidden" name="action" value="add" />
            <label htmlFor="add-urls" className="sr-only">
              {t("Pages à surveiller", "Pages to monitor")}
            </label>
            <input
              id="add-urls"
              name="urls"
              required
              placeholder={t("https://www.exemple.fr/panier", "https://www.example.com/cart")}
              spellCheck={false}
              autoCapitalize="none"
              autoComplete="off"
              className={`${input} min-w-0 flex-1 basis-[220px]`}
            />
            <button className="btn min-h-10 px-5 text-[15px]">{t("Ajouter", "Add")}</button>
          </form>
        )}
      </Card>

      {/* ---------- 2. Automatic audits: the part that costs credits ---------- */}
      <Card
        id="audits"
        icon="refresh"
        title={t("Audits automatiques", "Automatic audits")}
        tip={t(
          `Un audit complet (${AUTO_AUDIT_MISSIONS} missions) repart tout seul quand la page change (au plus un par page et par jour) ou tous les 30 jours. Avec un concurrent suivi, l'audit mensuel l'audite aussi : le coût double.`,
          `A full audit (${AUTO_AUDIT_MISSIONS} missions) starts on its own when the page changes (one per page and per day at most) or every 30 days. With a tracked competitor, the monthly audit audits it too: the cost doubles.`,
        )}
        aside={<>{credit(auditCost)} <span className="type-caption text-ink-2">{t("par audit", "per audit")}</span></>}
      >
        {items.length === 0 ? (
          <Row>
            <span className="type-small text-ink-2">{t("Ajoute d'abord une page à surveiller.", "Add a page to monitor first.")}</span>
          </Row>
        ) : (
          items.map((a: any) => {
            const onChange = a.mode === "audit";
            const lastMonthly = a.automation_checks.find((c: any) => c.status === "monthly" && c.audit_id);
            const nextM = nextMonthly(a);
            return (
              <div key={a.id} className="border-b border-hairline px-5 py-4 last:border-0">
                <div className="mb-2 flex items-center gap-2">
                  <span className="truncate font-semibold">{site(a.url)}</span>
                  {!a.enabled && <Chip className="shrink-0">{t("Surveillance en pause", "Monitoring paused")}</Chip>}
                </div>
                <div className="grid gap-3">
                  <div className="flex items-center gap-4">
                    <span className="grid min-w-0 flex-1 gap-0.5">
                      <span>{t("Quand la page change", "When the page changes")}</span>
                      <span className="type-small flex flex-wrap gap-x-4 text-ink-2">
                        {when(t("Dernier :", "Last:"), a.last_auto_audit_at ? shortDate(a.last_auto_audit_at, lang) : "—")}
                        <span>{t("1 par jour au plus", "1 per day at most")}</span>
                      </span>
                    </span>
                    <Switch
                      on={onChange}
                      disabled={!admin || !a.enabled}
                      label={t(`Auditer ${site(a.url)} quand la page change`, `Audit ${site(a.url)} when the page changes`)}
                      fields={{ action: "state", id: String(a.id), state: onChange ? "notify" : "audit" }}
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="grid min-w-0 flex-1 gap-0.5">
                      <span>{t("Tous les 30 jours", "Every 30 days")}</span>
                      <span className="type-small flex flex-wrap gap-x-4 text-ink-2">
                        {when(t("Dernier :", "Last:"), a.last_audit_at ? shortDate(a.last_audit_at, lang) : "—")}
                        {a.monthly && when(t("Prochain :", "Next:"), nextM ?? t("en pause", "paused"))}
                        {lastMonthly && (
                          <Link href={`/audit/${lastMonthly.audit_id}`} className="font-semibold text-link hover:underline">
                            {t("Voir le rapport", "See the report")}
                          </Link>
                        )}
                      </span>
                    </span>
                    <Switch
                      on={!!a.monthly}
                      disabled={!admin || !a.enabled}
                      label={t(`Audit mensuel de ${site(a.url)}`, `Monthly audit of ${site(a.url)}`)}
                      fields={{ action: "monthly", id: String(a.id), monthly: a.monthly ? "0" : "1" }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </Card>

      {/* ---------- 3. Alerts ---------- */}
      <Card id="alertes" icon="mail" title={t("Alertes", "Alerts")}>
        <Row>
          <span className="flex min-w-0 flex-1 items-center gap-3">
            <Icon name="mail" className="h-5 w-5 text-ink-2" />
            <span className="grid min-w-0">
              <span>{t("E-mail", "E-mail")}</span>
              <span className="type-small text-ink-2">{t("Page modifiée, baisse de score, crédits", "Page changed, score drop, credits")}</span>
            </span>
          </span>
          <Chip tone="pass">{t("Toujours actif", "Always on")}</Chip>
        </Row>
        {process.env.SLACK_CLIENT_ID && (
          <Row>
            <span className="flex min-w-0 flex-1 items-center gap-3">
              <Icon name="live" className="h-5 w-5 text-ink-2" />
              <span className="grid min-w-0">
                <span>Slack</span>
                <span className="type-small text-ink-2">{onSlack ? t("Branché", "Connected") : t("Non branché", "Not connected")}</span>
              </span>
            </span>
            {admin && (
              <a href="/api/slack/install" className={onSlack ? "btn-secondary min-h-9 rounded-full px-4 text-[15px] font-semibold" : "btn min-h-9 px-4 text-[15px]"}>
                {onSlack ? t("Changer de canal", "Change channel") : t("Connecter", "Connect")}
              </a>
            )}
          </Row>
        )}
        <Row className="py-4">
          <form action="/api/automations" method="post" className="grid w-full gap-2.5">
            <input type="hidden" name="action" value="alerts" />
            <label htmlFor="webhook_url" className="flex items-center gap-3">
              <Icon name="layers" className="h-5 w-5 text-ink-2" />
              <Hint tip={t("Discord, n8n, Make, Zapier ou un webhook Slack : colle l'URL de webhook entrant. Vide : pas de webhook.", "Discord, n8n, Make, Zapier or a Slack webhook: paste the incoming webhook URL. Empty: no webhook.")}>
                {t("Webhook", "Webhook")}
              </Hint>
              {settings?.webhook_url && <Chip tone="pass" className="ml-auto">{t("Actif", "On")}</Chip>}
            </label>
            <div className="flex flex-wrap items-center gap-2.5 sm:pl-8">
              <input
                id="webhook_url"
                name="webhook_url"
                type="url"
                pattern="https://.*"
                defaultValue={settings?.webhook_url ?? ""}
                placeholder="https://hooks.slack.com/services/…"
                spellCheck={false}
                autoCapitalize="none"
                disabled={!admin}
                className={`${input} min-w-0 flex-1 basis-[240px]`}
              />
              {admin && (
                <span className="flex gap-2">
                  <button className="btn min-h-10 px-4 text-[15px]">{t("Enregistrer", "Save")}</button>
                  <button name="test" value="1" className="btn-secondary min-h-10 rounded-full px-4 text-[15px] font-semibold">
                    {t("Tester", "Test")}
                  </button>
                </span>
              )}
            </div>
          </form>
        </Row>
        <Row>
          <span className="flex min-w-0 flex-1 items-center gap-3">
            <Icon name="trend" className="h-5 w-5 text-ink-2" />
            <Hint tip={t("Comparé à l'audit précédent du même site, même appareil et même modèle.", "Compared with the previous audit of the same site, device and model.")}>
              {t("Alerte si le score baisse de", "Alert when the score drops by")}
            </Hint>
          </span>
          {admin ? (
            <form action="/api/automations" method="post">
              <input type="hidden" name="action" value="score_drop" />
              <AutoSubmitSelect name="score_drop" defaultValue={String(settings?.score_drop ?? 10)} label={t("Baisse de score qui déclenche une alerte", "Score drop that triggers an alert")} options={DROPS} />
            </form>
          ) : (
            <Chip>{DROPS.find(([v]) => v === String(settings?.score_drop ?? 10))?.[1]}</Chip>
          )}
        </Row>
      </Card>

      {/* ---------- 4. After a release ---------- */}
      {hookUrl && (
        <Card
          id="mise-en-ligne"
          icon="play"
          title={t("Après une mise en ligne", "After a release")}
          tip={t("Appelle cette adresse secrète après un déploiement : toutes les pages surveillées sont vérifiées dans la minute.", "Call this secret address after a deployment: every monitored page is checked within a minute.")}
          aside={<Chip icon="credit" tone="pass">{t("Gratuit", "Free")}</Chip>}
        >
          <div className="grid gap-3 px-5 py-4">
            <CopyField value={`curl -X POST ${hookUrl}`} label={t("Adresse à appeler après un déploiement", "Address to call after a deployment")} lang={lang} />
            <dl className="type-small grid gap-1.5 text-ink-2 sm:grid-cols-[auto_1fr] sm:gap-x-4">
              <dt className="font-semibold text-ink">Vercel</dt>
              <dd>Settings › Webhooks · deployment.succeeded</dd>
              <dt className="font-semibold text-ink">Shopify</dt>
              <dd>{t("Paramètres › Notifications › Webhooks · Publication du thème", "Settings › Notifications › Webhooks · Theme publish")}</dd>
              <dt className="font-semibold text-ink">GitHub</dt>
              <dd>Settings › Webhooks · Deployment statuses</dd>
            </dl>
          </div>
        </Card>
      )}

      {/* ---------- 5. Credit cap per site ---------- */}
      <Card
        id="plafond"
        icon="credit"
        title={t("Plafond de crédits", "Credit cap")}
        tip={t(
          "Crédits par site et par mois, tous appareils. Au-delà, les audits automatiques ne partent plus jusqu'au 1er du mois. Un audit lancé à la main passe toujours. Vide : aucun plafond.",
          "Credits per site per month, all devices. Past it, automatic audits stop until the 1st of the month. An audit launched by hand always goes through. Empty: no cap.",
        )}
        aside={cap ? <Chip icon="credit">{t(`${cap} / site / mois`, `${cap} / site / month`)}</Chip> : <Chip>{t("Aucun plafond", "No cap")}</Chip>}
      >
        <Row>
          <form action="/api/automations" method="post" className="flex w-full flex-wrap items-center gap-x-4 gap-y-3">
            <input type="hidden" name="action" value="site_cap" />
            <label htmlFor="site_credit_cap" className="min-w-0 flex-1 basis-[200px]">
              {t("Crédits par site et par mois", "Credits per site per month")}
            </label>
            <span className="flex items-center gap-2.5">
              <input
                id="site_credit_cap"
                name="site_credit_cap"
                type="number"
                inputMode="numeric"
                min={1}
                max={10000}
                step={1}
                defaultValue={cap ?? ""}
                placeholder={t("Aucun", "None")}
                disabled={!admin}
                className={`${input} w-28 text-right tabular-nums`}
              />
              {admin && <button className="btn-secondary min-h-10 rounded-full px-4 text-[15px] font-semibold">{t("Enregistrer", "Save")}</button>}
            </span>
          </form>
        </Row>
      </Card>

      <KeepScroll />
      {toast && <Flash key={`${sp.ok ?? ""}${sp.err ?? ""}${sp.slack ?? ""}`} tone={toast.tone} text={toast.text} close={t("Fermer", "Close")} />}
    </SpaceShell>
  );
}
