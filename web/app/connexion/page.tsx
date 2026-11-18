import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser, safeNext } from "@/lib/auth";
import { Field } from "@/lib/ui";
import { getT } from "@/lib/lang";

export async function generateMetadata() {
  const t = await getT();
  return { title: `${t("Connexion", "Sign in")} · AgentProof` };
}

const ERRORS: Record<string, [string, string]> = {
  email: ["Adresse e-mail invalide.", "Invalid e-mail address."],
  trop: ["Trop de liens demandés. Réessaie dans 15 minutes.", "Too many links requested. Try again in 15 minutes."],
  envoi: ["L'e-mail n'a pas pu partir. Réessaie dans un instant.", "The e-mail could not be sent. Try again in a moment."],
  lien: ["Ce lien a expiré ou a déjà servi. Demande un nouveau lien.", "This link has expired or was already used. Ask for a new link."],
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
          <p className="type-intro mt-5 text-center text-ink-2">
            {t("Lien de connexion envoyé à", "Sign-in link sent to")} <span className="text-ink">{sp.envoye}</span>. {t("Il reste valable 15 minutes.", "It is valid for 15 minutes.")}
          </p>
        ) : (
          <form action="/api/auth" method="post" className="mt-10 grid gap-4">
            <p className="type-intro text-center text-ink-2">{t("Pas de mot de passe : on t’envoie un lien par e-mail.", "No password: we send you a link by e-mail.")}</p>
            <input type="hidden" name="action" value="login" />
            <input type="hidden" name="next" value={next} />
            <Field label={t("Ton e-mail", "Your e-mail")} name="email" type="email" required defaultValue={sp.email} />
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
