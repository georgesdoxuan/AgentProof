import Link from "next/link";
import { LEGAL, LEGAL_EN, LEGAL_PAGES } from "@/lib/legal";
import type { Lang } from "@/lib/i18n";

// Shared frame of the legal pages: same 760px column as /methode, a row of links to the other legal pages,
// and a notice that the text is a template awaiting a lawyer's review.
export function LegalPage({ lang, path, title, children }: { lang: Lang; path: string; title: string; children: React.ReactNode }) {
  const en = lang === "en";
  return (
    <div className="bg-bg-2 pb-24 pt-16 max-[734px]:pt-10">
      <article className="wrap max-w-[760px]">
        <p className="type-eyebrow text-ink-2">{en ? `Updated on ${LEGAL_EN.updated}` : `Mis à jour le ${LEGAL.updated}`}</p>
        <h1 className="type-h1 mt-3">{title}</h1>
        <nav aria-label={en ? "Legal pages" : "Pages légales"} className="mt-6">
          <ul className="flex flex-wrap gap-2">
            {LEGAL_PAGES.map((p) => (
              <li key={p.href}>
                <Link
                  href={p.href}
                  aria-current={p.href === path ? "page" : undefined}
                  className="type-small inline-flex min-h-9 items-center rounded-full bg-tile px-3.5 text-ink transition-colors hover:bg-fill aria-[current=page]:bg-ink aria-[current=page]:text-bg"
                >
                  {en ? p.en : p.fr}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="type-small mt-8 rounded-[12px] bg-tile p-4 text-ink-2">
          {en
            ? "Template written by the AgentProof team, to be reviewed by a lawyer. Fields marked “to be completed” are not decided yet."
            : "Modèle rédigé par l’équipe AgentProof, à faire relire par un juriste. Les champs marqués « à compléter » ne sont pas encore décidés."}
        </p>
        {children}
      </article>
    </div>
  );
}

export const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mt-12">
    <h2 className="type-h3">{title}</h2>
    <div className="mt-3 space-y-3 text-ink-2">{children}</div>
  </section>
);

// A value the team still has to provide: shown as is when set, otherwise as a visible mark, never as a guess.
export function Val({ v, lang }: { v: string | null | undefined; lang: Lang }) {
  if (v) return <>{v}</>;
  return (
    <mark className="whitespace-nowrap rounded-[6px] bg-[color-mix(in_srgb,var(--warn,#b25000)_16%,transparent)] px-1.5 py-0.5 font-semibold text-ink">
      {lang === "en" ? "to be completed" : "à compléter"}
    </mark>
  );
}

export const Mail = () => (
  <a href={`mailto:${LEGAL.contact}`} className="text-link hover:underline">
    {LEGAL.contact}
  </a>
);

// One row per data processor: who, what for, where.
export function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="-mx-1 overflow-x-auto rounded-[14px] bg-tile">
      <table className="type-small w-full min-w-[560px] text-left">
        <thead>
          <tr className="border-b border-hairline text-ink">
            {head.map((h) => (
              <th key={h} scope="col" className="px-4 py-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-hairline last:border-0 align-top">
              {r.map((c, j) =>
                j === 0 ? (
                  <th key={j} scope="row" className="px-4 py-3 font-semibold text-ink">
                    {c}
                  </th>
                ) : (
                  <td key={j} className="px-4 py-3">
                    {c}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
