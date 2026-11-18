import { ReportsList } from "../list";

export const metadata = { title: "Corbeille · Rapports · AgentProof" };

// Rapports › Corbeille: reports moved to the trash, to restore or delete for good.
export default async function Corbeille() {
  return <ReportsList view="trash" />;
}
