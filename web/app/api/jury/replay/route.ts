import { teamContext } from "@/lib/auth";
import { db } from "@/lib/engine";
import { isJury, juryTeam } from "@/lib/jury";

const go = (req: Request, path: string) => Response.redirect(new URL(path, req.url), 303);

// "2. Watch a replay" in the jury banner: a replay of the report the judge opened (?a=), else of the jury team's
// latest finished report. Jury team only: a judge never reaches another team's replay through it.
export async function GET(req: Request) {
  const ctx = await teamContext();
  const teamId = await juryTeam();
  if (!ctx || !isJury(ctx.user.email) || !teamId) return go(req, "/espace/rapports");

  const a = new URL(req.url).searchParams.get("a");
  const pick = async (auditId: string | null) => {
    let q = db.from("audits").select("id, runs(id, status, missions(position))").eq("team_id", teamId).eq("kind", "checkout").eq("status", "done");
    q = auditId ? q.eq("id", auditId) : q.order("created_at", { ascending: false }).limit(5);
    const { data } = await q;
    for (const audit of data ?? []) {
      const run = (audit.runs as any[]).filter((r) => r.status === "done").sort((x, y) => (x.missions?.position ?? 0) - (y.missions?.position ?? 0))[0];
      if (run) return `/replay/${run.id}?a=${audit.id}`;
    }
    return null;
  };
  const target = (a && /^[0-9a-f-]{36}$/.test(a) ? await pick(a) : null) ?? (await pick(null));
  return go(req, target ?? "/espace/rapports");
}
