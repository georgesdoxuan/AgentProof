import { randomBytes } from "node:crypto";
import { canLaunch, teamContext } from "@/lib/auth";

// "Connect Slack": sends an owner or admin to Slack's install screen, where they pick the channel for alerts.
// The state ties the round trip to this browser (cookie) and to the current team.
export async function GET(req: Request) {
  const ctx = await teamContext();
  if (!ctx) return Response.redirect(new URL("/connexion?next=/espace/reglages/automations", req.url), 303);
  if (!ctx.team || !canLaunch(ctx.team.role) || !process.env.SLACK_CLIENT_ID) return Response.redirect(new URL("/espace/reglages/automations", req.url), 303);
  const state = `${ctx.team.id}.${randomBytes(16).toString("hex")}`;
  const url = new URL("https://slack.com/oauth/v2/authorize");
  url.searchParams.set("client_id", process.env.SLACK_CLIENT_ID);
  url.searchParams.set("scope", "incoming-webhook");
  url.searchParams.set("redirect_uri", new URL("/api/slack/callback", process.env.PUBLIC_URL ?? req.url).toString());
  url.searchParams.set("state", state);
  return new Response(null, {
    status: 303,
    headers: { Location: url.toString(), "Set-Cookie": `slack_state=${state}; Path=/api/slack; HttpOnly; Secure; SameSite=Lax; Max-Age=600` },
  });
}
