import "server-only";
import { db } from "./engine";

// Permanent delete: the audit and its runs (cascade), then its competitor or model-comparison audit
// and its real payment test, which only exist through it.
// The mobile half of a Desktop + Mobile launch (other device) is a report of its own: unlinked, never deleted with it.
export async function purgeAudit(a: { id: string; compare_to: string | null; payment_test: string | null }) {
  const { data: pair } = a.compare_to ? await db.from("audits").select("id, device").in("id", [a.id, a.compare_to]) : { data: null };
  const ownReport = !!pair && pair.length === 2 && pair[0].device !== pair[1].device;
  await db.from("audits").update({ compare_to: null }).eq("compare_to", a.id);
  await db.from("audits").delete().eq("id", a.id);
  for (const linked of [ownReport ? null : a.compare_to, a.payment_test]) {
    if (!linked) continue;
    const { count } = await db.from("audits").select("id", { count: "exact", head: true }).or(`compare_to.eq.${linked},payment_test.eq.${linked}`);
    if (!count) await db.from("audits").delete().eq("id", linked);
  }
}
