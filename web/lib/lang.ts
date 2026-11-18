import { cookies } from "next/headers";
import { DEFAULT_LANG, LANG_COOKIE, dict, isLang, type Lang } from "./i18n";

// The interface language chosen on the account page, kept in a cookie so it works signed in or not.
export async function getLang(): Promise<Lang> {
  const v = (await cookies()).get(LANG_COOKIE)?.value;
  return isLang(v) ? v : DEFAULT_LANG;
}

export const getDict = async () => dict(await getLang());
