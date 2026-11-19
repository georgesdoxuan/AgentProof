import { LEGAL } from "@/lib/legal";
import { getLang } from "@/lib/lang";
import { LegalPage, Mail, Section, Val } from "../legal";

export async function generateMetadata() {
  return { title: `${(await getLang()) === "en" ? "Refunds" : "Remboursements"} · AgentProof` };
}

// Refund policy. The commercial choices (delays, partial refunds) are the team's: shown as "à compléter" until decided.
export default async function Remboursements() {
  const lang = await getLang();
  const v = (x: string | null) => <Val v={x} lang={lang} />;
  if (lang === "en")
    return (
      <LegalPage lang={lang} path="/remboursements" title="Refunds.">
        <Section title="Today">
          <p>Online payment is not open yet. Running an audit costs nothing, so there is nothing to refund.</p>
        </Section>
        <Section title="Full audit (€490 excl. VAT)">
          <p>
            Audit that cannot run to the end because of AgentProof (agent down, internal error): {v(null)}. Refund if the audit is cancelled
            before it starts: {v(null)}. Once the report is delivered: {v(null)}.
          </p>
        </Section>
        <Section title="Monthly tracking (€149 excl. VAT per month)">
          <p>You can stop it at any time from the Automations page: no new month is charged. Month already started: {v(null)}.</p>
        </Section>
        <Section title="Right of withdrawal">
          <p>
            AgentProof is sold to professionals, who have no legal right of withdrawal. If the service is ever sold to consumers, they will have 14 days to withdraw, unless
            they ask for the audit to start before that delay ends and acknowledge they lose that right once it is fully delivered (French Consumer Code, art. L221-28).
            Applies: {v(null)}.
          </p>
        </Section>
        <Section title="How to ask">
          <p>
            Write to <Mail /> with the report link. Answer within {v(null)}; refund on the original payment method within {v(null)}.
          </p>
          <p>Consumer mediator: {v(LEGAL.mediator)}.</p>
        </Section>
      </LegalPage>
    );
  return (
    <LegalPage lang={lang} path="/remboursements" title="Remboursements.">
      <Section title="Aujourd’hui">
        <p>Le paiement en ligne n’est pas encore ouvert. Lancer un audit ne coûte rien : il n’y a donc rien à rembourser.</p>
      </Section>
      <Section title="Audit complet (490 € HT)">
        <p>
          Audit qui ne peut pas aller au bout à cause d’AgentProof (agent indisponible, erreur interne) : {v(null)}. Remboursement si
          l’audit est annulé avant son lancement : {v(null)}. Une fois le rapport livré : {v(null)}.
        </p>
      </Section>
      <Section title="Suivi mensuel (149 € HT par mois)">
        <p>Tu peux l’arrêter à tout moment depuis la page Automatisations : aucun nouveau mois n’est facturé. Mois déjà commencé : {v(null)}.</p>
      </Section>
      <Section title="Droit de rétractation">
        <p>
          AgentProof est vendu à des professionnels, qui n’ont pas de droit de rétractation légal. Si le service est un jour vendu à des particuliers, ils auront 14 jours
          pour se rétracter, sauf s’ils demandent que l’audit commence avant la fin de ce délai et reconnaissent perdre ce droit une fois le service entièrement exécuté
          (Code de la consommation, art. L221-28). S’applique : {v(null)}.
        </p>
      </Section>
      <Section title="Comment demander">
        <p>
          Écris à <Mail /> avec le lien du rapport. Réponse sous {v(null)} ; remboursement sur le moyen de paiement d’origine sous {v(null)}.
        </p>
        <p>Médiateur de la consommation : {v(LEGAL.mediator)}.</p>
      </Section>
    </LegalPage>
  );
}
