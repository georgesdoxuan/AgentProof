import "server-only";
import { createHash } from "node:crypto";
import { unstable_cache } from "next/cache";
import { after } from "next/server";
import { hf } from "./engine";
import type { Lang } from "./i18n";

// The agent (H Holo) and the judges write in whatever language they like, often English.
// Their free text is shown in the interface language: translated on first display by the same light HF model as the
// judge, then kept in the Next data cache (no table, works for old reports and jury copies alike, no DB write).
// Only text already masked for display is sent (card scrubbed before), to the provider that already judges the runs.
// The original stays in the database and on screen behind « Texte original » (OriginalText in clamp.tsx).

const FR = /\b(le|la|les|des|du|une|est|sont|pas|avec|dans|sur|pour|été|j'ai|l'agent|aucun|mais|puis|qui|nous|je|vais|cliquer|trouver)\b/gi;
const EN = /\b(the|and|is|was|were|to|of|with|on|for|has|have|not|this|that|i|clicked|reached|page)\b/gi;

// Rough guess, good enough to skip text already in the right language: no call, no cost.
export function guessLang(s: string): Lang | null {
  const fr = s.match(FR)?.length ?? 0;
  const en = s.match(EN)?.length ?? 0;
  return fr > en ? "fr" : en > fr ? "en" : null;
}

const NAMES: Record<Lang, string> = { fr: "French", en: "English" };
const PARALLEL = 3; // a long replay is ~50 thoughts: a few seconds on its first view, then cached

// One text per call, plain text back: no JSON to break, and each text is cached on its own (a live audit adding a
// mission only translates the new one).
async function callHf(text: string, lang: Lang): Promise<string> {
  const out = await hf(
    [
      {
        role: "user",
        content:
          `Translate this text into ${NAMES[lang]}. Keep URLs, product names, prices, numbers and text quoted from the website unchanged. Keep the word "checkout" as is (it is not the payment page). ` +
          `Keep line breaks and numbering. Reply with the translation only.\n\n${text}`,
      },
    ],
    text.length + 200,
    30_000,
  );
  // Throwing caches nothing: the original shows and the next view tries again.
  if (!out.trim() || out.length > text.length * 3 + 100) throw new Error("traduction illisible");
  return out.trim();
}

const cached = (text: string, lang: Lang) =>
  unstable_cache(() => callHf(text, lang), ["tr3", lang, createHash("sha256").update(text).digest("base64url")], { revalidate: false })();

// Same length and order as `texts`; a text already in `lang`, empty, or whose translation failed comes back unchanged.
// The page waits `waitMs` at most: what is not translated by then shows as written, and the calls finish after the
// response (after()) to fill the cache for the next view.
export async function translate<T extends string | null | undefined>(texts: T[], lang: Lang, waitMs = 8000): Promise<(T | string)[]> {
  const todo = [...new Set(texts.filter((t): t is NonNullable<T> & string => !!t?.trim() && guessLang(t) !== null && guessLang(t) !== lang))];
  if (!todo.length) return texts;
  const map = new Map<string, string>();
  const queue = [...todo];
  const worker = async () => {
    for (let t = queue.shift(); t; t = queue.shift())
      await cached(t, lang).then(
        (out) => map.set(t, out),
        (e) => console.error("translate", e instanceof Error ? e.message : e),
      );
  };
  const all = Promise.all(Array.from({ length: Math.min(PARALLEL, todo.length) }, worker));
  after(() => all);
  await Promise.race([all, new Promise((r) => setTimeout(r, waitMs))]);
  return texts.map((t) => (t && map.get(t)) || t);
}

// The free-text fields of a run, translated, on `r.tr` (original fields untouched: verdict rules read them).
export type RunTr = { detail?: string | null; summary?: string | null; judge?: string | null };
export async function translateRuns<R extends { blocker_detail?: string | null; agent_answer?: any; judge?: any; tr?: RunTr }>(runs: R[], lang: Lang) {
  // site_message stays as is: it quotes the site, in the site's language.
  const out = await translate(runs.flatMap((r) => [r.blocker_detail, r.agent_answer?.steps_summary, r.judge?.reason] as (string | null | undefined)[]), lang);
  runs.forEach((r, i) => (r.tr = { detail: out[i * 3], summary: out[i * 3 + 1], judge: out[i * 3 + 2] }));
  return runs;
}
