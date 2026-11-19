import Link from "next/link";
import { LEGAL } from "@/lib/legal";
import { getLang } from "@/lib/lang";
import { LegalPage, Mail, Section, Val } from "../legal";

export async function generateMetadata() {
  return { title: `${(await getLang()) === "en" ? "Terms of use and sale" : "Conditions d’utilisation et de vente"} · AgentProof` };
}

const a = "text-link hover:underline";

// CGU (use of the site) and CGV (paid offers). Prices must match the Pricing section of the home page.
export default async function Conditions() {
  const lang = await getLang();
  const v = (x: string | null) => <Val v={x} lang={lang} />;
  if (lang === "en")
    return (
      <LegalPage lang={lang} path="/conditions" title="Terms of use and sale.">
        <Section title="1. The service">
          <p>
            AgentProof sends an AI agent (Holo, by H Company) to try to buy on an e-commerce site, then gives a score, screenshots, replays and a fix plan. How the score is
            computed is described on the{" "}
            <Link href="/methode" className={a}>
              Method
            </Link>{" "}
            page.
          </p>
          <p>
            During an audit the agent stops at the first checkout page: it never pays, enters no personal data and solves no captcha. The real payment test is separate,
            optional, turned on by a team admin, and only uses the card that team saved.
          </p>
        </Section>
        <Section title="2. Account">
          <p>
            You sign in with a link sent by e-mail. You must be at least {LEGAL.minAge} and use AgentProof for a professional purpose. You accept these terms and the{" "}
            <Link href="/confidentialite" className={a}>
              privacy policy
            </Link>{" "}
            when you sign in. You can delete your account at any time from the Account page.
          </p>
        </Section>
        <Section title="3. What you may test">
          <p>
            Only a site you run or are authorised to test. A competitor audit only visits public pages, like an ordinary visitor, and stops before payment. It is forbidden to
            use AgentProof to overload a site, get round its protections, or collect personal data.
          </p>
        </Section>
        <Section title="4. Results">
          <p>
            The score is a measurement of the missions run on a given day, on a given device, with a given AI model. It is not a guarantee of sales nor of how other agents
            behave. The fix plan is written by an AI model and must be checked before being applied.
          </p>
        </Section>
        <Section title="5. Prices and payment">
          <p>
            Prices in the Pricing section exclude VAT: ranking free; full audit €490 per site; monthly tracking €149 per month; agencies 30 % commission on every audit
            resold, under a separate agreement. Online payment is not open yet: until it is, running an audit costs nothing and no amount is charged without a quote
            accepted in writing.
          </p>
          <p>
            Monthly tracking renews every month and can be stopped at any time from the Automations page. What happens to the month already started: {v(null)}. Applicable VAT rate and
            invoicing terms: {v(null)}.
          </p>
        </Section>
        <Section title="6. Right of withdrawal and refunds">
          <p>
            See the{" "}
            <Link href="/remboursements" className={a}>
              refunds
            </Link>{" "}
            page.
          </p>
        </Section>
        <Section title="7. Liability">
          <p>
            AgentProof is a student project in development, provided as is. We do our best to keep it available and accurate but cannot guarantee it. Liability cap for paid
            offers: {v(null)}.
          </p>
        </Section>
        <Section title="8. Applicable law and disputes">
          <p>
            French law. In case of a dispute, write first to <Mail /> to find an amicable solution. Consumer mediator: {v(LEGAL.mediator)}. Competent court: {v(null)}.
          </p>
        </Section>
      </LegalPage>
    );
  return (
    <LegalPage lang={lang} path="/conditions" title="Conditions d’utilisation et de vente.">
      <Section title="1. Le service">
        <p>
          AgentProof envoie un agent IA (Holo, de H Company) essayer d’acheter sur un site e-commerce, puis donne un score, des captures, des replays et un plan de
          corrections. Le calcul du score est décrit sur la page{" "}
          <Link href="/methode" className={a}>
            Méthode
          </Link>
          .
        </p>
        <p>
          Pendant un audit, l’agent s’arrête à la première page du checkout : il ne paie jamais, ne saisit aucune donnée personnelle et ne résout aucun captcha. Le test de
          paiement réel est à part, facultatif, activé par un admin de l’équipe, et n’utilise que la carte enregistrée par cette équipe.
        </p>
      </Section>
      <Section title="2. Compte">
        <p>
          Tu te connectes avec un lien reçu par e-mail. Il faut avoir au moins {LEGAL.minAge} ans et utiliser AgentProof dans un cadre professionnel. Tu acceptes ces
          conditions et la{" "}
          <Link href="/confidentialite" className={a}>
            politique de confidentialité
          </Link>{" "}
          à la connexion. Tu peux supprimer ton compte à tout moment depuis la page Compte.
        </p>
      </Section>
      <Section title="3. Ce que tu peux tester">
        <p>
          Uniquement un site que tu gères ou que tu es autorisé à tester. L’audit d’un concurrent ne visite que des pages publiques, comme un visiteur ordinaire, et
          s’arrête avant le paiement. Il est interdit d’utiliser AgentProof pour surcharger un site, contourner ses protections ou collecter des données personnelles.
        </p>
      </Section>
      <Section title="4. Résultats">
        <p>
          Le score est la mesure des missions lancées un jour donné, sur un appareil donné, avec un modèle d’IA donné. Ce n’est pas une garantie de ventes ni du
          comportement d’autres agents. Le plan de corrections est rédigé par un modèle d’IA et doit être vérifié avant d’être appliqué.
        </p>
      </Section>
      <Section title="5. Prix et paiement">
        <p>
          Les prix de la section Tarifs sont hors taxes : classement gratuit ; audit complet 490 € par site ; suivi mensuel 149 € par mois ; agences 30 % de commission sur
          chaque audit revendu, selon un contrat à part. Le paiement en ligne n’est pas encore ouvert : d’ici là, lancer un audit ne coûte rien et aucun montant n’est
          facturé sans devis accepté par écrit.
        </p>
        <p>
          Le suivi mensuel se renouvelle chaque mois et s’arrête à tout moment depuis la page Automatisations. Sort du mois commencé : {v(null)}. Taux de TVA applicable et
          modalités de facturation : {v(null)}.
        </p>
      </Section>
      <Section title="6. Rétractation et remboursements">
        <p>
          Voir la page{" "}
          <Link href="/remboursements" className={a}>
            remboursements
          </Link>
          .
        </p>
      </Section>
      <Section title="7. Responsabilité">
        <p>
          AgentProof est un projet étudiant en développement, fourni en l’état. Nous faisons de notre mieux pour qu’il soit disponible et exact, sans pouvoir le garantir.
          Plafond de responsabilité pour les offres payantes : {v(null)}.
        </p>
      </Section>
      <Section title="8. Droit applicable et litiges">
        <p>
          Droit français. En cas de litige, écris d’abord à <Mail /> pour trouver une solution amiable. Médiateur de la consommation : {v(LEGAL.mediator)}. Tribunal
          compétent : {v(null)}.
        </p>
      </Section>
    </LegalPage>
  );
}
