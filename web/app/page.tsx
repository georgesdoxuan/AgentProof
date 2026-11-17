import Link from "next/link";
import { connection } from "next/server";
import { db } from "@/lib/engine";
import { ScoreBar, scoreColor } from "@/lib/ui";

export default async function Home() {
  await connection();
  const { data: top } = await db.from("site_scores").select("*").eq("device", "desktop").order("score", { ascending: false }).limit(5);

  return (
    <div className="space-y-16">
      <section className="space-y-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Client mystère IA</p>
        <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          On envoie un agent IA acheter sur ton site e-commerce.
        </h1>
        <p className="max-w-2xl text-lg text-stone-600">
          Demain, des agents IA feront les courses. Bandeau cookies, pop-up, sélecteur de taille, captcha : s&apos;ils bloquent l&apos;agent, il achète chez le concurrent.
          AgentProof le teste pour de vrai, captures d&apos;écran à l&apos;appui.
        </p>
      </section>

      <section id="tester" className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Teste ton site</h2>
        <p className="mt-1 text-sm text-stone-600">5 missions d&apos;achat réelles, jusqu&apos;à la première page du checkout. L&apos;agent ne paie jamais. Compte environ 10 à 20 minutes.</p>
        <form action="/api/audits" method="post" className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
          <input name="url" required placeholder="ton-site.fr" className="rounded-lg border border-stone-300 px-3 py-2" aria-label="URL de ton site" />
          <input name="competitor" placeholder="concurrent.fr (optionnel)" className="rounded-lg border border-stone-300 px-3 py-2" aria-label="URL d'un concurrent" />
          <select name="device" className="rounded-lg border border-stone-300 px-3 py-2" aria-label="Appareil">
            <option value="desktop">Ordinateur</option>
            <option value="mobile">Mobile</option>
          </select>
          <button className="rounded-lg bg-stone-900 px-5 py-2 font-semibold text-white hover:bg-stone-700">Lancer l&apos;audit</button>
        </form>
      </section>

      <section className="grid gap-6 sm:grid-cols-3">
        {[
          ["1. Missions", "Chercher, filtrer, choisir une taille, remplir le panier, aller au checkout. Comme un vrai client."],
          ["2. Preuves", "Score de réussite, capture de l'écran où l'agent abandonne, replay de chaque session."],
          ["3. Corrections", "Les blocages classés par impact, un plan de corrections, et la comparaison avec ton concurrent."],
        ].map(([t, d]) => (
          <div key={t} className="rounded-xl border border-stone-200 bg-white p-5">
            <h3 className="font-semibold">{t}</h3>
            <p className="mt-2 text-sm text-stone-600">{d}</p>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold">Classement mode France</h2>
          <Link href="/classement" className="text-sm font-medium text-emerald-700 hover:underline">Voir tout</Link>
        </div>
        {top?.length ? (
          <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
            {top.map((s, i) => (
              <li key={s.audit_id}>
                <Link href={`/audit/${s.audit_id}`} className="grid grid-cols-[2rem_1fr_8rem_3rem] items-center gap-3 px-4 py-3 hover:bg-stone-50">
                  <span className="text-stone-400">{i + 1}</span>
                  <span className="font-medium">{s.name}</span>
                  <ScoreBar score={s.score} />
                  <span className={`text-right font-bold ${scoreColor(s.score)}`}>{s.score ?? "—"}%</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-stone-500">Les premiers audits sont en cours.</p>
        )}
      </section>
    </div>
  );
}
