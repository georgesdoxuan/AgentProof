import Link from "next/link";
import { LEGAL } from "@/lib/legal";
import { getLang } from "@/lib/lang";

export async function generateMetadata() {
  return { title: `${(await getLang()) === "en" ? "Method" : "Méthode"} · AgentProof` };
}

const Section = ({ title, id, children }: { title: string; id?: string; children: React.ReactNode }) => (
  <section id={id} className="mt-12 scroll-mt-[96px]">
    <h2 className="type-h3">{title}</h2>
    <div className="mt-3 space-y-3 text-ink-2">{children}</div>
  </section>
);

export default async function Methode() {
  const lang = await getLang();
  return (
    <div className="bg-bg-2 pb-24 pt-16 max-[734px]:pt-10">
      <article className="wrap max-w-[760px]">
        {lang === "en" ? (
          <>
        <p className="type-eyebrow text-ink-2">Method</p>
        <h1 className="type-h1 mt-3">How we compute the score.</h1>
        <p className="type-intro mt-5 text-ink-2">
          An AI agent tries to buy on the site like a customer. The score is the share of missions where it reaches the first checkout page.
        </p>

        <Section title="The missions">
          <p>
            Every audit plays the same realistic shopping missions: search and size, browsing through the menu, price filter, colour variant, item on sale. They stay neutral
            on the product type, so they never ask for an item the site does not sell.
          </p>
          <p>
            The agent is Holo, by H Company. It sees the screen, clicks and types like a human, in a cloud browser. It rejects cookies when it can, enters no personal data,
            solves no captcha and never pays.
          </p>
        </Section>

        <Section title="When a mission passes">
          <p>
            A mission passes when the agent reaches the first checkout page: the one after the cart that asks for a sign-in, an e-mail, an address or a payment. The cart
            alone does not count.
          </p>
          <p>
            An independent visual judge (open-source model on Hugging Face) looks at the last screenshot and the mission, without knowing the agent&apos;s opinion. Its verdict
            is the one that counts. If it cannot decide, the mission is &ldquo;unverified&rdquo; and is left out of the score.
          </p>
        </Section>

        <Section title="The score">
          <p>Score = passed missions ÷ verified missions.</p>
          <p>
            An out-of-stock item or an anti-bot block does not count in the score: they are shown separately. In the ranking, a site&apos;s score is the average of its last two
            public runs, to smooth out a mission failed by chance.
          </p>
          <p>
            A failure only counts if it happens again: every failed mission is replayed once before the audit ends, and the second attempt is the one that counts. We do not
            replay what a new attempt would not change: anti-bot, out of stock, account required, mission impossible on the catalogue.
          </p>
        </Section>

        <Section title="The limits">
          <p>
            The agent runs from a datacenter server: some anti-bot sites block it, as they would block a real shopping agent. The agent can also fail because of itself and
            not the site; every mission has its screenshot and step-by-step replay so you can check.
          </p>
          <p>
            Mobile mode uses a phone screen size, without a mobile browser. An audit is a snapshot at a given moment: a site that changes can change score.
          </p>
        </Section>

        <Section title="Next step: the payment" id="paiement">
          <p>
            The score stops at the checkout entrance, on purpose: the agent never pays during an audit. Whether an agent can actually pay is the next question, and we have
            started to measure it in the lab.
          </p>
          <p>
            On 17 November 2026 the agent paid once, with a team virtual card on a €0 account, on 5 sites. On 2 of them (Asphalte and a small online shop) the payment reached
            the bank, which declined it for insufficient funds: with money on the card, the order would have gone through. Elsewhere the agent was stopped before paying: anti-bot
            (Nike), account required (Adidas), payment step not reached (Jules).
          </p>
          <p>
            Next: cards we issue ourselves, declined in real time by our own server, so the proof from the bank is automatic and no 3D Secure has to be approved by hand.
          </p>
        </Section>

        <Section title="Dispute a result">
          <p>
            You run a site in the{" "}
            <Link href="/classement" className="text-link hover:underline">
              ranking
            </Link>{" "}
            and a result looks wrong? Write to{" "}
            <a href={`mailto:${LEGAL.contact}`} className="text-link hover:underline">
              {LEGAL.contact}
            </a>{" "}
            with the report link. We check the screenshot and the replay by hand, then fix or rerun the mission.
          </p>
        </Section>
          </>
        ) : (
          <>
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
          <p>
            Un échec ne compte que s&apos;il se reproduit : chaque mission ratée est rejouée une fois avant la fin de l&apos;audit, et c&apos;est le second essai qui fait foi. On ne
            rejoue pas ce qu&apos;un nouvel essai ne changerait pas : anti-bot, rupture de stock, compte obligatoire, mission impossible sur le catalogue.
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

        <Section title="La suite : le paiement" id="paiement">
          <p>
            Le score s&apos;arrête volontairement à l&apos;entrée du checkout : pendant un audit, l&apos;agent ne paie jamais. Savoir si un agent peut vraiment payer est la
            question suivante, et on a commencé à la mesurer en interne.
          </p>
          <p>
            Le 17 novembre 2026, l&apos;agent a payé une fois, avec une carte virtuelle de l&apos;équipe sur un compte à 0 €, sur 5 sites. Sur 2 d&apos;entre eux (Asphalte et une
            petite boutique en ligne), le paiement est arrivé jusqu&apos;à la banque, qui l&apos;a refusé faute de fonds : avec de l&apos;argent sur la carte, la commande serait
            passée. Ailleurs, l&apos;agent a été arrêté avant de payer : anti-bot (Nike), compte obligatoire (Adidas), étape de paiement non atteinte (Jules).
          </p>
          <p>
            Prochaine étape : des cartes émises par nous, refusées en temps réel par notre serveur, pour que la preuve bancaire soit automatique et qu&apos;aucun 3D Secure ne
            soit validé à la main.
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
          </>
        )}
      </article>
    </div>
  );
}
