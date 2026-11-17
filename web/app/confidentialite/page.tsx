import { LEGAL } from "@/lib/legal";

export const metadata = { title: "Confidentialité et mentions légales · AgentProof" };

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mt-12">
    <h2 className="type-h3">{title}</h2>
    <div className="mt-3 space-y-3 text-ink-2">{children}</div>
  </section>
);

export default function Confidentialite() {
  const mail = <a href={`mailto:${LEGAL.contact}`} className="text-link hover:underline">{LEGAL.contact}</a>;
  return (
    <div className="bg-bg-2 pb-24 pt-16 max-[734px]:pt-10">
      <article className="wrap max-w-[760px]">
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
          <p>Aucune publicité, aucun traceur, aucune revente. Les seuls cookies servent à garder ta session et ton équipe actives : ils sont nécessaires au service.</p>
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
      </article>
    </div>
  );
}
