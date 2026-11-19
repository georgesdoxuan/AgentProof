import { isJury } from "@/lib/jury";
import { JuryLockedPage } from "../../jury-locked";
import { redirect } from "next/navigation";
import { canLaunch, teamContext } from "@/lib/auth";
import { listSiteLogins } from "@/lib/engine";
import { Chip, Columns, Empty, Field, Group, Note, Row } from "@/lib/ui";
import { getT } from "@/lib/lang";
import { ConfirmButton } from "../../controls";
import { SpaceShell } from "../../shell";
import { SiteLogo } from "../../../site-logo";

export async function generateMetadata() {
  const t = await getT();
  return { title: `${t("Comptes de test", "Test accounts")} · AgentProof` };
}

export default async function Comptes({ searchParams }: { searchParams: Promise<{ site?: string }> }) {
  const ctx = await teamContext();
  if (!ctx) redirect("/connexion?next=/espace/reglages/comptes");
  if (!ctx.team) redirect("/espace");
  if (isJury(ctx.user.email)) return <JuryLockedPage />;
  const { team } = ctx;
  const logins = await listSiteLogins(team.id);
  // From the launch form's "Add an account": the site being audited, already filled in.
  const site = String((await searchParams).site ?? "").slice(0, 200);
  const admin = canLaunch(team.role);
  const t = await getT();

  return (
    <SpaceShell
      settings
      hint={t(
        "Pour les sites qui exigent un compte avant de payer. Au lancement d’un test de paiement, tu choisis : sans compte, ou connecté avec l’un de ces comptes.",
        "For sites that require an account before paying. When you run a payment test, you choose: without an account, or signed in with one of these accounts.",
      )}
    >
      <Columns
        main={<>
      {logins.length ? (
        <Group
          icon="key"
          title={t("Comptes enregistrés", "Saved accounts")}
          aside={<Chip icon="lock">{t("Coffre H Company", "H Company vault")}</Chip>}
          footer={t(
            "Les mots de passe sont rangés dans un coffre-fort chez H Company. AgentProof ne les stocke pas et l'agent ne les voit jamais : il les remplit sur le site sans les lire.",
            "Passwords are kept in a vault at H Company. AgentProof does not store them and the agent never sees them: it fills them in on the site without reading them.",
          )}
        >
          {logins.map((l) => (
            <Row key={l.id}>
              <span className="type-headline flex items-center gap-3">
                <SiteLogo domain={l.sites.domain} name={l.sites.domain} />
                {l.sites.domain}
              </span>
              <span className="min-w-0 truncate">
                {l.label && <span className="font-semibold">{l.label} · </span>}
                <span className="text-ink-2">{l.login_hint}</span>
              </span>
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
        <Empty icon="login_required" title={t("Aucun compte de test", "No test account")}>
          {t("Sans compte, le test s’arrête à la connexion.", "Without one, the test stops at sign-in.")}
        </Empty>
      )}

        </>}
        side={<>
      {admin ? (
        <Group
          icon="plus"
          title={t("Ajouter un compte", "Add an account")}
          aside={<Chip icon="key">{t("Plusieurs par site", "Several per site")}</Chip>}
          footer={t(
            "Crée d'abord le compte toi-même sur le site, avec une adresse de test. Tu peux en enregistrer plusieurs par site (client fidèle, nouveau client…) : un nom aide à les distinguer au lancement.",
            "First create the account yourself on the site, with a test address. You can save several per site (loyal customer, new customer…): a name helps tell them apart at launch.",
          )}
        >
          <form action="/api/logins" method="post" className="grid gap-4 p-5 sm:p-6">
            <Field label={t("Site (ex. adidas.fr)", "Site (e.g. adidas.fr)")} name="site" type="text" required defaultValue={site || undefined} />
            <Field label={t("Nom du compte (facultatif)", "Account name (optional)")} name="label" type="text" />
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
        <Note icon="eye">{t("Lecture seule : un admin gère les comptes.", "Read-only: an admin manages the accounts.")}</Note>
      )}
        </>}
      />
    </SpaceShell>
  );
}
