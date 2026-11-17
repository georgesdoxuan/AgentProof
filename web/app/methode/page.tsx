import Link from "next/link";
import { LEGAL } from "@/lib/legal";

export const metadata = { title: "Méthode · AgentProof" };

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mt-12">
    <h2 className="type-h3">{title}</h2>
    <div className="mt-3 space-y-3 text-ink-2">{children}</div>
  </section>
);

export default function Methode() {
  return (
    <div className="bg-bg-2 pb-24 pt-16 max-[734px]:pt-10">
      <article className="wrap max-w-[760px]">
        <p className="type-eyebrow text-ink-2">Méthode</p>
        <h1 className="type-h1 mt-3">Comment on calcule le score.</h1>
        <p className="type-intro mt-5 text-ink-2">
          Un agent IA essaie d&apos;acheter sur le site comme un client. Le score est la part des missions où il atteint la première page du checkout.
        </p>

        <Section title="Les missions">
          <p>
            Chaque audit joue les mêmes missions d&apos;achat réalistes : recherche et taille, navigation par le menu, filtre de prix, variante de couleur, article en promotion.
            Elles restent neutres sur le type de produit, pour ne jamais demander un article que le site ne vend pas.
          </p>
          <p>
            L&apos;agent est Holo, de H Company. Il voit l&apos;écran, clique et tape comme un humain, dans un navigateur cloud. Il refuse les cookies quand c&apos;est possible, ne
            saisit aucune donnée personnelle, ne résout aucun captcha et ne paie jamais.
          </p>
        </Section>

        <Section title="Quand une mission est réussie">
          <p>
            Une mission est réussie quand l&apos;agent atteint la première page du checkout : celle qui suit le panier et demande une connexion, un e-mail, une adresse ou un
            paiement. Le panier seul ne compte pas.
          </p>
          <p>
            Un juge visuel indépendant (modèle open source sur Hugging Face) regarde la dernière capture et la mission, sans connaître l&apos;avis de l&apos;agent. C&apos;est son
            verdict qui compte. S&apos;il ne peut pas se prononcer, la mission est « non vérifiée » et sort du score.
          </p>
        </Section>

        <Section title="Le score">
          <p>Score = missions réussies ÷ missions vérifiées.</p>
          <p>
            Une rupture de stock ou un blocage anti-bot ne compte pas dans le score : ils sont affichés à part. Dans le classement, le score d&apos;un site est la moyenne de ses
            deux derniers passages publics, pour lisser une mission ratée par hasard.
          </p>
        </Section>

        <Section title="Les limites">
          <p>
            L&apos;agent part d&apos;un serveur de datacenter : certains sites anti-bot le bloquent, comme ils bloqueraient un vrai agent d&apos;achat. L&apos;agent peut aussi
            échouer à cause de lui-même et pas du site ; chaque mission a sa capture et son replay pas à pas pour le vérifier.
          </p>
          <p>
            Le mode mobile utilise une taille d&apos;écran de téléphone, sans navigateur mobile. Un audit est une photo à un instant donné : un site qui change peut changer de
            score.
          </p>
        </Section>

        <Section title="Contester un résultat">
          <p>
            Tu gères un site du{" "}
            <Link href="/classement" className="text-link hover:underline">
              classement
            </Link>{" "}
            et un résultat te semble faux ? Écris à{" "}
            <a href={`mailto:${LEGAL.contact}`} className="text-link hover:underline">
              {LEGAL.contact}
            </a>{" "}
            avec le lien du rapport. On vérifie la capture et le replay à la main, puis on corrige ou on relance la mission.
          </p>
        </Section>
      </article>
    </div>
  );
}
