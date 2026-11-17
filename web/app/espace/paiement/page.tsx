import { redirect } from "next/navigation";
import { canLaunch, teamContext } from "@/lib/auth";
import { cardView } from "@/lib/cards";
import { Field, Group, Row } from "@/lib/ui";
import { ConfirmButton } from "../controls";
import { SpaceShell } from "../shell";

export const metadata = { title: "Moyen de paiement · AgentProof" };

export default async function Paiement() {
  const ctx = await teamContext();
  if (!ctx) redirect("/connexion?next=/espace/paiement");
  if (!ctx.team) redirect("/espace");
  const { team, teams } = ctx;
  const card = await cardView(team.id);
  const admin = canLaunch(team.role);

  return (
    <SpaceShell
      team={team}
      teams={teams}
      title="Moyen de paiement"
      intro="La carte que l'agent utilise pour le test de paiement réel. Il achète l'article le moins cher de ton site et paie une seule fois. Avec une carte approvisionnée, la commande est réelle."
    >
      {card ? (
        <Group title="Carte enregistrée" footer={card.source === "env" ? "Carte de l'équipe AgentProof, gardée dans la configuration du serveur, jamais en base." : "Numéro, date et cryptogramme chiffrés. Ils ne sont plus jamais affichés."}>
          <Row>
            <span className="type-headline">{card.label}</span>
            <span className="text-ink-2 tnum">•••• {card.last4}</span>
            {card.missing && <span className="type-small text-warn">Non configurée sur ce serveur</span>}
          </Row>
          {card.holder && (
            <Row>
              <span className="text-ink-2">Titulaire</span>
              <span>{card.holder}</span>
            </Row>
          )}
          {card.email && (
            <Row>
              <span className="text-ink-2">E-mail de commande</span>
              <span className="break-all">{card.email}</span>
            </Row>
          )}
          {card.address && (
            <Row>
              <span className="text-ink-2">Livraison</span>
              <span>{card.address}</span>
            </Row>
          )}
          {admin && (
            <Row>
              <form action="/api/card" method="post">
                <input type="hidden" name="action" value="delete" />
                <ConfirmButton message="Retirer cette carte ? Les tests de paiement ne seront plus possibles." className="type-small font-semibold text-fail hover:underline">
                  Retirer la carte
                </ConfirmButton>
              </form>
            </Row>
          )}
        </Group>
      ) : (
        <p className="text-ink-2">Aucune carte enregistrée : le test de paiement n&apos;est pas proposé au lancement d&apos;un audit.</p>
      )}

      {admin ? (
        <Group title={card ? "Remplacer la carte" : "Ajouter une carte"} footer="L'agent saisit ces données sur le site testé. Elles transitent par H Company, qui fait tourner l'agent.">
          <form action="/api/card" method="post" className="grid gap-4 p-6 sm:p-8">
            <Field label="Nom de la carte (ex. Carte test boutique)" name="label" type="text" />
            <Field label="Numéro de carte" name="number" type="text" required />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Expiration (MM/AA)" name="expiry" type="text" required />
              <Field label="Cryptogramme" name="cvc" type="text" required />
            </div>
            <Field label="Titulaire" name="holder" type="text" required />
            <Field label="E-mail pour la commande" name="email" type="email" required />
            <Field label="Adresse de livraison" name="address" type="text" required />
            <label className="type-small flex items-start gap-3 text-ink-2">
              <input type="checkbox" name="consent" value="1" required className="mt-0.5 h-4 w-4 shrink-0 accent-blue" />
              Je suis autorisé à utiliser cette carte. Je sais qu&apos;un test peut passer une vraie commande sur mon site si la carte a des fonds.
            </label>
            <div>
              <button className="btn">Enregistrer la carte</button>
            </div>
          </form>
        </Group>
      ) : (
        <p className="type-small text-ink-2">Seuls le propriétaire et les admins de l&apos;équipe gèrent la carte.</p>
      )}
    </SpaceShell>
  );
}
