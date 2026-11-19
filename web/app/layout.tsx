import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LangSwitch, Nav, Sections } from "./nav";
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
          <nav className="wrap-wide relative flex min-h-[52px] flex-wrap items-center justify-between" aria-label={t.navLabel}>
            <Link href="/" aria-label={t.home} className="-ml-1 flex items-center gap-2.5 rounded-md px-1 py-2">
              <Mark className="h-[32px] w-[32px] max-[734px]:h-[28px] max-[734px]:w-[28px]" />
              <Wordmark className="text-[21px] leading-none max-[734px]:text-[19px]" />
            </Link>
            <Sections t={t.sections} />
            <Nav email={(await currentUser())?.email ?? null} t={t.nav} />
          </nav>
        </header>
        {/* The page fills the window, so a short page never leaves a band of another color under the footer. */}
        <main id="contenu" className="flex flex-1 flex-col">{children}</main>
        <footer className="bg-bg-2 type-caption text-ink-2">
          <div className="wrap-wide border-t border-line py-5">
            <p className="flex items-start gap-2 py-2">
              <Icon name="shield" className="mt-px h-4 w-4 shrink-0" />
              {t.footer.rules}
            </p>
            <div className="mt-2 flex flex-col gap-2 border-t border-line pt-4 sm:flex-row sm:justify-between">
              <p>{t.footer.event}</p>
              {/* A div, not a p: the language switch is a form, and a form inside a p breaks hydration. */}
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <span>{t.footer.credits}</span>
                <Link href="/methode" className="hover:text-ink hover:underline">{t.footer.method}</Link>
                <Link href="/faq" className="hover:text-ink hover:underline">{lang === "en" ? "Help" : "Aide"}</Link>
                <LangSwitch lang={lang} />
              </div>
            </div>
            <nav aria-label={t.footer.legal} className="mt-3 border-t border-line pt-4">
              <ul className="flex flex-wrap gap-x-4 gap-y-1">
                {LEGAL_PAGES.map((p) => (
                  <li key={p.href}>
                    <Link href={p.href} className="inline-flex min-h-6 items-center hover:text-ink hover:underline">{lang === "en" ? p.en : p.fr}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </footer>
        <CookieNotice text={t.footer.cookies} short={t.footer.cookiesShort} more={t.footer.cookiesMore} ok={t.footer.cookiesOk} />
      </body>
    </html>
  );
}
