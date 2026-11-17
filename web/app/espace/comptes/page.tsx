import { redirect } from "next/navigation";
import { canLaunch, teamContext } from "@/lib/auth";
import { listSiteLogins } from "@/lib/engine";
import { Field, Group, Row } from "@/lib/ui";
import { ConfirmButton } from "../controls";
import { SpaceShell } from "../shell";

export const metadata = { title: "Comptes de test · AgentProof" };

export default async function Comptes() {
  const ctx = await teamContext();
  if (!ctx) redirect("/connexion?next=/espace/comptes");
  if (!ctx.team) redirect("/espace");
  const { team, teams } = ctx;
  const logins = await listSiteLogins(team.id);
  const admin = canLaunch(team.role);

  return (
    <SpaceShell
      team={team}
      teams={teams}
      title="Comptes de test"
      intro="Pour les sites qui exigent un compte avant de payer. Avec un compte enregistré, le test de paiement tourne deux fois : sans compte, puis connecté."
    >
      {logins.length ? (
        <Group title="Comptes enregistrés" footer="Les mots de passe sont rangés dans un coffre-fort chez H Company. AgentProof ne les stocke pas et l'agent ne les voit jamais : il les remplit sur le site sans les lire.">
          {logins.map((l) => (
            <Row key={l.id}>
              <span className="type-headline">{l.sites.domain}</span>
              <span className="text-ink-2">{l.login_hint}</span>
              {admin && (
                <form action="/api/logins" method="post">
                  <input type="hidden" name="action" value="delete" />
                  <input type="hidden" name="id" value={l.id} />
                  <ConfirmButton message={`Retirer le compte de test de ${l.sites.domain} ?`} className="type-small font-semibold text-fail hover:underline">
                    Retirer
                  </ConfirmButton>
                </form>
              )}
            </Row>
          ))}
        </Group>
      ) : (
        <p className="text-ink-2">Aucun compte de test : sur un site qui exige un compte, le test de paiement s&apos;arrête à la connexion.</p>
      )}

      {admin ? (
        <Group title="Ajouter un compte" footer="Crée d'abord le compte toi-même sur le site, avec une adresse de test. Un compte par site : en ajouter un nouveau remplace l'ancien.">
          <form action="/api/logins" method="post" className="grid gap-4 p-6 sm:p-8">
            <Field label="Site (ex. adidas.fr)" name="site" type="text" required />
            <Field label="E-mail ou identifiant du compte" name="login" type="text" required />
            <Field label="Mot de passe" name="password" type="password" required />
            <label className="type-small flex items-start gap-3 text-ink-2">
              <input type="checkbox" name="consent" value="1" required className="mt-0.5 h-4 w-4 shrink-0 accent-blue" />
              Ce compte m&apos;appartient et sert uniquement aux tests. L&apos;agent peut s&apos;y connecter et passer commande avec la carte de l&apos;équipe.
            </label>
            <div>
              <button className="btn">Enregistrer le compte</button>
            </div>
          </form>
        </Group>
      ) : (
        <p className="type-small text-ink-2">Seuls le propriétaire et les admins de l&apos;équipe gèrent les comptes de test.</p>
      )}
    </SpaceShell>
  );
}
