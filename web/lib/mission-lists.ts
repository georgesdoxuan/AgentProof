import "server-only";
import { db } from "./engine";
import type { Lang } from "./i18n";
import { MAX_PER_AUDIT, validate } from "./missions";

// Mission lists a team saves on the launch form ("My lists"): a name and the missions it ticks, in order.
// A listed mission is kept by its form key (d<default id> or t<team mission id>) so an edit saved later still applies;
// a mission written for the list only keeps its text and is checked again, like any one-off, when the audit starts.
export const MAX_LISTS = 30;
export const NAME = [1, 60] as const;

export type ListEntry = { key: string } | { title: string; text: string; base_id?: number };
export type MissionList = { id: number; name: string; items: ListEntry[] };

// Lists of the team, by name. Empty when the table is missing (migration not applied yet).
export async function teamLists(teamId: string): Promise<MissionList[]> {
  const { data, error } = await db.from("mission_lists").select("id, name, items").eq("team_id", teamId).order("name");
  if (error) return [];
  return (data ?? []).map((r) => ({ id: r.id as number, name: r.name as string, items: r.items as ListEntry[] }));
}

export function cleanName(raw: unknown, lang: Lang): string | { error: string } {
  const name = String(raw ?? "").replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
  if (name.length < NAME[0] || name.length > NAME[1]) return { error: lang === "en" ? `The name takes ${NAME[0]} to ${NAME[1]} characters.` : `Le nom fait de ${NAME[0]} à ${NAME[1]} caractères.` };
  return name;
}

// Same rules as the pick sent at launch: 1 to MAX_PER_AUDIT missions, one-off texts pass the mission checks.
export function cleanItems(raw: unknown, lang: Lang): ListEntry[] | { error: string } {
  const en = lang === "en";
  if (!Array.isArray(raw) || !raw.length) return { error: en ? "Pick at least one mission." : "Choisis au moins une mission." };
  if (raw.length > MAX_PER_AUDIT) return { error: en ? `${MAX_PER_AUDIT} missions at most per list.` : `${MAX_PER_AUDIT} missions au plus par liste.` };
  const out: ListEntry[] = [];
  for (const it of raw as Record<string, unknown>[]) {
    if (typeof it?.key === "string" && /^[dt]\d{1,12}$/.test(it.key)) {
      out.push({ key: it.key });
      continue;
    }
    const v = validate(it?.title, it?.text, lang);
    if ("error" in v) return v;
    const base = typeof it?.base_id === "number" && Number.isInteger(it.base_id) && it.base_id > 0 ? it.base_id : undefined;
    out.push({ title: v.title, text: v.instruction, ...(base ? { base_id: base } : {}) });
  }
  return out;
}

export async function createList(teamId: string, userId: string, name: string, items: ListEntry[]) {
  const { count } = await db.from("mission_lists").select("id", { count: "exact", head: true }).eq("team_id", teamId);
  if ((count ?? 0) >= MAX_LISTS) throw new Error(`limite de ${MAX_LISTS} listes atteinte`);
  const { data, error } = await db.from("mission_lists").insert({ team_id: teamId, name, items, created_by: userId }).select("id").single();
  if (error) throw error;
  return data.id as number;
}

export async function updateList(teamId: string, id: number, patch: { name?: string; items?: ListEntry[] }) {
  const { data, error } = await db
    .from("mission_lists")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("team_id", teamId)
    .select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("liste inconnue");
}

export async function deleteList(teamId: string, id: number) {
  const { error } = await db.from("mission_lists").delete().eq("id", id).eq("team_id", teamId);
  if (error) throw error;
}
