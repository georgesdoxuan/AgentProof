import Link from "next/link";
import { Hint } from "@/lib/hint";
import { redirect } from "next/navigation";
import { canLaunch, teamContext } from "@/lib/auth";
import { listAutomations } from "@/lib/automations";
import { db } from "@/lib/engine";
import { Chip, Empty, Group, Note, Row, Segmented, StatusGlyph, type Tone } from "@/lib/ui";
import { AutoSubmitSelect, ConfirmButton } from "../controls";
import { SpaceShell } from "../shell";
import { shortDate } from "@/lib/space";
import { tr, type Lang } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

export const metadata = { title: "Automations · AgentProof" };

const labels = (lang: Lang) => {
  const t = tr(lang);
  return {
    STATES: [
      ["notify", t("Prévenir", "Notify")],
      ["audit", t("Prévenir et auditer", "Notify and audit")],
      ["off", t("Désactivée", "Off")],
    ] as [string, string][],
    CHECK: {
      baseline: ["none", t("Référence enregistrée", "Baseline saved")],
      same: ["pass", t("Aucun changement", "No change")],
      changed: ["warn", t("Site modifié", "Site changed")],
      error: ["fail", t("Vérification impossible", "Check failed")],
      monthly: ["none", t("Audit mensuel", "Monthly audit")],
      deploy: ["none", t("Mise en ligne reçue", "Release received")],
    } as Record<string, [Tone, string]>,
    INTERVALS: [
      ["1", t("Toutes les heures", "Every hour")],
      ["6", t("Toutes les 6 h", "Every 6 h")],
      ["24", t("Une fois par jour", "Once a day")],
      ["168", t("Une fois par semaine", "Once a week")],
    ] as [string, string][],
    DROPS: [
      ["5", t("Baisse de 5 points", "5-point drop")],
      ["10", t("Baisse de 10 points", "10-point drop")],
      ["20", t("Baisse de 20 points", "20-point drop")],
    ] as [string, string][],
    MONTHLY: [
      ["0", t("Sans audit mensuel", "No monthly audit")],
      ["1", t("Audit tous les 30 jours", "Audit every 30 days")],
    ] as [string, string][],
  };
};

