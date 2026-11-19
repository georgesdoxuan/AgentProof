import "server-only";
import { randomBytes } from "node:crypto";
import { db, missionText } from "./engine";
import { missionTitle, type Lang } from "./i18n";
import { missionIconPath } from "./ui";

// Missions a team runs: AgentProof's defaults (some untickable, editable) plus its own.
// Everything sits in the missions table (see the team_missions migration), so the engine, replays, reports
// and credits treat a team mission exactly like a default one.
export const MAX_PER_AUDIT = 10; // missions in one audit (doubled with a competitor): bounds time and H budget
export const MAX_SAVED = 20; // missions a team keeps in its space
export const TITLE = [3, 60] as const;
export const TEXT = [20, 600] as const;

export type TeamMission = {
  id: number; // the mission to run: the team's saved edit when there is one
  base_id: number | null; // default mission it replaces (edits), null for a mission the team added
  title: string;
  instruction: string;
  default: { title: string; instruction: string } | null; // the AgentProof version, for "Back to default"
  checked: boolean; // team missions only: ticked by default on the launch form
  position: number;
};

// The agent's hard rules already forbid all this; refusing it here keeps the intent honest and the report readable.
// Payment has its own test (team card, separate run), so a team mission never talks about paying.
const FORBIDDEN =
  /(\bpa(y|ie|yer|yez|iement|yment)\b|paiement|carte (bancaire|de cr[ée]dit)|credit card|\bcvc\b|\bcvv\b|\biban\b|mot de passe|password|cr[ée]er? (un )?compte|create (an )?account|sign ?up|inscri(s|re|ption)|(passe|valide|confirme)r? (la |ma )?commande|place (an |the )?order|confirm (the )?order|https?:\/\/|www\.|ignore (les |tes |all |previous |your )?(r[èe]gles|consignes|instructions|rules)|instructions? (pr[ée]c[ée]dentes|above|previous)|system prompt|e-?mail|t[ée]l[ée]phone|adresse postale)/i;

export function validate(rawTitle: unknown, rawText: unknown, lang: Lang): { title: string; instruction: string } | { error: string } {
  const clean = (v: unknown) => String(v ?? "").replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
  const title = clean(rawTitle);
  const instruction = clean(rawText);
  const en = lang === "en";
  if (title.length < TITLE[0] || title.length > TITLE[1]) return { error: en ? `The name takes ${TITLE[0]} to ${TITLE[1]} characters.` : `Le nom fait de ${TITLE[0]} à ${TITLE[1]} caractères.` };
  if (instruction.length < TEXT[0] || instruction.length > TEXT[1])
    return { error: en ? `The instruction takes ${TEXT[0]} to ${TEXT[1]} characters.` : `La consigne fait de ${TEXT[0]} à ${TEXT[1]} caractères.` };
  if (FORBIDDEN.test(`${title} ${instruction}`))
    return {
      error: en
        ? "A mission cannot pay, create an account, enter personal data, open another site or change the agent's rules. For a real payment, use the payment test in the advanced options."
        : "Une mission ne peut pas payer, créer de compte, saisir de données personnelles, ouvrir un autre site ni changer les règles de l'agent. Pour un vrai paiement, utilise le test de paiement des options avancées.",
    };
  return { title, instruction };
}

// Defaults (with the team's saved edits laid over them), then the missions the team added.
export async function teamMissions(teamId: string) {
  const [{ data: defaults }, { data: own }] = await Promise.all([
    db.from("missions").select("id, slug, title, instruction, position").is("team_id", null).eq("active", true).order("position"),
    db.from("missions").select("id, base_id, title, instruction, checked, position, created_at").eq("team_id", teamId).eq("saved", true).eq("active", true).order("position").order("created_at"),
  ]);
  const edits = new Map((own ?? []).filter((m) => m.base_id).map((m) => [m.base_id as number, m]));
  const list: TeamMission[] = (defaults ?? []).map((row) => {
    const d = { ...row, instruction: missionText(row) };
    const e = edits.get(d.id);
    return { id: e?.id ?? d.id, base_id: e ? d.id : null, title: e?.title ?? d.title, instruction: e?.instruction ?? d.instruction, default: { title: d.title, instruction: d.instruction }, checked: false, position: d.position };
  });
  const extras: TeamMission[] = (own ?? []).filter((m) => !m.base_id).map((m) => ({ id: m.id, base_id: null, title: m.title, instruction: m.instruction, default: null, checked: m.checked, position: m.position }));
  return { defaults: list, extras };
}

const slug = () => `t-${randomBytes(6).toString("hex")}`;

