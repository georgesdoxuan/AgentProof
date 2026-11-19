import { getT } from "@/lib/lang";
import { ReportsList } from "../list";

export async function generateMetadata() {
  const t = await getT();
  return { title: `${t("Favoris · Rapports", "Favourites · Reports")} · AgentProof` };
}

// Rapports › Favoris: the reports the team starred.
export default async function Favoris({ searchParams }: { searchParams: Promise<{ vue?: string; q?: string }> }) {
  const { vue, q } = await searchParams;
  return <ReportsList view="favorites" vue={vue} q={q} />;
}
