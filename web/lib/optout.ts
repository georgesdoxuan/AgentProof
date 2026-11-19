import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { sendMail } from "./auth";
import { db } from "./engine";

// Unsubscribe from alert e-mails (page changed, score drop), in one click from the e-mail, without signing in.
// The link carries the address and an HMAC of it: nobody can unsubscribe someone else.
// Sign-in links and reports the person asked for are not alerts and still go out.
const SECRET = process.env.AUTH_SECRET ?? process.env.TICK_SECRET ?? "";
const mac = (email: string) => createHmac("sha256", SECRET).update(`optout:${email}`).digest("base64url");

export const optoutLink = (email: string) =>
  `${process.env.PUBLIC_URL ?? ""}/desinscription?${new URLSearchParams({ e: email, s: mac(email) })}`;

export function validOptout(email: string, sig: string) {
  const a = Buffer.from(mac(email));
  const b = Buffer.from(sig);
  return !!SECRET && a.length === b.length && timingSafeEqual(a, b);
}

export async function optOut(email: string) {
  const { error } = await db.from("email_optouts").upsert({ email }, { onConflict: "email", ignoreDuplicates: true });
  return !error;
}

// Missing table (migration not applied yet) reads as "not opted out", so alerts keep working.
async function optedOut(email: string) {
  const { data } = await db.from("email_optouts").select("email").eq("email", email).maybeSingle();
  return !!data;
}

// Every alert e-mail goes through here: skipped for opted-out addresses, and always ends with the unsubscribe link.
export async function sendAlert(to: string, subject: string, text: string, link: string) {
  if (await optedOut(to)) return false;
  const footer =
    `\n\n—\nTu reçois cette alerte car une automatisation AgentProof suit ce site. ` +
    `Pour ne plus recevoir d'alertes : ${optoutLink(to)}\n` +
    `Pour régler les alertes de ton équipe : ${process.env.PUBLIC_URL ?? ""}/espace/automations`;
  return sendMail(to, subject, text + footer, link);
}
