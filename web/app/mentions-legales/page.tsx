import { LEGAL, LEGAL_EN } from "@/lib/legal";
import { getLang } from "@/lib/lang";
import { LegalPage, Mail, Section, Val } from "../legal";

export async function generateMetadata() {
  return { title: `${(await getLang()) === "en" ? "Legal notice" : "Mentions légales"} · AgentProof` };
}

// LCEN art. 6-III: who publishes the site, who is responsible for it, who hosts it.
export default async function MentionsLegales() {
  const lang = await getLang();
  const v = (x: string | null) => <Val v={x} lang={lang} />;
  if (lang === "en")
    return (
      <LegalPage lang={lang} path="/mentions-legales" title="Legal notice.">
        <Section title="Publisher">
          <p>{LEGAL_EN.project}.</p>
          <p>Company name and legal form: {v(LEGAL.company)}. Share capital: {v(LEGAL.capital)}.</p>
          <p>Registered office: {v(LEGAL.address)}.</p>
          <p>Company registration (RCS / SIRET): {v(LEGAL.siret)}. EU VAT number: {v(LEGAL.vat)}.</p>
          <p>
            Contact: <Mail />. Phone: {v(LEGAL.phone)}.
          </p>
        </Section>
        <Section title="Publication director">
          <p>{LEGAL.publisher}.</p>
        </Section>
        <Section title="Hosting">
          <p>Site: {LEGAL_EN.host}.</p>
          <p>Database and screenshots: Supabase Inc., servers in Paris (eu-west-3), supabase.com.</p>
        </Section>
        <Section title="Intellectual property">
          <p>
            The AgentProof name, logo, texts and interface belong to their authors. Screenshots in reports show third-party public sites, which remain the property of
            their owners; they are shown as evidence of a test. Fonts and images used: see Credits.
          </p>
        </Section>
        <Section title="Report a content">
          <p>
            To ask for a screenshot, a report or any content to be removed, write to <Mail />.
          </p>
        </Section>
      </LegalPage>
    );
  return (
    <LegalPage lang={lang} path="/mentions-legales" title="Mentions légales.">
      <Section title="Éditeur">
        <p>{LEGAL.project}.</p>
        <p>Raison sociale et forme juridique : {v(LEGAL.company)}. Capital social : {v(LEGAL.capital)}.</p>
        <p>Siège social : {v(LEGAL.address)}.</p>
        <p>RCS / SIRET : {v(LEGAL.siret)}. N° de TVA intracommunautaire : {v(LEGAL.vat)}.</p>
        <p>
          Contact : <Mail />. Téléphone : {v(LEGAL.phone)}.
        </p>
      </Section>
      <Section title="Directeur de la publication">
        <p>{LEGAL.publisher}.</p>
      </Section>
      <Section title="Hébergement">
        <p>Site : {LEGAL.host}.</p>
        <p>Base de données et captures : Supabase Inc., serveurs à Paris (eu-west-3), supabase.com.</p>
      </Section>
      <Section title="Propriété intellectuelle">
        <p>
          Le nom, le logo, les textes et l’interface d’AgentProof appartiennent à leurs auteurs. Les captures des rapports montrent des sites publics tiers, qui restent la
          propriété de leurs éditeurs ; elles sont affichées comme preuve d’un test. Polices et images utilisées : voir Crédits.
        </p>
      </Section>
      <Section title="Signaler un contenu">
        <p>
          Pour demander le retrait d’une capture, d’un rapport ou de tout contenu, écris à <Mail />.
        </p>
      </Section>
    </LegalPage>
  );
}
