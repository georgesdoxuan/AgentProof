"use client";
import Link from "next/link";
import { createContext, useContext, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { GLYPH, Glyph } from "@/lib/glyphs";
import { CATEGORIES, CONTACT, FAQ, POPULAR, RELEVANT, search, type Faq } from "@/lib/faq";
import type { Lang } from "@/lib/i18n";

const T = {
  fr: {
    eyebrow: "Aide",
    title: "Questions fréquentes",
    search: "Rechercher dans l’aide",
    placeholder: "Pose ta question",
    clear: "Effacer",
    topics: "Rubriques",
    answers: (n: number) => `${n} réponse${n > 1 ? "s" : ""}`,
    none: "Aucune réponse exacte.",
    close: "Questions proches",
    popular: "Questions populaires",
    contact: "Pas trouvé ?",
    write: "Écris-nous",
  },
  en: {
    eyebrow: "Help",
    title: "Frequently asked questions",
    search: "Search help",
    placeholder: "Ask your question",
    clear: "Clear",
    topics: "Topics",
    answers: (n: number) => `${n} answer${n > 1 ? "s" : ""}`,
    none: "No exact answer.",
    close: "Related questions",
    popular: "Popular questions",
    contact: "Not found?",
    write: "Write to us",
  },
};

const lk = "text-link hover:underline";

// The contact address inside an answer becomes a mail link.
// "{duree}" in an answer is the measured audit time, passed by the page.
const DurationCtx = createContext("6–9 min");

function Answer({ faq, lang }: { faq: Faq; lang: Lang }) {
  const duration = useContext(DurationCtx);
  const parts = faq.a[lang].replace("{duree}", lang === "en" ? duration : duration.replace("–", " à ")).split(CONTACT);
  return (
    <>
      <p>
        {parts.map((p, i) => (
          <span key={i}>
            {i > 0 && <a href={`mailto:${CONTACT}`} className={lk}>{CONTACT}</a>}
            {p}
          </span>
        ))}
      </p>
      {faq.link && (
        <Link href={faq.link.href} className={`${lk} mt-2 inline-flex items-center gap-1`}>
          {faq.link.href === "/espace/abonnement" && <Glyph d={GLYPH.credit} className="mr-0.5 h-[1.05em] w-[1.05em]" />}
          {faq.link[lang]}
          <Arrow />
        </Link>
      )}
    </>
  );
}

const Arrow = () => (
  <svg viewBox="0 0 12 12" className="h-[0.7em] w-[0.7em]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 1.5L8.5 6 4 10.5" />
  </svg>
);

function Item({ faq, lang }: { faq: Faq; lang: Lang }) {
  return (
    <details id={faq.id} className="group scroll-mt-[96px] border-b border-hairline last:border-0">
      <summary className="flex min-h-[56px] cursor-pointer list-none items-center gap-4 px-5 py-3 font-medium text-ink transition-colors hover:bg-fill/40 [&::-webkit-details-marker]:hidden">
        <span className="flex-1">{faq.q[lang]}</span>
        <svg viewBox="0 0 12 12" className="h-3 w-3 shrink-0 text-ink-2 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M1.5 4L6 8.5 10.5 4" />
        </svg>
      </summary>
      <div className="-mt-1 px-5 pb-5 text-ink-2">
        <Answer faq={faq} lang={lang} />
      </div>
    </details>
  );
}

const catName = (id: Faq["cat"], lang: Lang) => CATEGORIES.find((c) => c.id === id)![lang];

export function HelpCenter({ lang, initial, duration }: { lang: Lang; initial: string; duration: string }) {
  return (
    <DurationCtx.Provider value={duration}>
      <Help lang={lang} initial={initial} />
    </DurationCtx.Provider>
  );
}

function Help({ lang, initial }: { lang: Lang; initial: string }) {
  const t = T[lang];
  const [q, setQ] = useState(initial);
  const query = useDeferredValue(q);
  const input = useRef<HTMLInputElement>(null);

  // Strong hits are answers, shown open; weaker ones (or all of them when nothing is strong) are related questions.
  const { answers, close, popular } = useMemo(() => {
    const hits = search(query, lang);
    const top = hits[0]?.score ?? 0;
    const answers = hits.filter((h) => h.score >= RELEVANT && h.score >= top * 0.4).slice(0, 5);
    const close = hits.length ? hits.slice(answers.length, answers.length + 3).map((h) => h.faq) : FAQ.filter((f) => POPULAR.includes(f.id));
    return { answers, close, popular: !hits.length };
  }, [query, lang]);
  const searching = query.trim().length > 0;

  // Keep the query in the address, so a search can be shared or reloaded.
  useEffect(() => {
    const id = setTimeout(() => {
      const url = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : location.pathname;
      history.replaceState(history.state, "", url);
    }, 400);
    return () => clearTimeout(id);
  }, [query]);

  // "/" focuses the search, as in most help centres; a link to #question opens that question.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key === "/" && !/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && !el.isContentEditable) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    const open = () => {
      const d = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (d instanceof HTMLDetailsElement) d.open = true;
    };
    open();
    window.addEventListener("keydown", onKey);
    window.addEventListener("hashchange", open);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("hashchange", open);
    };
  }, []);

  return (
    <>
      <p className="type-eyebrow text-ink-2">{t.eyebrow}</p>
      <h1 className="type-h1 mt-3">{t.title}</h1>

      <form role="search" onSubmit={(e) => e.preventDefault()} className="relative mt-8">
        <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM20 20l-4.9-4.9" />
        </svg>
        <input
          ref={input}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && setQ("")}
          placeholder={t.placeholder}
          aria-label={t.search}
          maxLength={200}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          className="h-14 w-full rounded-[14px] border border-[#86868b] bg-tile pl-12 pr-12 text-[17px] placeholder:text-ink-2 transition-[border-color,box-shadow] duration-200 focus:border-blue focus:shadow-[0_0_0_4px_rgb(0_113_227/0.3)] focus:outline-none dark:border-line [&::-webkit-search-cancel-button]:hidden"
        />
        {q && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              input.current?.focus();
            }}
            aria-label={t.clear}
            className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full text-ink-2 transition-colors hover:text-ink"
          >
            <span className="grid h-5 w-5 place-items-center rounded-full bg-ink-2/25">
              <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M3 3l6 6M9 3l-6 6" />
              </svg>
            </span>
          </button>
        )}
      </form>

      <p aria-live="polite" className="sr-only">
        {searching ? (answers.length ? t.answers(answers.length) : t.none) : ""}
      </p>

      {searching ? (
        <div className="mt-8">
          {answers.length ? (
            <>
              <p className="type-caption px-1 text-ink-2">{t.answers(answers.length)}</p>
              <ul className="mt-3 space-y-3">
                {answers.map(({ faq }) => (
                  <li key={faq.id} className="rounded-[18px] bg-tile px-5 py-4">
                    <p className="type-caption text-ink-2">{catName(faq.cat, lang)}</p>
                    <h2 className="mt-1 font-semibold text-ink">{faq.q[lang]}</h2>
                    <div className="mt-2 text-ink-2">
                      <Answer faq={faq} lang={lang} />
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="px-1 font-medium text-ink">{t.none}</p>
          )}
          {close.length > 0 && (
            <section className="mt-8">
              <h2 className="type-headline mb-3 px-1">{popular ? t.popular : t.close}</h2>
              <div className="overflow-hidden rounded-[18px] bg-tile">
                {close.map((faq) => (
                  <Item key={faq.id} faq={faq} lang={lang} />
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        <>
          <nav aria-label={t.topics} className="-mx-4 mt-5 overflow-x-auto px-4 [scrollbar-width:none]">
            <ul className="flex gap-2 max-[734px]:w-max min-[735px]:flex-wrap">
              {CATEGORIES.map((c) => (
                <li key={c.id}>
                  <a href={`#${c.id}`} className="type-small inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full bg-tile px-3.5 text-ink ring-1 ring-hairline transition-colors hover:bg-fill">
                    {c.id === "credits" && <Glyph d={GLYPH.credit} className="h-[15px] w-[15px] text-ink-2" />}
                    {c[lang]}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          {CATEGORIES.map((c) => (
            <section key={c.id} id={c.id} className="mt-10 scroll-mt-[96px]">
              <h2 className="type-headline mb-3 flex items-center gap-2 px-1">
                {c.id === "credits" && <Glyph d={GLYPH.credit} className="h-5 w-5 text-ink-2" />}
                {c[lang]}
              </h2>
              <div className="overflow-hidden rounded-[18px] bg-tile">
                {FAQ.filter((f) => f.cat === c.id).map((f) => (
                  <Item key={f.id} faq={f} lang={lang} />
                ))}
              </div>
            </section>
          ))}
        </>
      )}

      <p className="mt-12 px-1 text-ink-2">
        {t.contact}{" "}
        <a href={`mailto:${CONTACT}`} className={lk}>
          {t.write}
        </a>
        <span className="max-[480px]:hidden"> · {CONTACT}</span>
      </p>
    </>
  );
}
