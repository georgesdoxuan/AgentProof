import Link from "next/link";
import { getT } from "@/lib/lang";

// Inside the space's layout: the sidebar stays, the way back is the space's home.
export default async function NotFound() {
  const t = await getT();
  return (
    <div className="px-6 py-32 text-center sm:px-8 max-[734px]:py-20">
      <h1 className="type-title">{t("Page introuvable.", "Page not found.")}</h1>
      <p className="mt-3 text-ink-2">{t("Cette page de l’espace n’existe pas, ou plus.", "This page of the space does not exist, or no longer does.")}</p>
      <Link href="/espace" className="more mt-4">
        {t("Retour à l’accueil", "Back to home")}
      </Link>
    </div>
  );
}
