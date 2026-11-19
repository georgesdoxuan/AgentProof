import Link from "next/link";
import { getT } from "@/lib/lang";
import { Note } from "@/lib/ui";
import { SpaceShell } from "./shell";

// A Réglages tab the jury demo keeps closed (card, test accounts, members, account): said plainly, with where to go instead.
export async function JuryLockedPage() {
  const t = await getT();
  return (
    <SpaceShell settings>
      <Note icon="info" action={<Link href="/demo" className="text-link hover:underline">{t("Le guide", "The guide")}</Link>}>
        <span className="font-semibold text-ink">{t("Démo jury", "Jury demo")}</span>
        {" · "}
        {t(
          "cet onglet est fermé pendant la démonstration, pour qu'aucune carte, aucun compte ni aucun membre ne change dans l'espace partagé. Rapports, sites, corrections, replays et lancement d'audit restent ouverts.",
          "this tab is closed during the demo, so no card, account or member changes in the shared space. Reports, sites, corrections, replays and audits stay open.",
        )}
      </Note>
    </SpaceShell>
  );
}