export default async function Automations({ searchParams }: { searchParams: Promise<{ slack?: string }> }) {
  const ctx = await teamContext();
  if (!ctx) redirect("/connexion?next=/espace/automations");
  if (!ctx.team) redirect("/espace");
  const { team } = ctx;
  const items = await listAutomations(team.id);
  const admin = canLaunch(team.role);
  const lang = await getLang();
  const t = tr(lang);
  const { STATES, CHECK, MONTHLY, INTERVALS, DROPS } = labels(lang);
  const { data: settings } = await db.from("teams").select("webhook_url, hook_token, score_drop").eq("id", team.id).single();
  const slack = (await searchParams).slack;
  const onSlack = !!settings?.webhook_url?.startsWith("https://hooks.slack.com/");
  const hookUrl = settings?.hook_token ? `${process.env.PUBLIC_URL ?? ""}/api/hooks/${settings.hook_token}` : null;
  const every = (h: number) => INTERVALS.find(([v]) => v === String(h))?.[1].toLowerCase() ?? `${h} h`;

  return (
    <SpaceShell narrow
      title="Automations"
      hint={t(
        "AgentProof relit tes pages (bandeau cookies, captcha, boutons, formulaires, robots.txt, UCP) à la fréquence choisie et après chaque mise en ligne. S'il y a un changement, tu es prévenu ici, par e-mail et sur Slack. Les prix et les produits ne comptent pas.",
        "AgentProof rereads your pages (cookie banner, captcha, buttons, forms, robots.txt, UCP) at the chosen frequency and after every release. When something changes, you are told here, by e-mail and on Slack. Prices and products do not count.",
      )}
    >
      {items.length ? (
        items.map((a: any) => {
          const state = a.enabled ? a.mode : "off";
          return (
            <Group
              key={a.id}
              title={a.url.replace(/^https?:\/\//, "")}
              aside={
                admin && (
                  <div className="flex flex-wrap items-center gap-3">
                    <form action="/api/automations" method="post">
                      <input type="hidden" name="action" value="state" />
                      <input type="hidden" name="id" value={a.id} />
                      <AutoSubmitSelect name="state" defaultValue={state} label={t("Mode de l'automation", "Automation mode")} options={STATES} />
                    </form>
                    <form action="/api/automations" method="post">
                      <input type="hidden" name="action" value="interval" />
                      <input type="hidden" name="id" value={a.id} />
                      <AutoSubmitSelect name="interval" defaultValue={String(a.interval_hours ?? 24)} label={t("Fréquence de vérification", "Check frequency")} options={INTERVALS} />
                    </form>
                    <form action="/api/automations" method="post">
                      <input type="hidden" name="action" value="monthly" />
                      <input type="hidden" name="id" value={a.id} />
                      <AutoSubmitSelect name="monthly" defaultValue={a.monthly ? "1" : "0"} label={t("Suivi mensuel", "Monthly tracking")} options={MONTHLY} />
                    </form>
                    <form action="/api/automations" method="post">
                      <input type="hidden" name="action" value="check" />
                      <input type="hidden" name="id" value={a.id} />
                      <button className="type-small font-semibold text-blue hover:underline">{t("Vérifier maintenant", "Check now")}</button>
                    </form>
                    <form action="/api/automations" method="post">
                      <input type="hidden" name="action" value="delete" />
                      <input type="hidden" name="id" value={a.id} />
                      <ConfirmButton message={t(`Ne plus suivre ${a.url} ?`, `Stop tracking ${a.url}?`)} className="type-small font-semibold text-fail hover:underline">
                        {t("Retirer", "Remove")}
                      </ConfirmButton>
                    </form>
                  </div>
                )
              }
              footer={
                !a.enabled
                  ? t("Désactivée : aucune vérification.", "Off: no checks.")
                  : !a.last_checked_at && a.automation_checks[0]?.status === "deploy"
                    ? t("Mise en ligne reçue : vérification dans la minute.", "Release received: check within a minute.")
                  : a.last_checked_at
                    ? t(
                        `Dernière vérification ${shortDate(a.last_checked_at, lang)}. Ensuite ${every(a.interval_hours ?? 24)}.${a.monthly ? (a.last_audit_at ? ` Audit mensuel : dernier le ${shortDate(a.last_audit_at, lang)}.` : " Audit mensuel : le premier part dans la minute.") : ""}`,
                        `Last check ${shortDate(a.last_checked_at, lang)}. Then ${every(a.interval_hours ?? 24)}.${a.monthly ? (a.last_audit_at ? ` Monthly audit: last on ${shortDate(a.last_audit_at, lang)}.` : " Monthly audit: the first starts within a minute.") : ""}`,
                      )
                    : t("Première vérification dans la minute : elle enregistre la page de référence.", "First check within a minute: it saves the baseline page.")
              }
            >
              {a.automation_checks.length ? (
                a.automation_checks.map((c: any) => {
                  const [tone, label] = CHECK[c.status];
                  return (
                    <Row key={c.id}>
                      <span className="type-small w-28 shrink-0 text-ink-2">{shortDate(c.checked_at, lang)}</span>
                      <span className="inline-flex items-center gap-1.5 font-semibold">
                        <StatusGlyph tone={tone} />
                        {label}
                      </span>
                      {c.detail && <span className="type-small min-w-0 basis-full text-ink-2">{c.detail}</span>}
                      {c.audit_id && (
                        <Link href={`/audit/${c.audit_id}`} className="type-small font-semibold text-blue hover:underline">
                          {t("Voir le nouvel audit", "See the new audit")}
                        </Link>
                      )}
                    </Row>
                  );
                })
              ) : (
                <Row>
                  <Chip icon="clock">{t("Pas encore vérifiée", "Not checked yet")}</Chip>
                </Row>
              )}
            </Group>
          );
        })
      ) : (
        <Empty icon="eye" title={t("Aucune page suivie", "No tracked page")} />
      )}

      {admin && (
        <Group
          title={t("Alertes et mises en ligne", "Alerts and releases")}
          footer={t(
            "Le webhook reçoit chaque changement de page et chaque baisse de score, en plus de l'e-mail. Slack, Discord, n8n, Make ou Zapier : colle l'URL de webhook entrant.",
            "The webhook gets every page change and every score drop, on top of the e-mail. Slack, Discord, n8n, Make or Zapier: paste the incoming webhook URL.",
          )}
        >
          {process.env.SLACK_CLIENT_ID && (
            <Row>
              <span className="grid min-w-0 flex-1 gap-1">
                <span className="inline-flex items-center gap-1.5 font-semibold">
                  {onSlack && <StatusGlyph tone="pass" />}
                  {onSlack ? t("Slack est branché", "Slack is connected") : t("Brancher Slack", "Connect Slack")}
                </span>
                <span className="type-small text-ink-2">
                  {slack === "ok"
                    ? t("C'est fait : un message de test vient de partir dans le canal choisi.", "Done: a test message was just sent to the chosen channel.")
                    : slack === "refused"
                      ? t("Connexion annulée ou expirée. Recommence depuis ce bouton.", "Connection cancelled or expired. Start again from this button.")
                      : slack === "error"
                        ? t("Slack n'a pas donné de webhook. Réessaie dans un instant.", "Slack gave no webhook. Try again in a moment.")
                        : t("En un clic : Slack te demande le canal où poster les alertes.", "One click: Slack asks for the channel to post alerts in.")}
                </span>
              </span>
              <a href="/api/slack/install" className="btn">
                {onSlack ? t("Changer de canal", "Change channel") : t("Connecter Slack", "Connect Slack")}
              </a>
            </Row>
          )}
          <form action="/api/automations" method="post" className="grid gap-4 p-6 sm:p-8">
            <input type="hidden" name="action" value="alerts" />
            <label className="grid gap-2">
              <span className="type-small text-ink-2">{t("Ou une URL de webhook (Slack, Discord, n8n, Make, Zapier)", "Or a webhook URL (Slack, Discord, n8n, Make, Zapier)")}</span>
              <input
                name="webhook_url"
                type="url"
                defaultValue={settings?.webhook_url ?? ""}
                placeholder="https://hooks.slack.com/services/…"
                spellCheck={false}
                autoCapitalize="none"
                className="w-full rounded-[12px] border border-[#86868b] bg-tile px-4 py-3 text-[17px] focus:border-blue focus:shadow-[0_0_0_4px_rgb(0_113_227/0.3)] focus:outline-none dark:border-line"
              />
            </label>
            <label className="grid gap-2">
              <span className="type-small text-ink-2">{t("Alerte de score", "Score alert")}</span>
              <select name="score_drop" defaultValue={String(settings?.score_drop ?? 10)} className="w-fit rounded-[12px] border border-[#86868b] bg-tile px-4 py-3 text-[17px] dark:border-line">
                {DROPS.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label className="type-small flex items-center gap-3">
              <input type="checkbox" name="test" value="1" defaultChecked className="h-4 w-4 accent-blue" />
              {t("Envoyer un message de test", "Send a test message")}
            </label>
            <div>
              <button className="btn">{t("Enregistrer", "Save")}</button>
            </div>
          </form>
          {hookUrl && (
            <Row>
              <span className="grid min-w-0 gap-2">
                <span className="font-semibold">{t("Vérifier après chaque mise en ligne", "Check after every release")}</span>
                <span className="type-small text-ink-2">
                  {t(
                    "Appelle cette adresse secrète après un déploiement : toutes les pages suivies sont vérifiées dans la minute. Vercel : Settings › Webhooks, événement deployment.succeeded. Shopify : Paramètres › Notifications › Webhooks, événement « Publication du thème ». GitHub : Settings › Webhooks, événement Deployment statuses. Ou à la main :",
                    "Call this secret address after a deployment: every tracked page is checked within a minute. Vercel: Settings › Webhooks, deployment.succeeded event. Shopify: Settings › Notifications › Webhooks, “Theme publish” event. GitHub: Settings › Webhooks, Deployment statuses event. Or by hand:",
                  )}
                </span>
                <code className="type-small block overflow-x-auto rounded-[8px] bg-bg-2 px-3 py-2 dark:bg-[#2c2c2e]">curl -X POST {hookUrl}</code>
              </span>
            </Row>
          )}
        </Group>
      )}

      {admin ? (
        <Group
          title={t("Suivre des pages", "Track pages")}
          footer={t(
            "Une URL par ligne : accueil, page produit, panier… Chaque page est vérifiée une fois par jour (réglable ensuite), gratuitement. Seul un audit relancé est payant, au plus un par page et par jour.",
            "One URL per line: home page, product page, cart… Each page is checked once a day (adjustable later), for free. Only a rerun audit costs anything, one per page and per day at most.",
          )}
        >
          <form action="/api/automations" method="post" className="grid gap-4 p-6 sm:p-8">
            <input type="hidden" name="action" value="add" />
            <label className="grid gap-2">
              <span className="type-small text-ink-2">{t("URL des sites de l’entreprise", "The company's site URLs")}</span>
              <textarea
                name="urls"
                required
                rows={3}
                placeholder={t("https://www.exemple.fr\nhttps://www.exemple.fr/panier", "https://www.example.com\nhttps://www.example.com/cart")}
                spellCheck={false}
                autoCapitalize="none"
                className="w-full rounded-[12px] border border-[#86868b] bg-tile px-4 py-3 text-[17px] focus:border-blue focus:shadow-[0_0_0_4px_rgb(0_113_227/0.3)] focus:outline-none dark:border-line"
              />
            </label>
            <div className="grid gap-2">
              <span className="type-small text-ink-2">{t("Quand une page change", "When a page changes")}</span>
              <div>
                <Segmented name="state" label={t("Quand une page change", "When a page changes")} value="notify" options={STATES.slice(0, 2)} />
              </div>
            </div>
            <label className="type-small flex items-center gap-3 rounded-[12px] bg-bg-2 p-4 dark:bg-[#2c2c2e]">
              <input type="checkbox" name="monthly" value="1" className="h-4 w-4 shrink-0 accent-blue" />
              <Hint focusable={false} tip={t("Un audit complet tous les 30 jours, et une alerte (e-mail et Slack) si le score baisse plus que le seuil choisi.", "A full audit every 30 days, and an alert (e-mail and Slack) if the score drops more than the chosen threshold.")}>
                <span className="font-semibold">{t("Suivi mensuel", "Monthly tracking")}</span>
              </Hint>
            </label>
            <div>
              <button className="btn">{t("Activer l’automation", "Turn on the automation")}</button>
            </div>
          </form>
        </Group>
      ) : (
        <Note icon="eye">{t("Lecture seule : un admin gère les automations.", "Read-only: an admin manages automations.")}</Note>
      )}
    </SpaceShell>
  );
}
