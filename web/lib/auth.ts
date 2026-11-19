import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "./engine";

// Passwordless e-mail login: one-time link -> signed session cookie. Users, teams and invitations live in Supabase.
// ponytail: stateless cookie, so logout only clears this browser; add a sessions table if remote revocation matters.
const SECRET = process.env.AUTH_SECRET ?? process.env.TICK_SECRET ?? "";
const SESSION = "ap_session";
const TEAM = "ap_team";
const DAYS = 30;

export type Role = "owner" | "admin" | "viewer";
export const ROLE_LABEL: Record<Role, string> = { owner: "Propriétaire", admin: "Admin", viewer: "Lecteur" };
export const canLaunch = (role?: Role | null) => role === "owner" || role === "admin";

export const newToken = () => randomBytes(32).toString("base64url");
export const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");
const sign = (v: string) => createHmac("sha256", SECRET).update(v).digest("base64url");

export function normalizeEmail(input: unknown) {
  const e = String(input ?? "").trim().toLowerCase();
  return e.length <= 200 && /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(e) ? e : null;
}

// Only same-site paths, never "//evil.com".
export const safeNext = (n: unknown) => (typeof n === "string" && /^\/(?!\/)/.test(n) ? n : "/espace");

// Links in e-mails use PUBLIC_URL, never the request Host header (which a client controls).
export const baseUrl = (req: Request) => process.env.PUBLIC_URL || new URL(req.url).origin;

const cookieOpts = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: DAYS * 86400 };

export async function startSession(userId: string) {
  if (!SECRET) throw new Error("AUTH_SECRET manquant.");
  const v = `${userId}.${Date.now() + DAYS * 86400_000}`;
  (await cookies()).set(SESSION, `${v}.${sign(v)}`, cookieOpts);
}

export async function endSession() {
  const c = await cookies();
  c.delete(SESSION);
  c.delete(TEAM);
}

export async function setTeam(teamId: string) {
  (await cookies()).set(TEAM, teamId, cookieOpts);
}

// The user id from a valid session cookie (signature and expiry checked), without any database read.
async function sessionUserId() {
  const raw = (await cookies()).get(SESSION)?.value;
  if (!raw || !SECRET) return null;
  const [id, exp, mac = ""] = raw.split(".");
  const expected = sign(`${id}.${exp}`);
  if (mac.length !== expected.length || !timingSafeEqual(Buffer.from(mac), Buffer.from(expected)) || Number(exp) < Date.now()) return null;
  return id;
}

const loadUser = (id: string) => db.from("users").select("id, email").eq("id", id).maybeSingle().then(({ data }) => data as { id: string; email: string } | null);
const loadMemberships = (userId: string) => db.from("memberships").select("role, teams(id, name, owner_id)").eq("user_id", userId).order("created_at");

// cache(): the layout (nav), generateMetadata and the page all ask for the user in one request; the database is read once.
export const currentUser = cache(async (): Promise<{ id: string; email: string } | null> => {
  const id = await sessionUserId();
  return id ? loadUser(id) : null;
});

export type TeamRow = { id: string; name: string; owner_id: string; role: Role };

// The signed-in user, every team they belong to, and the team they are working in (cookie, else the first one).
// The user and their teams are read in parallel: the signed cookie already gives the user id.
export const teamContext = cache(async () => {
  const id = await sessionUserId();
  if (!id) return null;
  const [user, { data }] = await Promise.all([currentUser(), loadMemberships(id)]);
  if (!user) return null;
  const teams: TeamRow[] = (data ?? []).map((m: any) => ({ ...m.teams, role: m.role }));
  const wanted = (await cookies()).get(TEAM)?.value;
  const team = teams.find((t) => t.id === wanted) ?? teams[0] ?? null;
  return { user, teams, team };
});

export async function createTeam(name: string, ownerId: string) {
  const { data: team, error } = await db.from("teams").insert({ name: name.slice(0, 80), owner_id: ownerId }).select("id").single();
  if (error) throw error;
  await db.from("memberships").insert({ team_id: team.id, user_id: ownerId, role: "owner" });
  return team.id as string;
}

// E-mails go through n8n (webhook "agentproof-mail", answers after its Send Email node).
// True only when the SMTP node really sent it (its output carries a messageId), so a disabled node never looks like success.
export async function sendMail(to: string, subject: string, text: string, link: string) {
  if (!process.env.N8N_MAIL_URL) return false;
  const res = await fetch(process.env.N8N_MAIL_URL, {
    signal: AbortSignal.timeout(15_000),
    method: "POST",
    // n8n drops calls without this secret: the webhook can only send mail on AgentProof's behalf.
    headers: { "Content-Type": "application/json", "x-agentproof-secret": process.env.TICK_SECRET ?? "" },
    body: JSON.stringify({ to, subject, text, link }),
  }).catch(() => null);
  const out = res?.ok ? await res.json().catch(() => null) : null;
  return !!out?.messageId;
}

// AgentProof's own team (not customer teams): real payment tests are R&D, run with our zero-balance card.
// STAFF_EMAILS="a@x.com,b@y.com" on Vercel; default is Georges only.
export async function staffUser() {
  const user = await currentUser();
  const staff = (process.env.STAFF_EMAILS ?? "gdo@eugeniaschool.com").split(",").map((e) => e.trim().toLowerCase());
  return { user, isStaff: !!user && staff.includes(user.email.toLowerCase()) };
}

// A payment replay shows the team's card on screen: only that team sees it. A test without a team (staff R&D page) uses
// AgentProof's own card: staff only.
export async function canSeePayment(teamId: string | null) {
  if (!teamId) return (await staffUser()).isStaff;
  const ctx = await teamContext();
  return !!ctx?.teams.some((t) => t.id === teamId);
}
