import Link from "next/link";
import { redirect } from "next/navigation";
import { canLaunch, teamContext } from "@/lib/auth";
import { listAutomations } from "@/lib/automations";
import { Group, Row, Segmented, StatusGlyph, type Tone } from "@/lib/ui";
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
    } as Record<string, [Tone, string]>,
    MONTHLY: [
      ["0", t("Sans audit mensuel", "No monthly audit")],
      ["1", t("Audit tous les 30 jours", "Audit every 30 days")],
    ] as [string, string][],
  };
};

export default async function Automations() {
  const ctx = await teamContext();
  if (!ctx) redirect("/connexion?next=/espace/automations");
  if (!ctx.team) redirect("/espace");
  const { team, teams } = ctx;
  const items = await listAutomations(team.id);
  const admin = canLaunch(team.role);
  const lang = await getLang();
  const t = tr(lang);
  const { STATES, CHECK, MONTHLY } = labels(lang);

  return (
    <SpaceShell
      team={team}
      teams={teams}
      title="Automations"
      intro={t(
        "Une fois par jour, AgentProof relit chaque page suivie et la compare à la veille : scripts tiers (captcha, bandeau cookies), formulaires, boutons et champs. Prix et produits ne comptent pas. Si la page a changé, tu es prévenu ici et par e-mail, et un audit peut repartir tout seul. Avec le suivi mensuel, un audit complet repart tous les 30 jours, et tu reçois une alerte si le score baisse de 10 points ou plus.",
        "Once a day, AgentProof rereads each tracked page and compares it with the day before: third-party scripts (captcha, cookie banner), forms, buttons and fields. Prices and products do not count. If the page changed, you are told here and by e-mail, and an audit can start on its own. With monthly tracking, a full audit runs every 30 days, and you get an alert if the score drops by 10 points or more.",
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
                  : a.last_checked_at
                    ? t(
                        `Dernière vérification ${shortDate(a.last_checked_at, lang)}. Prochaine dans les 24 h.${a.monthly ? (a.last_audit_at ? ` Audit mensuel : dernier le ${shortDate(a.last_audit_at, lang)}.` : " Audit mensuel : le premier part dans la minute.") : ""}`,
                        `Last check ${shortDate(a.last_checked_at, lang)}. Next within 24 h.${a.monthly ? (a.last_audit_at ? ` Monthly audit: last on ${shortDate(a.last_audit_at, lang)}.` : " Monthly audit: the first starts within a minute.") : ""}`,
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
                  <span className="text-ink-2">{t("Pas encore vérifiée.", "Not checked yet.")}</span>
                </Row>
              )}
            </Group>
          );
        })
      ) : (
        <p className="text-ink-2">{t("Aucune page suivie pour le moment.", "No tracked page yet.")}</p>
      )}

      {admin ? (
        <Group
          title={t("Suivre des pages", "Track pages")}
          footer={t(
            "Une URL par ligne : accueil, page produit, panier… Chaque page est vérifiée une fois par jour, sans IA et sans crédit H. Seul l'audit relancé consomme des crédits.",
            "One URL per line: home page, product page, cart… Each page is checked once a day, with no AI and no H credits. Only the rerun audit uses credits.",
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
            <label className="type-small flex items-start gap-3 rounded-[12px] bg-bg-2 p-4 dark:bg-[#2c2c2e]">
              <input type="checkbox" name="monthly" value="1" className="mt-0.5 h-4 w-4 shrink-0 accent-blue" />
              <span>
                <span className="font-semibold">{t("Suivi mensuel", "Monthly tracking")}</span>
                <span className="block text-ink-2">{t("Un audit complet tous les 30 jours, et une alerte par e-mail si le score baisse de 10 points ou plus.", "A full audit every 30 days, and an e-mail alert if the score drops by 10 points or more.")}</span>
              </span>
            </label>
            <div>
              <button className="btn">{t("Activer l’automation", "Turn on the automation")}</button>
            </div>
          </form>
        </Group>
      ) : (
        <p className="type-small text-ink-2">{t("Seuls le propriétaire et les admins de l’équipe gèrent les automations.", "Only the team's owner and admins manage automations.")}</p>
      )}
    </SpaceShell>
  );
}
