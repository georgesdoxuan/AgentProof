import { redirect } from "next/navigation";
import { canLaunch, teamContext } from "@/lib/auth";
import { listSiteLogins } from "@/lib/engine";
import { Field, Group, Row } from "@/lib/ui";
import { getT } from "@/lib/lang";
import { ConfirmButton } from "../controls";
import { SpaceShell } from "../shell";

export async function generateMetadata() {
  const t = await getT();
  return { title: `${t("Comptes de test", "Test accounts")} · AgentProof` };
}

export default async function Comptes() {
  const ctx = await teamContext();
  if (!ctx) redirect("/connexion?next=/espace/comptes");
  if (!ctx.team) redirect("/espace");
  const { team, teams } = ctx;
  const logins = await listSiteLogins(team.id);
  const admin = canLaunch(team.role);
  const t = await getT();

  return (
    <SpaceShell
      team={team}
      teams={teams}
      title={t("Comptes de test", "Test accounts")}
      intro={t(
        "Pour les sites qui exigent un compte avant de payer. Avec un compte enregistré, le test de paiement tourne deux fois : sans compte, puis connecté.",
        "For sites that require an account before paying. With a saved account, the payment test runs twice: without an account, then signed in.",
      )}
    >
      {logins.length ? (
        <Group
          title={t("Comptes enregistrés", "Saved accounts")}
          footer={t(
            "Les mots de passe sont rangés dans un coffre-fort chez H Company. AgentProof ne les stocke pas et l'agent ne les voit jamais : il les remplit sur le site sans les lire.",
            "Passwords are kept in a vault at H Company. AgentProof does not store them and the agent never sees them: it fills them in on the site without reading them.",
          )}
        >
          {logins.map((l) => (
            <Row key={l.id}>
              <span className="type-headline">{l.sites.domain}</span>
              <span className="text-ink-2">{l.login_hint}</span>
              {admin && (
                <form action="/api/logins" method="post">
                  <input type="hidden" name="action" value="delete" />
                  <input type="hidden" name="id" value={l.id} />
                  <ConfirmButton message={t(`Retirer le compte de test de ${l.sites.domain} ?`, `Remove the test account for ${l.sites.domain}?`)} className="type-small font-semibold text-fail hover:underline">
                    {t("Retirer", "Remove")}
                  </ConfirmButton>
                </form>
              )}
            </Row>
          ))}
        </Group>
      ) : (
        <p className="text-ink-2">{t("Aucun compte de test : sur un site qui exige un compte, le test de paiement s’arrête à la connexion.", "No test account: on a site that requires an account, the payment test stops at sign-in.")}</p>
      )}

      {admin ? (
        <Group
          title={t("Ajouter un compte", "Add an account")}
          footer={t(
            "Crée d'abord le compte toi-même sur le site, avec une adresse de test. Un compte par site : en ajouter un nouveau remplace l'ancien.",
            "First create the account yourself on the site, with a test address. One account per site: adding a new one replaces the old one.",
          )}
        >
          <form action="/api/logins" method="post" className="grid gap-4 p-6 sm:p-8">
            <Field label={t("Site (ex. adidas.fr)", "Site (e.g. adidas.fr)")} name="site" type="text" required />
            <Field label={t("E-mail ou identifiant du compte", "Account e-mail or username")} name="login" type="text" required />
            <Field label={t("Mot de passe", "Password")} name="password" type="password" required />
            <label className="type-small flex items-start gap-3 text-ink-2">
              <input type="checkbox" name="consent" value="1" required className="mt-0.5 h-4 w-4 shrink-0 accent-blue" />
              {t(
                "Ce compte m’appartient et sert uniquement aux tests. L’agent peut s’y connecter et passer commande avec la carte de l’équipe.",
                "This account is mine and is used only for tests. The agent can sign in to it and place an order with the team's card.",
              )}
            </label>
            <div>
              <button className="btn">{t("Enregistrer le compte", "Save the account")}</button>
            </div>
          </form>
        </Group>
      ) : (
        <p className="type-small text-ink-2">{t("Seuls le propriétaire et les admins de l’équipe gèrent les comptes de test.", "Only the team's owner and admins manage test accounts.")}</p>
      )}
    </SpaceShell>
  );
}
