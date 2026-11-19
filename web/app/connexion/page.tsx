import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser, safeNext } from "@/lib/auth";
import { Chip, Chips, Field } from "@/lib/ui";
import { getT } from "@/lib/lang";
import { LEGAL } from "@/lib/legal";

export async function generateMetadata() {
  const t = await getT();
  return { title: `${t("Connexion", "Sign in")} · AgentProof` };
}

const ERRORS: Record<string, [string, string]> = {
  email: ["Adresse e-mail invalide.", "Invalid e-mail address."],
  trop: ["Trop de liens demandés. Réessaie dans 15 minutes.", "Too many links requested. Try again in 15 minutes."],
  envoi: ["L'e-mail n'a pas pu partir. Réessaie dans un instant.", "The e-mail could not be sent. Try again in a moment."],
  lien: ["Ce lien a expiré ou a déjà servi. Demande un nouveau lien.", "This link has expired or was already used. Ask for a new link."],
  accord: ["Coche la case pour accepter les conditions et confirmer ton âge.", "Tick the box to accept the terms and confirm your age."],
};

type Search = { token?: string; envoye?: string; erreur?: string; next?: string; email?: string };

export default async function Connexion({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const t = await getT();
  const next = safeNext(sp.next);
  if (!sp.token && (await currentUser())) redirect(next);

  return (
    <div className="bg-bg-2 py-28 max-[734px]:py-16">
      <div className="mx-auto w-[min(460px,87.5%)]">
        <h1 className="type-h1 text-center">{sp.envoye ? t("Regarde ta boîte mail.", "Check your inbox.") : t("Connexion", "Sign in")}</h1>

        {sp.token ? (
          // Confirm step: a mail scanner opening the link does not log anyone in.
          <form action="/api/auth" method="post" className="tile mt-10 grid gap-4 text-center">
            <input type="hidden" name="action" value="verify" />
            <input type="hidden" name="token" value={sp.token} />
            <p className="text-ink-2">{t("Ton lien est prêt.", "Your link is ready.")}</p>
            <button className="btn min-h-[52px] w-full rounded-[12px]">{t("Me connecter", "Sign me in")}</button>
          </form>
        ) : sp.envoye ? (
          <div className="mt-6 grid justify-items-center gap-4 text-center">
            <p className="type-intro text-ink-2">
              {t("Lien envoyé à", "Link sent to")} <span className="text-ink">{sp.envoye}</span>
            </p>
            <Chip icon="clock">{t("Valable 15 min", "Valid for 15 min")}</Chip>
          </div>
        ) : (
          <form action="/api/auth" method="post" className="mt-10 grid gap-4">
            <Chips className="justify-center">
              <Chip icon="mail">{t("Lien par e-mail", "Link by e-mail")}</Chip>
              <Chip icon="lock">{t("Sans mot de passe", "No password")}</Chip>
            </Chips>
            <input type="hidden" name="action" value="login" />
            <input type="hidden" name="next" value={next} />
            <Field label={t("Ton e-mail", "Your e-mail")} name="email" type="email" required defaultValue={sp.email} />
            {/* Explicit consent, unticked by default (RGPD art. 7), with the minimum age. Checked again on the server. */}
            <label className="type-small flex cursor-pointer items-start gap-3 rounded-[12px] bg-tile p-4 text-ink-2">
              <input type="checkbox" name="accept" value="1" required className="mt-0.5 h-5 w-5 shrink-0 accent-blue" />
              <span>
                {t("J’accepte les ", "I accept the ")}
                <Link href="/conditions" className="text-link hover:underline">
                  {t("conditions d’utilisation", "terms of use")}
                </Link>
                {t(" et la ", " and the ")}
                <Link href="/confidentialite" className="text-link hover:underline">
                  {t("politique de confidentialité", "privacy policy")}
                </Link>
                {t(`, et j’ai au moins ${LEGAL.minAge} ans.`, `, and I am at least ${LEGAL.minAge}.`)}
              </span>
            </label>
            {sp.erreur && (
              <p role="alert" className="type-small text-fail">
                {ERRORS[sp.erreur] ? t(...ERRORS[sp.erreur]) : t("Erreur.", "Error.")}
              </p>
            )}
            <button className="btn min-h-[52px] w-full rounded-[12px]">{t("Recevoir mon lien", "Get my link")}</button>
            <p className="type-small text-center text-ink-2">
              {t("Ton e-mail sert à te connecter et à recevoir tes rapports, rien d’autre :", "Your e-mail is used to sign you in and send your reports, nothing else:")}{" "}
              <Link href="/confidentialite" className="text-link hover:underline">
                {t("confidentialité", "privacy")}
              </Link>
              .
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
