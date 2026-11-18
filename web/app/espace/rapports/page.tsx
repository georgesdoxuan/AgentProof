import { ReportsList } from "./list";

export const metadata = { title: "Rapports · AgentProof" };

// Rapports › Tous: every active audit of the team, newest first.
export default async function Rapports({ searchParams }: { searchParams: Promise<{ vue?: string }> }) {
  return <ReportsList view="all" vue={(await searchParams).vue} />;
}
