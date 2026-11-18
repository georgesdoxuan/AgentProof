import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Nav } from "./nav";
import { currentUser } from "@/lib/auth";
import { Mark } from "@/lib/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentProof · Le client mystère IA de ton site e-commerce",
  description: "Un vrai agent IA essaie d'acheter sur ton site. Score, preuves, comparaison et corrections.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body className="min-h-screen antialiased">
        <a
          href="#contenu"
          className="sr-only type-small focus:not-sr-only focus:fixed focus:left-4 focus:top-2 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-bg"
        >
          Aller au contenu
        </a>
        <header className="sticky top-0 z-40 border-b border-hairline bg-[var(--nav)] backdrop-blur-[20px] backdrop-saturate-[180%]">
          <nav className="wrap-wide flex h-[52px] items-center justify-between" aria-label="Navigation principale">
            <Link href="/" aria-label="AgentProof, accueil" className="-ml-1 flex items-center gap-2.5 rounded-md px-1 py-2">
              <Mark />
              <span className="text-[21px] font-semibold leading-none tracking-[0.011em] max-[734px]:text-[19px]">AgentProof</span>
            </Link>
            <Nav signedIn={!!(await currentUser())} />
          </nav>
        </header>
        <main id="contenu">{children}</main>
        <footer className="bg-bg-2 type-caption text-ink-2">
          <div className="wrap-wide border-t border-line py-5">
            <p className="flex items-start gap-2 py-2">
              Pendant un audit, l&apos;agent ne paie jamais, ne saisit aucune donnée personnelle et ne résout aucun captcha. Il s&apos;arrête à la première page du checkout.
            </p>
            <div className="mt-2 flex flex-col gap-2 border-t border-line pt-4 sm:flex-row sm:justify-between">
              <p>AgentProof · Hackathon H Company × Hugging Face, novembre 2026.</p>
              <p className="flex flex-wrap gap-x-4 gap-y-1">
                <span>Agent : Holo, H Company. Juge visuel : Hugging Face.</span>
                <Link href="/methode" className="hover:text-ink hover:underline">Méthode</Link>
                <Link href="/confidentialite" className="hover:text-ink hover:underline">Confidentialité et mentions légales</Link>
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
