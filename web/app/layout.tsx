import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Nav } from "./nav";
import { NavProgress } from "./progress";
import { currentUser } from "@/lib/auth";
import { Mark, Wordmark } from "@/lib/ui";
import { getDict, getLang } from "@/lib/lang";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const en = (await getLang()) === "en";
  return {
    title: en ? "AgentProof · The AI mystery shopper for your e-commerce site" : "AgentProof · Le client mystère IA de ton site e-commerce",
    description: en
      ? "A real AI agent tries to buy on your site. Score, proof, comparison and fixes."
      : "Un vrai agent IA essaie d'acheter sur ton site. Score, preuves, comparaison et corrections.",
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
    <html lang={lang}>
      <body className="min-h-screen antialiased">
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
          <nav className="wrap-wide flex h-[52px] items-center justify-between" aria-label={t.navLabel}>
            <Link href="/" aria-label={t.home} className="-ml-1 flex items-center gap-2.5 rounded-md px-1 py-2">
              <Mark className="h-[32px] w-[32px] max-[734px]:h-[28px] max-[734px]:w-[28px]" />
              <Wordmark className="text-[21px] leading-none max-[734px]:text-[19px]" />
            </Link>
            <Nav email={(await currentUser())?.email ?? null} t={t.nav} />
          </nav>
        </header>
        <main id="contenu">{children}</main>
        <footer className="bg-bg-2 type-caption text-ink-2">
          <div className="wrap-wide border-t border-line py-5">
            <p className="flex items-start gap-2 py-2">
              {t.footer.rules}
            </p>
            <div className="mt-2 flex flex-col gap-2 border-t border-line pt-4 sm:flex-row sm:justify-between">
              <p>{t.footer.event}</p>
              <p className="flex flex-wrap gap-x-4 gap-y-1">
                <span>{t.footer.credits}</span>
                <Link href="/methode" className="hover:text-ink hover:underline">{t.footer.method}</Link>
                <Link href="/confidentialite" className="hover:text-ink hover:underline">{t.footer.privacy}</Link>
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
