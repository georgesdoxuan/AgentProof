import { canLaunch, teamContext } from "@/lib/auth";
import { getLang } from "@/lib/lang";
import { cleanItems, cleanName, createList, deleteList, teamLists, updateList } from "@/lib/mission-lists";

// The launch form's saved mission lists: create, overwrite with the current pick, rename, delete.
// JSON in, the team's refreshed lists out. Editors and up, like launching an audit.
export async function POST(req: Request) {
  const lang = await getLang();
  const en = lang === "en";
  const fail = (error: string, status = 400) => Response.json({ error }, { status });
  const ctx = await teamContext();
  if (!ctx?.team) return fail(en ? "Sign in again." : "Reconnecte-toi.", 401);
  if (!canLaunch(ctx.team.role)) return fail(en ? "Your role (viewer) cannot change lists." : "Ton rôle (lecteur) ne permet pas de modifier les listes.", 403);
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const id = typeof body?.id === "number" && Number.isInteger(body.id) && body.id > 0 ? body.id : undefined;
  try {
    let saved: number | undefined;
    if (body?.action === "create" || body?.action === "save") {
      const items = cleanItems(body.items, lang);
      if ("error" in items) return fail(items.error);
      if (body.action === "create") {
        const name = cleanName(body.name, lang);
        if (typeof name !== "string") return fail(name.error);
        saved = await createList(ctx.team.id, ctx.user.id, name, items);
      } else {
        if (!id) return fail(en ? "Unknown list." : "Liste inconnue.");
        await updateList(ctx.team.id, id, { items });
        saved = id;
      }
    } else if (body?.action === "rename" && id) {
      const name = cleanName(body.name, lang);
      if (typeof name !== "string") return fail(name.error);
      await updateList(ctx.team.id, id, { name });
      saved = id;
    } else if (body?.action === "delete" && id) {
      await deleteList(ctx.team.id, id);
    } else return fail(en ? "Unknown action." : "Action inconnue.");
    return Response.json({ id: saved, lists: await teamLists(ctx.team.id) });
  } catch (e) {
    return fail(`${en ? "Not saved" : "Non enregistré"} : ${(e as Error).message}`);
  }
}
