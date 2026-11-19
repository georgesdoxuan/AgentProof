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

// Per-person e-mail preferences (Automations page), stored as rows of email_optouts so no migration is needed:
// "a@b.c" = no alerts (same row as the one-click unsubscribe), "report:a@b.c", "digest:a@b.c", "all:a@b.c".
// No row = e-mail on. Sign-in links and invitations never read this: they always go out.
export const MAIL_KINDS = ["alerts", "report", "digest"] as const;
export type MailKind = (typeof MAIL_KINDS)[number] | "all";
const key = (kind: MailKind, email: string) => (kind === "alerts" ? email : `${kind}:${email}`);
export const mailKeys = (email: string) => (["all", ...MAIL_KINDS] as MailKind[]).map((k) => key(k, email));

// Which kinds are on for this address. A read error (table missing) reads as "all on", so e-mails keep working.
export async function mailPrefs(email: string) {
  const { data } = await db.from("email_optouts").select("email").in("email", mailKeys(email));
  const off = new Set((data ?? []).map((r: { email: string }) => r.email));
  return Object.fromEntries((["all", ...MAIL_KINDS] as MailKind[]).map((k) => [k, !off.has(key(k, email))])) as Record<MailKind, boolean>;
}

export async function setMailPref(email: string, kind: MailKind, on: boolean) {
  const { error } = on
    ? await db.from("email_optouts").delete().eq("email", key(kind, email))
    : await db.from("email_optouts").upsert({ email: key(kind, email) }, { onConflict: "email", ignoreDuplicates: true });
  return !error;
}

export async function mailAllowed(email: string, kind: (typeof MAIL_KINDS)[number]) {
  const p = await mailPrefs(email);
  return p.all && p[kind];
}

// Every alert e-mail goes through here: skipped when the person turned that kind off, and always ends with the unsubscribe link.
export async function sendAlert(to: string, subject: string, text: string, link: string, kind: "alerts" | "digest" = "alerts") {
  if (!(await mailAllowed(to, kind))) return false;
  const footer =
    `\n\n—\nTu reçois cet e-mail car une automatisation AgentProof suit ce site. ` +
    `Pour ne plus recevoir d'alertes : ${optoutLink(to)}\n` +
    `Pour choisir tes e-mails : ${process.env.PUBLIC_URL ?? ""}/espace/automations#alertes`;
  return sendMail(to, subject, text + footer, link);
}
