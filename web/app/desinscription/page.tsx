import Link from "next/link";
import { getT } from "@/lib/lang";
import { LEGAL } from "@/lib/legal";
import { validOptout } from "@/lib/optout";

export async function generateMetadata() {
  const t = await getT();
  return { title: `${t("Désinscription des alertes", "Unsubscribe from alerts")} · AgentProof` };
}

// Landing page of the unsubscribe link at the bottom of every alert e-mail.
export default async function Desinscription({ searchParams }: { searchParams: Promise<{ e?: string; s?: string; etat?: string }> }) {
  const { e = "", s = "", etat } = await searchParams;
  const t = await getT();
  const valid = validOptout(e.toLowerCase(), s);
  return (
    <div className="bg-bg-2 py-28 max-[734px]:py-16">
      <div className="mx-auto grid w-[min(460px,87.5%)] gap-6 text-center">
        <h1 className="type-h1">{etat === "ok" ? t("C’est fait.", "Done.") : t("Ne plus recevoir d’alertes", "Stop receiving alerts")}</h1>
        {etat === "ok" ? (
          <p className="type-intro text-ink-2">
            {t("Plus aucune alerte ne sera envoyée à", "No more alerts will be sent to")} <span className="text-ink">{e}</span>.{" "}
            {t("Tu recevras toujours les liens de connexion et les rapports que tu demandes.", "You will still get sign-in links and the reports you ask for.")}
          </p>
        ) : !valid || etat === "lien" ? (
          <p role="alert" className="type-intro text-ink-2">
            {t("Ce lien n’est pas valide. Écris à", "This link is not valid. Write to")}{" "}
            <a href={`mailto:${LEGAL.contact}`} className="text-link hover:underline">
              {LEGAL.contact}
            </a>{" "}
            {t("et nous te désinscrivons.", "and we unsubscribe you.")}
          </p>
        ) : (
          <form action="/api/desinscription" method="post" className="grid gap-4">
            <p className="type-intro text-ink-2">
              {t("Alertes de changement de page et de baisse de score pour", "Page change and score drop alerts for")} <span className="text-ink">{e}</span>.
            </p>
            <input type="hidden" name="e" value={e} />
            <input type="hidden" name="s" value={s} />
            {etat === "erreur" && (
              <p role="alert" className="type-small text-fail">
                {t("La désinscription n’a pas pu être enregistrée. Réessaie dans un instant.", "The unsubscribe could not be saved. Try again in a moment.")}
              </p>
            )}
            <button className="btn min-h-[52px] w-full rounded-[12px]">{t("Me désinscrire", "Unsubscribe")}</button>
          </form>
        )}
        <Link href="/" className="type-small text-link hover:underline">
          {t("Retour à l’accueil", "Back to home")}
        </Link>
      </div>
    </div>
  );
}
