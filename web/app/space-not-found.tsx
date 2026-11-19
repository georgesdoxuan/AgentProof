import Link from "next/link";
import { getT } from "@/lib/lang";
import { teamContext } from "@/lib/auth";

// One « not found » page for the space, a report and a replay: same title size, and a way back that fits the reader.
export default async function SpaceNotFound({ what }: { what: "space" | "report" }) {
  const t = await getT();
  const member = !!(await teamContext())?.team;
  const [href, label] = what === "space" ? ["/espace", t("Retour à l’accueil", "Back to home")] : member ? ["/espace/rapports", t("Retour aux rapports", "Back to reports")] : ["/classement", t("Voir le classement", "See the ranking")];
  return (
    <div className="px-6 py-32 text-center sm:px-8 max-[734px]:py-20">
      <h1 className="type-title">{t("Page introuvable.", "Page not found.")}</h1>
      <p className="mt-3 text-ink-2">
        {what === "space" ? t("Cette page de l’espace n’existe pas, ou plus.", "This page of the space does not exist, or no longer does.") : t("Ce rapport ou ce replay n’existe pas, ou plus.", "This report or replay does not exist, or no longer does.")}
      </p>
      <Link href={href} className="more mt-4">
        {label}
      </Link>
    </div>
  );
}
