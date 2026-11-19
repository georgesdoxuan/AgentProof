import Link from "next/link";
import { getT } from "@/lib/lang";
import { Note } from "@/lib/ui";
import { SpaceShell } from "./shell";

// A Réglages tab the jury demo keeps closed (members, account): said plainly, with where to go instead.
export async function JuryLockedPage() {
  const t = await getT();
  return (
    <SpaceShell settings>
      <Note icon="info" action={<Link href="/demo" className="text-link hover:underline">{t("Le guide", "The guide")}</Link>}>
        <span className="font-semibold text-ink">{t("Démo jury", "Jury demo")}</span>
        {" · "}
        {t(
          "cet onglet est fermé pendant la démonstration, pour qu'aucun membre ni compte ne change dans l'espace partagé. Rapports, sites, corrections, replays, audits, test de paiement et comptes de test restent ouverts.",
          "this tab is closed during the demo, so no member or account changes in the shared space. Reports, sites, corrections, replays, audits, payment test and test accounts stay open.",
        )}
      </Note>
    </SpaceShell>
  );
}
