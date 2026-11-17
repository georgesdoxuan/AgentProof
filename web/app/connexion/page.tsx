import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser, safeNext } from "@/lib/auth";
import { Field } from "@/lib/ui";

export const metadata = { title: "Connexion · AgentProof" };

const ERRORS: Record<string, string> = {
  email: "Adresse e-mail invalide.",
  trop: "Trop de liens demandés. Réessaie dans 15 minutes.",
  envoi: "L'e-mail n'a pas pu partir. Réessaie dans un instant.",
  lien: "Ce lien a expiré ou a déjà servi. Demande un nouveau lien.",
};

type Search = { token?: string; envoye?: string; erreur?: string; next?: string; email?: string };

export default async function Connexion({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  if (!sp.token && (await currentUser())) redirect(next);

  return (
    <div className="bg-bg-2 py-28 max-[734px]:py-16">
      <div className="mx-auto w-[min(460px,87.5%)]">
        <h1 className="type-h1 text-center">{sp.envoye ? "Regarde ta boîte mail." : "Connexion"}</h1>

        {sp.token ? (
          // Confirm step: a mail scanner opening the link does not log anyone in.
          <form action="/api/auth" method="post" className="tile mt-10 grid gap-4 text-center">
            <input type="hidden" name="action" value="verify" />
            <input type="hidden" name="token" value={sp.token} />
            <p className="text-ink-2">Ton lien est prêt.</p>
            <button className="btn min-h-[52px] w-full rounded-[12px]">Me connecter</button>
          </form>
        ) : sp.envoye ? (
          <p className="type-intro mt-5 text-center text-ink-2">
            Lien de connexion envoyé à <span className="text-ink">{sp.envoye}</span>. Il reste valable 15 minutes.
          </p>
        ) : (
          <form action="/api/auth" method="post" className="mt-10 grid gap-4">
            <p className="type-intro text-center text-ink-2">Pas de mot de passe : on t&apos;envoie un lien par e-mail.</p>
            <input type="hidden" name="action" value="login" />
            <input type="hidden" name="next" value={next} />
            <Field label="Ton e-mail" name="email" type="email" required defaultValue={sp.email} />
            {sp.erreur && (
              <p role="alert" className="type-small text-fail">
                {ERRORS[sp.erreur] ?? "Erreur."}
              </p>
            )}
            <button className="btn min-h-[52px] w-full rounded-[12px]">Recevoir mon lien</button>
            <p className="type-small text-center text-ink-2">
              Ton e-mail sert à te connecter et à recevoir tes rapports, rien d&apos;autre :{" "}
              <Link href="/confidentialite" className="text-link hover:underline">confidentialité</Link>.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