// Save for the team: an edit of a default (one live edit per default) or a mission the team added.
export async function saveMission(teamId: string, userId: string, input: { id?: number; base_id?: number; title: string; instruction: string; checked?: boolean }) {
  if (input.base_id) {
    const { data: base } = await db.from("missions").select("id, position").eq("id", input.base_id).is("team_id", null).eq("active", true).maybeSingle();
    if (!base) throw new Error("mission inconnue");
    const { data: live } = await db.from("missions").select("id").eq("team_id", teamId).eq("base_id", base.id).eq("saved", true).eq("active", true).maybeSingle();
    const row = { title: input.title, instruction: input.instruction };
    if (live) return (await db.from("missions").update(row).eq("id", live.id).select("id").single()).data!.id as number;
    return (await db.from("missions").insert({ ...row, slug: slug(), team_id: teamId, base_id: base.id, position: base.position, created_by: userId }).select("id").single()).data!.id as number;
  }
  if (input.id) {
    const { data } = await db.from("missions").update({ title: input.title, instruction: input.instruction, checked: input.checked ?? true }).eq("id", input.id).eq("team_id", teamId).is("base_id", null).eq("saved", true).select("id");
    if (!data?.length) throw new Error("mission inconnue");
    return input.id;
  }
  const { count } = await db.from("missions").select("id", { count: "exact", head: true }).eq("team_id", teamId).eq("saved", true).eq("active", true);
  if ((count ?? 0) >= MAX_SAVED) throw new Error(`limite de ${MAX_SAVED} missions enregistrées atteinte`);
  const { data } = await db
    .from("missions")
    .insert({ title: input.title, instruction: input.instruction, checked: input.checked ?? true, slug: slug(), team_id: teamId, position: 200, created_by: userId })
    .select("id")
    .single();
  return data!.id as number;
}

// "Back to default" and "remove": the row stays (past reports point at it), it just leaves the list.
export async function retireMission(teamId: string, id: number) {
  await db.from("missions").update({ active: false }).eq("id", id).eq("team_id", teamId).eq("saved", true);
}

// The launch form's pick: missions to run, in order. { id } for a listed mission, { title, text, base_id? } for a
// one-off edit or a new mission written for this audit only (stored with saved = false, never listed again).
export async function resolvePick(teamId: string, userId: string, raw: string, lang: Lang): Promise<number[] | { error: string }> {
  const en = lang === "en";
  let items: unknown;
  try {
    items = JSON.parse(raw);
  } catch {
    return { error: en ? "Unreadable mission list." : "Liste de missions illisible." };
  }
  if (!Array.isArray(items) || !items.length) return { error: en ? "Pick at least one mission." : "Choisis au moins une mission." };
  if (items.length > MAX_PER_AUDIT) return { error: en ? `${MAX_PER_AUDIT} missions at most per audit.` : `${MAX_PER_AUDIT} missions au plus par audit.` };
  const { defaults, extras } = await teamMissions(teamId);
  const allowed = new Map([...defaults, ...extras].map((m) => [m.id, m]));
  const baseIds = new Set(defaults.map((m) => m.base_id ?? m.id));
  const ids: number[] = [];
  for (const [i, it] of (items as Record<string, unknown>[]).entries()) {
    if (typeof it?.id === "number") {
      if (!allowed.has(it.id)) return { error: en ? "A mission is no longer available: reload the page." : "Une mission n'est plus disponible : recharge la page." };
      ids.push(it.id);
      continue;
    }
    const v = validate(it?.title, it?.text, lang);
    if ("error" in v) return v;
    const base = typeof it?.base_id === "number" && baseIds.has(it.base_id) ? it.base_id : null;
    // A one-off edit keeps its default's place in the report; a new mission goes after the defaults, in pick order.
    const pos = defaults.find((d) => (d.base_id ?? d.id) === base)?.position ?? 300 + i;
    const { data, error } = await db
      .from("missions")
      .insert({ ...v, slug: slug(), team_id: teamId, base_id: base, saved: false, active: false, position: pos, created_by: userId })
      .select("id")
      .single();
    if (error) throw error;
    ids.push(data.id);
  }
  if (new Set(ids).size !== ids.length) return { error: en ? "The same mission is listed twice." : "La même mission apparaît deux fois." };
  return ids;
}

// What the launch form shows. key: "d<default id>" for a default (edited or not), "t<id>" for a team mission.
export type PickItem = {
  key: string;
  id: number | null; // null: a new mission written for this audit only
  base_id: number | null;
  title: string;
  label: string; // shown title, translated for defaults
  instruction: string;
  default: { title: string; instruction: string } | null;
  icon: string;
  team: boolean;
  once: boolean; // changed for this audit only, not saved
  checked: boolean;
};

// The first `ticked` defaults are ticked, like the audit the form used to launch (5, or 3 on demo day).
export function pickItems({ defaults, extras }: Awaited<ReturnType<typeof teamMissions>>, lang: Lang, ticked: number): PickItem[] {
  return [
    ...defaults.map((m, i) => ({
      key: `d${m.base_id ?? m.id}`,
      id: m.id,
      base_id: m.base_id,
      title: m.base_id ? m.title : missionTitle(m.title, lang),
      label: m.base_id ? m.title : missionTitle(m.title, lang),
      instruction: m.instruction,
      default: m.default && { ...m.default, title: missionTitle(m.default.title, lang) },
      icon: missionIconPath(m.default?.title),
      team: false,
      once: false,
      checked: i < ticked,
    })),
    ...extras.map((m) => ({ key: `t${m.id}`, id: m.id, base_id: null, title: m.title, label: m.title, instruction: m.instruction, default: null, icon: missionIconPath(null, true), team: true, once: false, checked: m.checked })),
  ];
}
