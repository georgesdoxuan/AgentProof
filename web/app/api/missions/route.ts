import { canLaunch, teamContext } from "@/lib/auth";
import { getLang } from "@/lib/lang";
import { pickItems, retireMission, saveMission, teamMissions, validate } from "@/lib/missions";

// The launch form's mission editor: save a mission for the team, go back to a default, remove a team mission.
// JSON in, the team's refreshed list out. Owners and admins only, like launching an audit.
export async function POST(req: Request) {
  const lang = await getLang();
  const en = lang === "en";
  const fail = (error: string, status = 400) => Response.json({ error }, { status });
  const ctx = await teamContext();
  if (!ctx?.team) return fail(en ? "Sign in again." : "Reconnecte-toi.", 401);
  if (!canLaunch(ctx.team.role)) return fail(en ? "Your role (viewer) cannot change missions." : "Ton rôle (lecteur) ne permet pas de modifier les missions.", 403);
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const num = (v: unknown) => (typeof v === "number" && Number.isInteger(v) && v > 0 ? v : undefined);
  try {
    if (body?.action === "save") {
      const v = validate(body.title, body.text, lang);
      if ("error" in v) return fail(v.error);
      const id = await saveMission(ctx.team.id, ctx.user.id, { id: num(body.id), base_id: num(body.base_id), ...v, checked: body.checked !== false });
      return Response.json({ id, items: pickItems(await teamMissions(ctx.team.id), lang, 0) });
    }
    if (body?.action === "retire" && num(body.id)) {
      await retireMission(ctx.team.id, num(body.id)!);
      return Response.json({ items: pickItems(await teamMissions(ctx.team.id), lang, 0) });
    }
    return fail(en ? "Unknown action." : "Action inconnue.");
  } catch (e) {
    return fail(`${en ? "Not saved" : "Non enregistré"} : ${(e as Error).message}`);
  }
}
