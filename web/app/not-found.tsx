import Link from "next/link";
import { getT } from "@/lib/lang";

export default async function NotFound() {
  const t = await getT();
  return (
    <div className="bg-bg-2 py-40 text-center max-[734px]:py-28">
      <div className="wrap">
        <h1 className="type-h1">{t("Page introuvable.", "Page not found.")}</h1>
        <p className="type-intro mt-4 text-ink-2">{t("Ce rapport ou ce replay n’existe pas, ou plus.", "This report or replay does not exist, or no longer does.")}</p>
        <Link href="/classement" className="more type-intro mt-4">
          {t("Voir le classement", "See the ranking")}
        </Link>
      </div>
    </div>
  );
}
