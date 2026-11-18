import { ReportsList } from "../list";

export const metadata = { title: "Favoris · Rapports · AgentProof" };

// Rapports › Favoris: the reports the team starred.
export default async function Favoris({ searchParams }: { searchParams: Promise<{ vue?: string }> }) {
  return <ReportsList view="favorites" vue={(await searchParams).vue} />;
}
