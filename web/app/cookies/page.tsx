import Link from "next/link";
import { getLang } from "@/lib/lang";
import { LegalPage, Section, Table } from "../legal";

export async function generateMetadata() {
  return { title: `${(await getLang()) === "en" ? "Cookies" : "Politique cookies"} · AgentProof` };
}

// Every cookie and browser storage key the site sets. Keep in line with lib/auth.ts (ap_session, ap_team), lib/i18n.ts (ap_lang), app/espace/controls.tsx (ap_nav)
// and app/cookie-notice.tsx. Adding a non-essential cookie (analytics, ads) requires a consent banner with a "Refuse" button first.
export default async function Cookies() {
  const lang = await getLang();
  const en = lang === "en";
  const rows = en
    ? [
        ["ap_session", "Keeps you signed in (signed, httpOnly)", "30 days", "Strictly necessary"],
        ["ap_team", "Remembers the team you opened", "30 days", "Strictly necessary"],
        ["ap_lang", "Remembers the interface language you chose", "1 year", "Strictly necessary"],
        ["ap_nav", "Remembers whether the team space sidebar is collapsed", "1 year", "Strictly necessary"],
        ["ap_cookie_notice (browser storage)", "Hides this notice once read", "Until you clear it", "Strictly necessary"],
      ]
    : [
        ["ap_session", "Garde ta session ouverte (signé, httpOnly)", "30 jours", "Strictement nécessaire"],
        ["ap_team", "Retient l’équipe que tu as ouverte", "30 jours", "Strictement nécessaire"],
        ["ap_lang", "Retient la langue d’interface choisie", "1 an", "Strictement nécessaire"],
        ["ap_nav", "Retient si la barre latérale de l’espace est repliée", "1 an", "Strictement nécessaire"],
        ["ap_cookie_notice (stockage du navigateur)", "Masque l’information cookies une fois lue", "Jusqu’à ce que tu l’effaces", "Strictement nécessaire"],
      ];
  return (
    <LegalPage lang={lang} path="/cookies" title={en ? "Cookies." : "Politique cookies."}>
      <Section title={en ? "What we use" : "Ce que nous utilisons"}>
        <Table head={en ? ["Name", "Purpose", "Lifetime", "Type"] : ["Nom", "Finalité", "Durée", "Type"]} rows={rows} />
        <p>
          {en
            ? "No audience measurement, no advertising, no social network button, no third-party cookie. These cookies are needed for the service: under the ePrivacy rules (CNIL guidelines), they do not require your consent, so there is nothing to accept or refuse."
            : "Aucune mesure d’audience, aucune publicité, aucun bouton de réseau social, aucun cookie tiers. Ces cookies sont nécessaires au service : selon les règles ePrivacy (lignes directrices de la CNIL), ils ne demandent pas ton consentement, il n’y a donc rien à accepter ni à refuser."}
        </p>
      </Section>
      <Section title={en ? "If that changes" : "Si cela change"}>
        <p>
          {en
            ? "Before adding any optional cookie, we will ask for your consent with a banner where refusing is as easy as accepting, and update this page."
            : "Avant d’ajouter un cookie facultatif, nous te demanderons ton accord avec un bandeau où refuser est aussi simple qu’accepter, et nous mettrons cette page à jour."}
        </p>
      </Section>
      <Section title={en ? "Deleting them" : "Les supprimer"}>
        <p>
          {en ? "Signing out removes ap_session and ap_team. You can also delete every cookie of the site in your browser settings. More: " : "Te déconnecter supprime ap_session et ap_team. Tu peux aussi effacer tous les cookies du site dans les réglages de ton navigateur. Plus d’infos : "}
          <Link href="/confidentialite" className="text-link hover:underline">
            {en ? "privacy" : "confidentialité"}
          </Link>
          .
        </p>
      </Section>
    </LegalPage>
  );
}
