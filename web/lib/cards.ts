import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { db } from "./engine";

// One card per team for real payment tests. Number, expiry and CVC are encrypted with CARD_KEY before they reach Supabase;
// the page only ever shows label, holder and last 4 digits.
// ponytail: storing a CVC breaks PCI DSS. Fine for a hackathon test card; a real product needs a vault (Stripe, VGS) instead.
const DEFAULT_ADDRESS = "12 rue de la Paix, 75002 Paris, France";

export type CardView = { source: "stored" | "env"; label: string; last4: string; holder: string; email: string; address: string };
export type CardSecret = CardView & { number: string; expiry: string; cvc: string };

function key() {
  const k = Buffer.from(process.env.CARD_KEY ?? "", "base64");
  if (k.length !== 32) throw new Error("CARD_KEY manquant (32 octets en base64) : impossible de chiffrer la carte.");
  return k;
}

export function seal(v: { number: string; expiry: string; cvc: string }) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([c.update(JSON.stringify(v), "utf8"), c.final()]);
  return [iv, c.getAuthTag(), body].map((b) => b.toString("base64")).join(".");
}

function open(s: string) {
  const [iv, tag, body] = s.split(".").map((p) => Buffer.from(p, "base64"));
  const d = createDecipheriv("aes-256-gcm", key(), iv);
  d.setAuthTag(tag);
  return JSON.parse(Buffer.concat([d.update(body), d.final()]).toString("utf8")) as { number: string; expiry: string; cvc: string };
}

// AgentProof's own Revolut card lives in Vercel env vars, never in the database.
function envCard(label: string | null) {
  const e = process.env;
  for (const k of ["TEST_CARD_NUMBER", "TEST_CARD_EXPIRY", "TEST_CARD_CVC", "TEST_CARD_NAME", "TEST_EMAIL"])
    if (!e[k] || e[k] === "A_REMPLIR") return null;
  return {
    source: "env" as const,
    label: label ?? "Revolut",
    last4: e.TEST_CARD_NUMBER!.replace(/\D/g, "").slice(-4),
    holder: e.TEST_CARD_NAME!,
    email: e.TEST_EMAIL!,
    address: DEFAULT_ADDRESS,
    number: e.TEST_CARD_NUMBER!,
    expiry: e.TEST_CARD_EXPIRY!,
    cvc: e.TEST_CARD_CVC!,
  };
}

// Full card, decrypted: only for the H session request. null when the team has no usable card.
export async function cardSecret(teamId: string | null): Promise<CardSecret | null> {
  if (!teamId) return envCard(null); // staff R&D page: no team, our own card
  const { data } = await db.from("team_cards").select("*").eq("team_id", teamId).maybeSingle();
  if (!data) return null;
  if (data.source === "env") return envCard(data.label);
  return { source: "stored", label: data.label, last4: data.last4, holder: data.holder, email: data.email, address: data.address || DEFAULT_ADDRESS, ...open(data.secret) };
}

// What the team space shows: never the number, expiry or CVC.
export async function cardView(teamId: string): Promise<(CardView & { missing?: boolean }) | null> {
  const { data } = await db.from("team_cards").select("source, label, last4, holder, email, address").eq("team_id", teamId).maybeSingle();
  if (!data) return null;
  if (data.source === "env") {
    const c = envCard(data.label);
    // Row exists but the env vars are not set here (local dev without the card): show it, flagged.
    return c ? { source: c.source, label: c.label, last4: c.last4, holder: c.holder, email: c.email, address: c.address } : { source: "env", label: data.label ?? "Revolut", last4: "····", holder: "", email: "", address: "", missing: true };
  }
  return { ...data, address: data.address || DEFAULT_ADDRESS } as CardView;
}

export const luhn = (n: string) =>
  [...n].reverse().reduce((s, d, i) => s + (i % 2 ? ((+d * 2) % 10) + Math.floor((+d * 2) / 10) : +d), 0) % 10 === 0;
