import Link from "next/link";
import { connection } from "next/server";
import { currentUser } from "@/lib/auth";
import { isJury, JURY_AUDITS, JURY_PAYMENTS } from "@/lib/jury";
import { getT } from "@/lib/lang";

export async function generateMetadata() {
  const t = await getT();
  return { title: `${t("Démo jury", "Jury demo")} · AgentProof`, robots: { index: false } };
}

const ERRORS: Record<string, [string, string]> = {
  fermee: ["L'espace de démonstration n'est pas ouvert pour l'instant. Écris-nous : gdo@eugeniaschool.com.", "The demo space is not open right now. Write to us: gdo@eugeniaschool.com."],
  trop: ["Beaucoup d'entrées dans la démo cette heure-ci. Réessaie dans quelques minutes.", "Many demo entries this hour. Try again in a few minutes."],
  technique: ["L'entrée dans la démo a échoué de notre côté. Réessaie dans un instant.", "Entering the demo failed on our side. Try again in a moment."],
};

// The judges' door to the prototype: what they will see, the three things to try, one button. No e-mail, no password:
// the button (POST /api/auth/demo) opens a fresh judge account in the jury demo space, apart from every real team.
export default async function Demo({ searchParams }: { searchParams: Promise<{ erreur?: string }> }) {
  await connection();
  const { erreur } = await searchParams;
  const t = await getT();
  const me = await currentUser();
  const back = !!me && isJury(me.email);
  const error = erreur ? ERRORS[erreur] : undefined;
  const steps: [string, string][] = [
    [
      t("Ouvre un rapport d'exemple", "Open a sample report"),
      t(
        "Dans Rapports, tous nos audits : par exemple waterdrop.fr où l'agent réussit ses 5 missions et pousse le paiement jusqu'au 3D Secure, nike.com où un anti-bot l'arrête, promod.fr en version précise. Score, blocages, captures et recommandations.",
        "In Reports, all our audits: for example waterdrop.fr where the agent passes its 5 missions and takes payment up to 3D Secure, nike.com where an anti-bot stops it, promod.fr on the precise agent. Score, blockers, screenshots and recommendations.",
      ),
    ],
    [
      t("Regarde l'agent travailler", "Watch the agent work"),
      t(
        "Dans un rapport, « Replay » rejoue une mission étape par étape. La page Corrections liste ce qu'il faut réparer, site par site ; tu peux cocher une correction.",
        "In a report, “Replay” plays a mission back step by step. The Corrections page lists what to fix, site by site; you can tick a fix.",
      ),
    ],
    [
      t("Lance ton propre audit", "Run your own audit"),
      t(
        `« Lancer un audit » sur la boutique de ton choix : ${JURY_AUDITS} audits par juge, 5 à 10 minutes chacun, sans paiement ni donnée personnelle. En plus, ${JURY_PAYMENTS} test de paiement réel par juge avec la carte de démo, à solde nul : l'agent va jusqu'à la banque, qui refuse. Un compte de test (Réglages › Comptes de test) lui permet de se connecter avant de payer.`,
        `“Run an audit” on the store of your choice: ${JURY_AUDITS} audits per judge, 5 to 10 minutes each, with no payment and no personal data. On top, ${JURY_PAYMENTS} real payment test per judge with the zero-balance demo card: the agent goes as far as the bank, which declines. A test account (Settings › Test accounts) lets it sign in before paying.`,
      ),
    ],
  ];

  return (
    <div className="bg-bg-2 pb-24 pt-20 max-[734px]:pt-12">
      <div className="mx-auto w-[min(692px,87.5%)]">
        <p className="type-small font-semibold text-ink-2">{t("Hackathon H Company × Hugging Face · Groupe 6", "H Company × Hugging Face hackathon · Group 6")}</p>
        <h1 className="type-h1 mt-2">{t("Testez AgentProof en direct.", "Try AgentProof live.")}</h1>
        <p className="type-intro mt-5 text-ink-2">
          {t(
            "Un espace de démonstration rien que pour le jury, avec une copie de tous nos rapports. Aucun e-mail ni mot de passe : un clic et vous y êtes.",
            "A demo space for the jury only, with a copy of all our reports. No e-mail, no password: one click and you are in.",
          )}
        </p>

        {error && (
          <p role="alert" className="type-small mt-8 rounded-[12px] bg-tile px-4 py-3 text-fail shadow-[inset_0_0_0_0.5px_var(--line)]">
            {t(...error)}
          </p>
        )}

        <ol className="mt-10 overflow-hidden rounded-[18px] bg-tile">
          {steps.map(([title, text], i) => (
            <li key={i} className="flex gap-4 border-b border-hairline px-6 py-5 last:border-0 max-[734px]:px-5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-fill text-[15px] font-semibold tabular-nums">{i + 1}</span>
              <span className="min-w-0">
                <span className="block font-semibold">{title}</span>
                <span className="type-small mt-1 block text-ink-2">{text}</span>
              </span>
            </li>
          ))}
        </ol>

        <form action="/api/auth/demo" method="post" className="mt-8">
          <button className="btn min-h-[52px] w-full rounded-[12px]">{back ? t("Revenir dans la démo", "Back to the demo") : t("Entrer dans la démo", "Enter the demo")}</button>
        </form>
        <p className="type-small mt-4 text-ink-2">
          {t(
            "Dans la démo, la carte, les membres, les automatisations et la corbeille ne se modifient pas. Le classement public reste ouvert à tous : ",
            "In the demo, the card, members, automations and trash cannot be changed. The public ranking stays open to all: ",
          )}
          <Link href="/classement" className="text-link hover:underline">{t("voir le classement", "see the ranking")}</Link>.
        </p>
      </div>
    </div>
  );
}
