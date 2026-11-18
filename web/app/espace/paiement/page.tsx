import { redirect } from "next/navigation";
import { canLaunch, teamContext } from "@/lib/auth";
import { cardView } from "@/lib/cards";
import { Field, Group, Row } from "@/lib/ui";
import { getT } from "@/lib/lang";
import { ConfirmButton } from "../controls";
import { SpaceShell } from "../shell";

export async function generateMetadata() {
  const t = await getT();
  return { title: `${t("Moyen de paiement", "Payment method")} · AgentProof` };
}

export default async function Paiement() {
  const ctx = await teamContext();
  if (!ctx) redirect("/connexion?next=/espace/paiement");
  if (!ctx.team) redirect("/espace");
  const { team, teams } = ctx;
  const card = await cardView(team.id);
  const admin = canLaunch(team.role);
  const t = await getT();

  return (
    <SpaceShell narrow
      team={team}
      teams={teams}
      title={t("Moyen de paiement", "Payment method")}
      intro={t(
        "La carte que l'agent utilise pour le test de paiement réel. Il part au plus près du checkout, prend le premier article disponible et paie une seule fois. Avec une carte approvisionnée, la commande est réelle.",
        "The card the agent uses for the real payment test. It starts as close to checkout as it can, takes the first available item and pays only once. With a funded card, the order is real.",
      )}
    >
      {card ? (
        <Group
          title={t("Carte enregistrée", "Saved card")}
          footer={
            card.source === "env"
              ? t("Carte de l'équipe AgentProof, gardée dans la configuration du serveur, jamais en base.", "The AgentProof team's card, kept in the server configuration, never in the database.")
              : t("Numéro, date et cryptogramme chiffrés. Ils ne sont plus jamais affichés.", "Number, date and security code are encrypted. They are never shown again.")
          }
        >
          <Row>
            <span className="type-headline">{card.label}</span>
            <span className="text-ink-2 tnum">•••• {card.last4}</span>
            {card.missing && <span className="type-small text-warn">{t("Non configurée sur ce serveur", "Not configured on this server")}</span>}
          </Row>
          {card.holder && (
            <Row>
              <span className="text-ink-2">{t("Titulaire", "Cardholder")}</span>
              <span>{card.holder}</span>
            </Row>
          )}
          {card.email && (
            <Row>
              <span className="text-ink-2">{t("E-mail de commande", "Order e-mail")}</span>
              <span className="break-all">{card.email}</span>
            </Row>
          )}
          {card.address && (
            <Row>
              <span className="text-ink-2">{t("Livraison", "Delivery")}</span>
              <span>{card.address}</span>
            </Row>
          )}
          {admin && (
            <Row>
              <form action="/api/card" method="post">
                <input type="hidden" name="action" value="delete" />
                <ConfirmButton
                  message={t("Retirer cette carte ? Les tests de paiement ne seront plus possibles.", "Remove this card? Payment tests will no longer be possible.")}
                  className="type-small font-semibold text-fail hover:underline"
                >
                  {t("Retirer la carte", "Remove the card")}
                </ConfirmButton>
              </form>
            </Row>
          )}
        </Group>
      ) : (
        <p className="text-ink-2">{t("Aucune carte enregistrée : le test de paiement n’est pas proposé au lancement d’un audit.", "No saved card: the payment test is not offered when running an audit.")}</p>
      )}

      {admin ? (
        <Group
          title={card ? t("Remplacer la carte", "Replace the card") : t("Ajouter une carte", "Add a card")}
          footer={t("L'agent saisit ces données sur le site testé. Elles transitent par H Company, qui fait tourner l'agent.", "The agent enters this data on the tested site. It goes through H Company, which runs the agent.")}
        >
          <form action="/api/card" method="post" className="grid gap-4 p-6 sm:p-8">
            <Field label={t("Nom de la carte (ex. Carte test boutique)", "Card name (e.g. Shop test card)")} name="label" type="text" />
            <Field label={t("Numéro de carte", "Card number")} name="number" type="text" required />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("Expiration (MM/AA)", "Expiry (MM/YY)")} name="expiry" type="text" required />
              <Field label={t("Cryptogramme", "Security code")} name="cvc" type="text" required />
            </div>
            <Field label={t("Titulaire", "Cardholder")} name="holder" type="text" required />
            <Field label={t("E-mail pour la commande", "E-mail for the order")} name="email" type="email" required />
            <Field label={t("Adresse de livraison", "Delivery address")} name="address" type="text" required />
            <label className="type-small flex items-start gap-3 text-ink-2">
              <input type="checkbox" name="consent" value="1" required className="mt-0.5 h-4 w-4 shrink-0 accent-blue" />
              {t(
                "Je suis autorisé à utiliser cette carte. Je sais qu’un test peut passer une vraie commande sur mon site si la carte a des fonds.",
                "I am authorised to use this card. I know a test can place a real order on my site if the card has funds.",
              )}
            </label>
            <div>
              <button className="btn">{t("Enregistrer la carte", "Save the card")}</button>
            </div>
          </form>
        </Group>
      ) : (
        <p className="type-small text-ink-2">{t("Seuls le propriétaire et les admins de l’équipe gèrent la carte.", "Only the team's owner and admins manage the card.")}</p>
      )}
    </SpaceShell>
  );
}
