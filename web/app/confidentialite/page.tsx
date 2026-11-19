import Link from "next/link";
import { LEGAL, LEGAL_EN } from "@/lib/legal";
import { getLang } from "@/lib/lang";
import { LegalPage, Mail, Section, Table, Val } from "../legal";

export async function generateMetadata() {
  return { title: `${(await getLang()) === "en" ? "Privacy" : "Confidentialité"} · AgentProof` };
}

const a = "text-link hover:underline";

// RGPD art. 13: what is collected, why, on which legal basis, who receives it, for how long, and the user's rights.
// Keep this page in line with the database: every personal field stored must be listed here.
export default async function Confidentialite() {
  const lang = await getLang();
  const v = (x: string | null) => <Val v={x} lang={lang} />;
  const r = LEGAL.retention;
  if (lang === "en")
    return (
      <LegalPage lang={lang} path="/confidentialite" title="Privacy.">
        <Section title="Data controller">
          <p>
            {LEGAL_EN.project}. Controller: {LEGAL.publisher}, contact <Mail />. Data protection contact: {LEGAL.dpo ?? <Mail />}.
          </p>
        </Section>

        <Section title="Data collected, and why">
          <Table
            head={["Data", "Purpose", "Legal basis"]}
            rows={[
              ["E-mail address", "Sign-in link, audit reports, team invitations, alerts you turned on", "Performance of the service"],
              ["Team: name, members and roles, brand name and logo", "Shared team space, white-label reports", "Performance of the service"],
              ["Hashed fingerprint of the IP address (never in clear)", "Limit the number of audits per hour", "Legitimate interest (abuse protection)"],
              ["Audits: tested site, screenshots, replays, verdicts", "The report itself", "Performance of the service"],
              ["Date you accepted the terms", "Proof of consent", "Legal obligation"],
              ["Optional. Team card: holder, e-mail, delivery address, last 4 digits; number, expiry and CVC encrypted", "The real payment test, only when an admin turns it on", "Consent (box ticked when saving the card)"],
              ["Optional. Test account on your site: stored in H Company's vault, we keep only a hint", "Missions run while signed in", "Consent"],
              ["Optional. Slack webhook URL", "Team alerts", "Performance of the service"],
            ]}
          />
          <p>No advertising, no tracker, no audience measurement, no resale. During an audit the agent enters no personal data.</p>
        </Section>

        <Section title="Who receives it">
          <Table
            head={["Processor", "Role", "Location"]}
            rows={[
              ["Supabase", "Database and screenshots", "Paris, France"],
              ["Vercel", "Site hosting", "United States and edge network"],
              ["H Company", "AI agent (cloud browser) and vault of test accounts", "France"],
              ["Hugging Face", "Visual judge and fix plan (screenshot and results, never your e-mail); public dataset without e-mails or team data", "United States and France"],
              ["n8n on Contabo", "E-mail sending and team notifications", "Germany"],
              ["Google Workspace", "E-mail sending", "European Union and United States"],
              ["Slack", "Alerts, only if your team adds a webhook", "United States"],
            ]}
          />
          <p>
            Transfers outside the European Union rely on the European Commission&apos;s standard contractual clauses or the EU-US Data Privacy Framework. Audit of each
            processor&apos;s contract (DPA): {v(null)}.
          </p>
        </Section>

        <Section title="Retention">
          <p>Account and team, after the last sign-in: {v(r.account)}.</p>
          <p>Reports, screenshots and replays: {v(r.audits)}.</p>
          <p>IP fingerprint and sign-in links (15 minutes of validity): {v(r.logs)}.</p>
          <p>Accounting records, once payment is live: {v(r.billing)}.</p>
          <p>Deleting your account removes your data at once (see below). A screenshot that shows a person is removed on request within 30 days.</p>
        </Section>

        <Section title="Your rights">
          <p>
            You can access, correct, delete or download your data, restrict or object to its processing. Download and deletion are one click in{" "}
            <Link href="/espace/reglages/compte" className={a}>
              Account
            </Link>
            ; everything else by writing to <Mail />. You can withdraw a consent at any time (delete the card, unsubscribe from alerts). If you think your rights are not
            respected, you can contact the CNIL (cnil.fr).
          </p>
        </Section>

        <Section title="Minimum age">
          <p>
            AgentProof is a professional service. You must be at least {LEGAL.minAge} to create an account; you confirm it when you sign in. We do not knowingly collect
            data from younger people; if it happens, write to <Mail /> and we delete it.
          </p>
        </Section>

        <Section title="Cookies">
          <p>
            Only cookies needed for the service (session, team, language). Details on the{" "}
            <Link href="/cookies" className={a}>
              cookies page
            </Link>
            .
          </p>
        </Section>

        <Section title="AI-generated content">
          <p>The fix plan of each report is written by an AI model from the mission results. It is flagged as such on the report.</p>
        </Section>
      </LegalPage>
    );
  return (
    <LegalPage lang={lang} path="/confidentialite" title="Confidentialité.">
      <Section title="Responsable du traitement">
        <p>
          {LEGAL.project}. Responsable : {LEGAL.publisher}, contact <Mail />. Référent données personnelles : {LEGAL.dpo ?? <Mail />}.
        </p>
      </Section>

      <Section title="Données collectées, et pourquoi">
        <Table
          head={["Donnée", "Finalité", "Base légale"]}
          rows={[
            ["Adresse e-mail", "Lien de connexion, rapports d’audit, invitations d’équipe, alertes que tu actives", "Exécution du service"],
            ["Équipe : nom, membres et rôles, nom et logo de marque", "Espace d’équipe partagé, rapports en marque blanche", "Exécution du service"],
            ["Empreinte hachée de l’adresse IP (jamais en clair)", "Limiter le nombre d’audits par heure", "Intérêt légitime (protection contre les abus)"],
            ["Audits : site testé, captures, replays, verdicts", "Le rapport lui-même", "Exécution du service"],
            ["Date d’acceptation des conditions", "Preuve du consentement", "Obligation légale"],
            ["Facultatif. Carte d’équipe : titulaire, e-mail, adresse de livraison, 4 derniers chiffres ; numéro, expiration et cryptogramme chiffrés", "Le test de paiement réel, seulement si un admin l’active", "Consentement (case cochée à l’enregistrement)"],
            ["Facultatif. Compte de test sur ton site : gardé dans le coffre de H Company, nous ne gardons qu’un indice", "Missions lancées en étant connecté", "Consentement"],
            ["Facultatif. URL de webhook Slack", "Alertes de l’équipe", "Exécution du service"],
          ]}
        />
        <p>Aucune publicité, aucun traceur, aucune mesure d’audience, aucune revente. Pendant un audit, l’agent ne saisit aucune donnée personnelle.</p>
      </Section>

      <Section title="Qui reçoit ces données">
        <Table
          head={["Sous-traitant", "Rôle", "Localisation"]}
          rows={[
            ["Supabase", "Base de données et captures", "Paris, France"],
            ["Vercel", "Hébergement du site", "États-Unis et réseau mondial"],
            ["H Company", "Agent IA (navigateur cloud) et coffre des comptes de test", "France"],
            ["Hugging Face", "Juge visuel et plan de corrections (capture et résultats, jamais ton e-mail) ; jeu de données public sans e-mail ni donnée d’équipe", "États-Unis et France"],
            ["n8n chez Contabo", "Envoi des e-mails et notifications de l’équipe", "Allemagne"],
            ["Google Workspace", "Envoi des e-mails", "Union européenne et États-Unis"],
            ["Slack", "Alertes, seulement si ton équipe ajoute un webhook", "États-Unis"],
          ]}
        />
        <p>
          Les transferts hors de l’Union européenne reposent sur les clauses contractuelles types de la Commission européenne ou le Data Privacy Framework UE–États-Unis.
          Vérification du contrat de sous-traitance (DPA) de chaque prestataire : {v(null)}.
        </p>
      </Section>

      <Section title="Durée de conservation">
        <p>Compte et équipe, après la dernière connexion : {v(r.account)}.</p>
        <p>Rapports, captures et replays : {v(r.audits)}.</p>
        <p>Empreinte IP et liens de connexion (valables 15 minutes) : {v(r.logs)}.</p>
        <p>Pièces comptables, quand le paiement sera en place : {v(r.billing)}.</p>
        <p>Supprimer ton compte efface tes données tout de suite (voir plus bas). Une capture qui montrerait une personne est retirée sur demande, sous 30 jours.</p>
      </Section>

      <Section title="Tes droits">
        <p>
          Tu peux accéder à tes données, les corriger, les supprimer, les télécharger, limiter leur traitement ou t’y opposer. Le téléchargement et la suppression se font en
          un clic dans{" "}
          <Link href="/espace/reglages/compte" className={a}>
            Compte
          </Link>
          ; le reste en écrivant à <Mail />. Tu peux retirer un consentement à tout moment (supprimer la carte, te désinscrire des alertes). Si tu estimes que tes droits ne
          sont pas respectés, tu peux saisir la CNIL (cnil.fr).
        </p>
      </Section>

      <Section title="Âge minimum">
        <p>
          AgentProof est un service professionnel. Il faut avoir au moins {LEGAL.minAge} ans pour créer un compte ; tu le confirmes à la connexion. Nous ne collectons pas
          sciemment de données de personnes plus jeunes ; si c’est le cas, écris à <Mail /> et nous les supprimons.
        </p>
      </Section>

      <Section title="Cookies">
        <p>
          Seulement des cookies nécessaires au service (session, équipe, langue). Le détail est sur la{" "}
          <Link href="/cookies" className={a}>
            page cookies
          </Link>
          .
        </p>
      </Section>

      <Section title="Contenu généré par IA">
        <p>Le plan de corrections de chaque rapport est rédigé par un modèle d’IA à partir des résultats des missions. Il est signalé comme tel sur le rapport.</p>
      </Section>
    </LegalPage>
  );
}
