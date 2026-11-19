import { db } from "@/lib/engine";

// Deploy hook: one secret URL per team (teams.hook_token). Vercel (deployment.succeeded), Shopify (themes/publish),
// GitHub (deployment_status) or a plain curl call it after a release: every enabled page of the team is checked within
// a minute instead of waiting for its next check. The token is the only secret, so nothing else is read from the request.
// ponytail: the payloads are not verified against each provider's signature; the token alone authorises the call.

const json = (body: object, status = 200) => Response.json(body, { status });

async function handle(req: Request, token: string) {
  if (!/^[0-9a-f]{20,64}$/.test(token)) return json({ error: "unknown hook" }, 404);
  const { data: team } = await db.from("teams").select("id").eq("hook_token", token).maybeSingle();
  if (!team) return json({ error: "unknown hook" }, 404);
  const source = req.headers.get("x-vercel-signature")
    ? "Vercel"
    : req.headers.get("x-shopify-topic")
      ? "Shopify"
      : req.headers.get("x-github-event")
        ? "GitHub"
        : "appel direct";
  const { data: pages } = await db.from("automations").select("id").eq("team_id", team.id).eq("enabled", true);
  const ids = (pages ?? []).map((p) => p.id);
  if (!ids.length) return json({ queued: 0 });
  // A release often sends several events (build, promote, each GitHub status): one recheck per 2 minutes is enough.
  const since = new Date(Date.now() - 2 * 60_000).toISOString();
  const { count } = await db.from("automation_checks").select("id", { count: "exact", head: true }).in("automation_id", ids).eq("status", "deploy").gte("checked_at", since);
  if (count) return json({ queued: 0, note: "already queued" });
  await db.from("automations").update({ last_checked_at: null }).in("id", ids);
  await db.from("automation_checks").insert(ids.map((id) => ({ automation_id: id, status: "deploy", detail: `Mise en ligne signalée (${source}) : vérification dans la minute.` })));
  return json({ queued: ids.length });
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  return handle(req, (await params).token);
}
