import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FooterNote, Nav, Sections } from "./nav";
import { NavProgress } from "./progress";
import { currentUser } from "@/lib/auth";
import { Icon, Mark, Wordmark } from "@/lib/ui";
import { getDict, getLang } from "@/lib/lang";
import { LEGAL_PAGES } from "@/lib/legal";
import { CookieNotice } from "./cookie-notice";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const en = (await getLang()) === "en";
  return {
    title: en ? "AgentProof · The AI mystery shopper for your e-commerce site" : "AgentProof · Le client mystère IA de ton site e-commerce",
    description: en
      ? "Check that an AI agent can buy from your store: where it gets stuck, with screenshots, and what to fix."
      : "Vérifie qu'un agent IA peut acheter sur ta boutique : où il bloque, captures à l'appui, et quoi corriger.",
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const lang = await getLang();
  const t = await getDict();
  return (
    <html lang={lang} data-scroll-behavior="smooth">
      <body className="flex min-h-screen flex-col antialiased">
        <Suspense fallback={null}>
          <NavProgress />
        </Suspense>
        <a
          href="#contenu"
          className="sr-only type-small focus:not-sr-only focus:fixed focus:left-4 focus:top-2 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-bg"
        >
          {t.skip}
        </a>
        <header className="sticky top-0 z-40 border-b border-hairline bg-[var(--nav)] backdrop-blur-[20px] backdrop-saturate-[180%]">
          <nav className="relative flex min-h-[52px] px-6 sm:px-8 lg:px-6 flex-wrap items-center justify-between" aria-label={t.navLabel}>
            <Link href="/" aria-label={t.home} className="-ml-1 flex items-center gap-2.5 rounded-md px-1 py-2">
              <Mark className="h-[32px] w-[32px] max-[734px]:h-[28px] max-[734px]:w-[28px]" />
              <Wordmark className="text-[21px] leading-none max-[734px]:text-[19px]" />
            </Link>
            <Sections t={t.sections} />
            <Nav email={(await currentUser())?.email ?? null} t={t.nav} lang={lang} langLabel={t.footer.language} />
          </nav>
        </header>
        {/* The page fills the window, so a short page never leaves a band of another color under the footer. */}
        <main id="contenu" className="flex flex-1 flex-col">{children}</main>
        {/* SaaS footer (Linear, Vercel, Stripe): brand and one line on the left, link columns, then fine print. */}
        <footer className="bg-bg-2 type-caption text-ink-2">
          <div className="wrap-wide border-t border-line">
            <div className="grid gap-x-8 gap-y-10 py-12 sm:grid-cols-[1fr_auto_auto_auto] max-sm:grid-cols-2 max-sm:py-10">
              <div className="max-sm:col-span-2">
                <Link href="/" aria-label={t.home} className="-ml-0.5 inline-flex items-center gap-2 rounded-md">
                  <Mark className="h-6 w-6" />
                  <Wordmark className="type-body leading-none text-ink" />
                </Link>
                <p className="mt-3 max-w-[30ch]">{t.footer.tagline}</p>
              </div>
              <FooterColumn title={t.footer.product} links={[
                ["/methode", t.footer.method],
                ["/classement", t.footer.ranking],
                ["/#tarifs", t.footer.pricing],
                ["/faq", t.footer.help],
              ]} />
              <FooterColumn title={t.footer.legal} links={LEGAL_PAGES.map((p) => [p.href, lang === "en" ? p.en : p.fr])} />
              <FooterColumn title={t.footer.follow} links={[["https://www.instagram.com/unstock.ai/", "Instagram — Unstock", t.footer.newTab]]} />
            </div>
            <div className="flex flex-col gap-3 border-t border-line py-6 text-[12px] leading-[1.5]">
              <p className="flex items-start gap-1.5"><Icon name="shield" className="mt-px h-3.5 w-3.5" />{t.footer.rules}</p>
              <ul className="flex flex-wrap gap-x-5 gap-y-1.5">
                <li>© 2026 {t.footer.event.replace(/\.$/, "")}</li>
                <li className="flex items-center gap-1.5"><Icon name="sparkle" className="h-3.5 w-3.5" />{t.footer.agent}</li>
                <li className="flex items-center gap-1.5"><Icon name="eye" className="h-3.5 w-3.5" />{t.footer.judge}</li>
              </ul>
              <FooterNote text={t.footer.source} />
            </div>
          </div>
        </footer>
        <CookieNotice text={t.footer.cookies} short={t.footer.cookiesShort} more={t.footer.cookiesMore} ok={t.footer.cookiesOk} />
      </body>
    </html>
  );
}

// One footer column: a small title in ink, then plain grey links. External links open in a new tab, said aloud.
function FooterColumn({ title, links }: { title: string; links: [string, string, string?][] }) {
  return (
    <nav aria-label={title}>
      <p className="font-semibold text-ink">{title}</p>
      <ul className="mt-3 space-y-2">
        {links.map(([href, label, newTab]) => (
          <li key={href}>
            {newTab ? (
              // A plain link, no embed: nothing from Instagram loads until the visitor clicks.
              <a href={href} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-ink">
                {label}<span className="sr-only"> ({newTab})</span>
              </a>
            ) : (
              <Link href={href} className="transition-colors hover:text-ink">{label}</Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
