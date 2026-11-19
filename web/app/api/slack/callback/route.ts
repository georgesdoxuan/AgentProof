import { canLaunch, teamContext } from "@/lib/auth";
import { db } from "@/lib/engine";
import { postWebhook } from "@/lib/automations";

// Slack sends the admin back here with a code: exchange it for the channel's incoming webhook and save it on the team.
const back = (req: Request, slack: string) => {
  const to = new URL("/espace/automations", req.url);
  to.searchParams.set("slack", slack);
  return new Response(null, { status: 303, headers: { Location: to.toString(), "Set-Cookie": "slack_state=; Path=/api/slack; Max-Age=0" } });
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const state = url.searchParams.get("state") ?? "";
  const code = url.searchParams.get("code");
  const cookie = req.headers.get("cookie")?.match(/(?:^|;\s*)slack_state=([^;]+)/)?.[1];
  const ctx = await teamContext();
  if (!ctx) return Response.redirect(new URL("/connexion?next=/espace/automations", req.url), 303);
  // Refused on Slack's screen, or a link not started from this browser and this team.
  if (!code || !cookie || cookie !== state || state.split(".")[0] !== ctx.team?.id || !canLaunch(ctx.team.role)) return back(req, "refused");

  const res = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.SLACK_CLIENT_ID ?? "",
      client_secret: process.env.SLACK_CLIENT_SECRET ?? "",
      code,
      redirect_uri: new URL("/api/slack/callback", process.env.PUBLIC_URL ?? req.url).toString(),
    }),
    signal: AbortSignal.timeout(10_000),
  }).then((r) => r.json()).catch(() => null);
  const hook = res?.ok ? (res.incoming_webhook?.url as string | undefined) : undefined;
  if (!hook?.startsWith("https://hooks.slack.com/")) return back(req, "error");

  await db.from("teams").update({ webhook_url: hook }).eq("id", ctx.team.id);
  const channel = String(res.incoming_webhook.channel ?? "");
  await postWebhook(hook, { event: "test", domain: "agentproof", text: `connecté à ${channel || "ce canal"} : les alertes de ${ctx.team.name} arriveront ici.`, link: "" }).catch(() => false);
  return back(req, "ok");
}
