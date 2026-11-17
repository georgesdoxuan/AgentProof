import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Nav } from "./nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentProof — le client mystère IA de ton site e-commerce",
  description: "Un vrai agent IA essaie d'acheter sur ton site. Score, preuves, comparaison et corrections.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f4f0" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0e11" },
  ],
};

function Logo() {
  return (
    <span className="inline-flex items-center gap-2 font-display text-[17px] font-semibold tracking-[-0.01em]">
      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
        <rect width="24" height="24" rx="7" fill="var(--ink)" />
        <path d="M7 5.5l11 6-4.6 1.3L11.5 18z" fill="var(--paper)" />
        <circle cx="17.5" cy="17.5" r="2.5" fill="var(--accent)" />
      </svg>
      AgentProof
    </span>
  );
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body className="min-h-screen antialiased">
        <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-paper">
          Aller au contenu
        </a>
        <header className="sticky top-0 z-40 border-b border-line bg-paper/75 backdrop-blur-xl backdrop-saturate-150">
          <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5" aria-label="Navigation principale">
            <Link href="/" aria-label="AgentProof, accueil" className="rounded-lg">
              <Logo />
            </Link>
            <Nav />
          </nav>
        </header>
        <main id="contenu" className="mx-auto max-w-6xl px-5 pb-24 pt-10 sm:pt-14">
          {children}
        </main>
        <footer className="border-t border-line">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-[13px] text-ink-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2">
              <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-pass" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                <path d="M8 1.5l5.5 2v4c0 3.5-2.4 6-5.5 7-3.1-1-5.5-3.5-5.5-7v-4z" />
                <path d="M5.5 8l1.8 1.8L10.8 6.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              L&apos;agent ne paie jamais, ne saisit aucune donnée personnelle et ne résout aucun captcha.
            </p>
            <p>Agent : H Company (Holo) · Juge visuel : Hugging Face · Hackathon 2026</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
