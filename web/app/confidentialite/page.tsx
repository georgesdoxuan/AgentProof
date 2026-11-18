import { LEGAL, LEGAL_EN } from "@/lib/legal";
import { getLang } from "@/lib/lang";

export async function generateMetadata() {
  return { title: `${(await getLang()) === "en" ? "Privacy and legal notice" : "Confidentialité et mentions légales"} · AgentProof` };
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mt-12">
    <h2 className="type-h3">{title}</h2>
    <div className="mt-3 space-y-3 text-ink-2">{children}</div>
  </section>
);

export default async function Confidentialite() {
  const lang = await getLang();
  const mail = <a href={`mailto:${LEGAL.contact}`} className="text-link hover:underline">{LEGAL.contact}</a>;
  return (
    <div className="bg-bg-2 pb-24 pt-16 max-[734px]:pt-10">
      <article className="wrap max-w-[760px]">
        {lang === "en" ? (
          <>
        <p className="type-eyebrow text-ink-2">Updated on {LEGAL_EN.updated}</p>
        <h1 className="type-h1 mt-3">Privacy and legal notice.</h1>

        <Section title="Who we are">
          <p>{LEGAL_EN.project}.</p>
          <p>Publisher and data controller: {LEGAL.publisher}. Contact: {mail}.</p>
          <p>Site hosting: {LEGAL_EN.host}.</p>
        </Section>

        <Section title="Data collected">
          <p>
            <b className="text-ink">Your e-mail address</b>, if you sign in or ask to receive a report. It is used to send you the sign-in link, the audit report and your
            team&apos;s invitations. Legal basis: performing the service you ask for.
          </p>
          <p>
            <b className="text-ink">Your team</b>: its name, its members and their roles, and the audits run, with who ran them.
          </p>
          <p>
            <b className="text-ink">A fingerprint of your IP address</b> (hashed, never stored in clear), to limit the number of audits per hour. Legal basis: our legitimate
            interest in protecting the service from abuse.
          </p>
          <p>
            <b className="text-ink">Audit results</b>: address of the tested site, screenshots of the pages the agent saw, verdicts. The screenshots show public sites; the
            agent enters no personal data.
          </p>
          <p>
            No advertising, no trackers, no resale. The only cookies keep your session, your team and your interface language: they are needed for the service.
          </p>
        </Section>

        <Section title="Who processes this data">
          <p>Database and screenshots: Supabase (servers in Paris). Site: Vercel. E-mail sending: Google Workspace, through our n8n server (Contabo, Germany).</p>
          <p>
            AI agent: H Company (France), which opens the tested sites in its cloud browser. Visual judge and fix plan: open-source models through Hugging Face, which receive
            the screenshot and the results, never your e-mail.
          </p>
          <p>The public dataset published on Hugging Face contains the audit results, without e-mails or team data.</p>
        </Section>

        <Section title="Retention">
          <p>
            We keep your data as long as the project is online. Your account, your audits or a screenshot that would show a person are deleted on simple request to {mail},
            within 30 days.
          </p>
        </Section>

        <Section title="Your rights">
          <p>
            You can access, correct, delete or retrieve your data, or object to its processing, by writing to {mail}. If you think your rights are not respected, you can
            contact the CNIL (cnil.fr), the French data protection authority.
          </p>
        </Section>

        <Section title="AI-generated content">
          <p>The fix plan of each report is written by an AI model from the mission results, in French. It is flagged as such on the report.</p>
        </Section>
          </>
        ) : (
          <>
        <p className="type-eyebrow text-ink-2">Mis à jour le {LEGAL.updated}</p>
        <h1 className="type-h1 mt-3">Confidentialité et mentions légales.</h1>

        <Section title="Qui sommes-nous">
          <p>{LEGAL.project}.</p>
          <p>Responsable de la publication et du traitement des données : {LEGAL.publisher}. Contact : {mail}.</p>
          <p>Hébergement du site : {LEGAL.host}.</p>
        </Section>

        <Section title="Données collectées">
          <p>
            <b className="text-ink">Ton adresse e-mail</b>, si tu te connectes ou demandes à recevoir un rapport. Elle sert à t&apos;envoyer le lien de connexion, le rapport
            d&apos;audit et les invitations de ton équipe. Base légale : l&apos;exécution du service que tu demandes.
          </p>
          <p>
            <b className="text-ink">Ton équipe</b> : son nom, ses membres et leurs rôles, et les audits lancés avec qui les a lancés.
          </p>
          <p>
            <b className="text-ink">Une empreinte de ton adresse IP</b> (hachée, jamais stockée en clair), pour limiter le nombre d&apos;audits par heure. Base légale : notre intérêt
            légitime à protéger le service contre les abus.
          </p>
          <p>
            <b className="text-ink">Les résultats des audits</b> : adresse du site testé, captures des pages vues par l&apos;agent, verdicts. Les captures montrent des sites
            publics ; l&apos;agent ne saisit aucune donnée personnelle.
          </p>
          <p>Aucune publicité, aucun traceur, aucune revente. Les seuls cookies servent à garder ta session, ton équipe et ta langue d&apos;interface : ils sont nécessaires au service.</p>
        </Section>

        <Section title="Qui traite ces données">
          <p>Base de données et captures : Supabase (serveurs à Paris). Site : Vercel. Envoi des e-mails : Google Workspace, via notre serveur n8n (Contabo, Allemagne).</p>
          <p>
            Agent IA : H Company (France), qui ouvre les sites testés dans son navigateur cloud. Juge visuel et plan de corrections : modèles open source via Hugging Face,
            qui reçoivent la capture et les résultats, jamais ton e-mail.
          </p>
          <p>Le jeu de données public publié sur Hugging Face contient les résultats des audits, sans e-mail ni donnée d&apos;équipe.</p>
        </Section>

        <Section title="Durée de conservation">
          <p>
            Nous gardons tes données tant que le projet est en ligne. Ton compte, tes audits ou une capture qui montrerait une personne sont supprimés sur simple demande à{" "}
            {mail}, sous 30 jours.
          </p>
        </Section>

        <Section title="Tes droits">
          <p>
            Tu peux accéder à tes données, les corriger, les supprimer, les récupérer ou t&apos;opposer à leur traitement en écrivant à {mail}. Si tu estimes que tes droits ne
            sont pas respectés, tu peux saisir la CNIL (cnil.fr).
          </p>
        </Section>

        <Section title="Contenu généré par IA">
          <p>Le plan de corrections de chaque rapport est rédigé par un modèle d&apos;IA à partir des résultats des missions. Il est signalé comme tel sur le rapport.</p>
        </Section>
          </>
        )}
      </article>
    </div>
  );
}
