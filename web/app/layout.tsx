import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentProof — le client mystère IA de ton site e-commerce",
  description: "Un vrai agent IA essaie d'acheter sur ton site. Score, preuves, comparaison et corrections.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-stone-50 text-stone-900 antialiased">
        <header className="border-b border-stone-200 bg-white">
          <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-lg font-bold tracking-tight">
              Agent<span className="text-emerald-600">Proof</span>
            </Link>
            <div className="flex gap-5 text-sm font-medium text-stone-600">
              <Link href="/classement" className="hover:text-stone-900">Classement</Link>
              <Link href="/#tester" className="hover:text-stone-900">Tester mon site</Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-10">{children}</main>
        <footer className="mx-auto max-w-5xl px-4 pb-10 text-xs text-stone-500">
          AgentProof · Hackathon H Company × Hugging Face 2026 · Agent : H Company (Holo) · Juge : Hugging Face. L&apos;agent ne paie jamais et ne saisit aucune donnée personnelle.
        </footer>
      </body>
    </html>
  );
}
