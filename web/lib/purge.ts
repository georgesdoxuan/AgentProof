import "server-only";
import { db } from "./engine";

// Permanent delete: the audit and its runs (cascade), then its competitor or model-comparison audit
// and its real payment test, which only exist through it.
export async function purgeAudit(a: { id: string; compare_to: string | null; payment_test: string | null }) {
  await db.from("audits").update({ compare_to: null }).eq("compare_to", a.id);
  await db.from("audits").delete().eq("id", a.id);
  for (const linked of [a.compare_to, a.payment_test]) {
    if (!linked) continue;
    const { count } = await db.from("audits").select("id", { count: "exact", head: true }).or(`compare_to.eq.${linked},payment_test.eq.${linked}`);
    if (!count) await db.from("audits").delete().eq("id", linked);
  }
}
