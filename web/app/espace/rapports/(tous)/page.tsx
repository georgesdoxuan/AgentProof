import { getT } from "@/lib/lang";
import { ReportsList } from "../list";

export async function generateMetadata() {
  const t = await getT();
  return { title: `${t("Rapports", "Reports")} · AgentProof` };
}

// Rapports › Tous: every active audit of the team, newest first.
export default async function Rapports({ searchParams }: { searchParams: Promise<{ vue?: string; q?: string }> }) {
  const { vue, q } = await searchParams;
  return <ReportsList view="all" vue={vue} q={q} />;
}
