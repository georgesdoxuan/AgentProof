import { getT } from "@/lib/lang";
import { ReportsList } from "../../../rapports/list";

export async function generateMetadata() {
  const t = await getT();
  return { title: `${t("Corbeille · Rapports", "Trash · Reports")} · AgentProof` };
}

// Réglages › Corbeille › Rapports: reports moved to the trash, to restore or delete for good.
export default async function Corbeille() {
  return <ReportsList view="trash" />;
}
