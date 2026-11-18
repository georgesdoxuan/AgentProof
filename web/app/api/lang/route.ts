import { cookies } from "next/headers";
import { safeNext } from "@/lib/auth";
import { LANG_COOKIE, isLang } from "@/lib/i18n";
import { msg } from "@/lib/lang";

// Language picker on the account page: remember the choice for a year, then go back where the user was.
export async function POST(req: Request) {
  const form = await req.formData();
  const lang = form.get("lang");
  if (!isLang(lang)) return new Response(await msg("Langue inconnue.", "Unknown language."), { status: 400, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  (await cookies()).set(LANG_COOKIE, lang, { sameSite: "lax", path: "/", maxAge: 365 * 86400, secure: process.env.NODE_ENV === "production" });
  return Response.redirect(new URL(safeNext(form.get("next")), req.url), 303);
}
