import Link from "next/link";
import { redirect } from "next/navigation";
import { canLaunch, teamContext } from "@/lib/auth";
import { listAutomations } from "@/lib/automations";
import { Group, Row, Segmented, StatusGlyph, type Tone } from "@/lib/ui";
import { AutoSubmitSelect, ConfirmButton } from "../controls";
import { SpaceShell } from "../shell";
import { shortDate } from "@/lib/space";

export const metadata = { title: "Automations · AgentProof" };

const STATES: [string, string][] = [
  ["notify", "Prévenir"],
  ["audit", "Prévenir et auditer"],
  ["off", "Désactivée"],
];
const CHECK: Record<string, [Tone, string]> = {
  baseline: ["none", "Référence enregistrée"],
  same: ["pass", "Aucun changement"],
  changed: ["warn", "Site modifié"],
  error: ["fail", "Vérification impossible"],
  monthly: ["none", "Audit mensuel"],
};
const MONTHLY: [string, string][] = [
  ["0", "Sans audit mensuel"],
  ["1", "Audit tous les 30 jours"],
];

export default async function Automations() {
  const ctx = await teamContext();
  if (!ctx) redirect("/connexion?next=/espace/automations");
  if (!ctx.team) redirect("/espace");
  const { team, teams } = ctx;
  const items = await listAutomations(team.id);
  const admin = canLaunch(team.role);

  return (
    <SpaceShell
      team={team}
      teams={teams}
      title="Automations"
      intro="Une fois par jour, AgentProof relit chaque page suivie et la compare à la veille : scripts tiers (captcha, bandeau cookies), formulaires, boutons et champs. Prix et produits ne comptent pas. Si la page a changé, tu es prévenu ici et par e-mail, et un audit peut repartir tout seul. Avec le suivi mensuel, un audit complet repart tous les 30 jours, et tu reçois une alerte si le score baisse de 10 points ou plus."
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
                      <AutoSubmitSelect name="state" defaultValue={state} label="Mode de l'automation" options={STATES} />
                    </form>
                    <form action="/api/automations" method="post">
                      <input type="hidden" name="action" value="monthly" />
                      <input type="hidden" name="id" value={a.id} />
                      <AutoSubmitSelect name="monthly" defaultValue={a.monthly ? "1" : "0"} label="Suivi mensuel" options={MONTHLY} />
                    </form>
                    <form action="/api/automations" method="post">
                      <input type="hidden" name="action" value="check" />
                      <input type="hidden" name="id" value={a.id} />
                      <button className="type-small font-semibold text-blue hover:underline">Vérifier maintenant</button>
                    </form>
                    <form action="/api/automations" method="post">
                      <input type="hidden" name="action" value="delete" />
                      <input type="hidden" name="id" value={a.id} />
                      <ConfirmButton message={`Ne plus suivre ${a.url} ?`} className="type-small font-semibold text-fail hover:underline">
                        Retirer
                      </ConfirmButton>
                    </form>
                  </div>
                )
              }
              footer={
                !a.enabled
                  ? "Désactivée : aucune vérification."
                  : a.last_checked_at
                    ? `Dernière vérification ${shortDate(a.last_checked_at)}. Prochaine dans les 24 h.${a.monthly ? (a.last_audit_at ? ` Audit mensuel : dernier le ${shortDate(a.last_audit_at)}.` : " Audit mensuel : le premier part dans la minute.") : ""}`
                    : "Première vérification dans la minute : elle enregistre la page de référence."
              }
            >
              {a.automation_checks.length ? (
                a.automation_checks.map((c: any) => {
                  const [tone, label] = CHECK[c.status];
                  return (
                    <Row key={c.id}>
                      <span className="type-small w-28 shrink-0 text-ink-2">{shortDate(c.checked_at)}</span>
                      <span className="inline-flex items-center gap-1.5 font-semibold">
                        <StatusGlyph tone={tone} />
                        {label}
                      </span>
                      {c.detail && <span className="type-small min-w-0 basis-full text-ink-2">{c.detail}</span>}
                      {c.audit_id && (
                        <Link href={`/audit/${c.audit_id}`} className="type-small font-semibold text-blue hover:underline">
                          Voir le nouvel audit
                        </Link>
                      )}
                    </Row>
                  );
                })
              ) : (
                <Row>
                  <span className="text-ink-2">Pas encore vérifiée.</span>
                </Row>
              )}
            </Group>
          );
        })
      ) : (
        <p className="text-ink-2">Aucune page suivie pour le moment.</p>
      )}

      {admin ? (
        <Group title="Suivre des pages" footer="Une URL par ligne : accueil, page produit, panier… Chaque page est vérifiée une fois par jour, sans IA et sans crédit H. Seul l'audit relancé consomme des crédits.">
          <form action="/api/automations" method="post" className="grid gap-4 p-6 sm:p-8">
            <input type="hidden" name="action" value="add" />
            <label className="grid gap-2">
              <span className="type-small text-ink-2">URL des sites de l&apos;entreprise</span>
              <textarea
                name="urls"
                required
                rows={3}
                placeholder={"https://www.exemple.fr\nhttps://www.exemple.fr/panier"}
                spellCheck={false}
                autoCapitalize="none"
                className="w-full rounded-[12px] border border-[#86868b] bg-tile px-4 py-3 text-[17px] focus:border-blue focus:shadow-[0_0_0_4px_rgb(0_113_227/0.3)] focus:outline-none dark:border-line"
              />
            </label>
            <div className="grid gap-2">
              <span className="type-small text-ink-2">Quand une page change</span>
              <div>
                <Segmented name="state" label="Quand une page change" value="notify" options={STATES.slice(0, 2)} />
              </div>
            </div>
            <label className="type-small flex items-start gap-3 rounded-[12px] bg-bg-2 p-4 dark:bg-[#2c2c2e]">
              <input type="checkbox" name="monthly" value="1" className="mt-0.5 h-4 w-4 shrink-0 accent-blue" />
              <span>
                <span className="font-semibold">Suivi mensuel</span>
                <span className="block text-ink-2">Un audit complet tous les 30 jours, et une alerte par e-mail si le score baisse de 10 points ou plus.</span>
              </span>
            </label>
            <div>
              <button className="btn">Activer l&apos;automation</button>
            </div>
          </form>
        </Group>
      ) : (
        <p className="type-small text-ink-2">Seuls le propriétaire et les admins de l&apos;équipe gèrent les automations.</p>
      )}
    </SpaceShell>
  );
}
