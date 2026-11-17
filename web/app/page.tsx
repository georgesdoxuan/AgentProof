import Link from "next/link";
import { connection } from "next/server";
import { db } from "@/lib/engine";
import { AgentCursor, BrowserFrame, Eyebrow, MissionDots, ScoreBar, SectionTitle, Stamp, ToneLabel, scoreColor } from "@/lib/ui";

export default async function Home() {
  await connection();
  const { data: top } = await db.from("site_scores").select("*").eq("device", "desktop").order("score", { ascending: false, nullsFirst: false }).limit(5);

  return (
    <div className="space-y-24 sm:space-y-28">
      {/* Hero */}
      <section className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
        <div className="space-y-6">
          <Eyebrow>Client mystère IA · Mode France</Eyebrow>
          <h1 className="font-display text-[40px] font-semibold leading-[1.05] tracking-[-0.035em] text-balance sm:text-[56px]">
            Un agent IA essaie d&apos;acheter sur ton site.
            <span className="text-ink-3"> On te montre où il bloque.</span>
          </h1>
          <p className="max-w-xl text-[19px] leading-relaxed text-ink-2 text-pretty">
            Demain, des agents feront les courses. Si un bandeau cookies, une pop-up ou un sélecteur de taille les arrête, ils achètent chez le concurrent. AgentProof envoie un vrai agent et te rapporte la preuve.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <a href="#tester" className="inline-flex h-12 items-center rounded-full bg-accent px-6 text-[16px] font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.98] dark:text-paper">
              Tester mon site
            </a>
            <Link href="/classement" className="inline-flex h-12 items-center rounded-full border border-line bg-card px-6 text-[16px] font-semibold transition-colors hover:bg-card-2">
              Voir le classement
            </Link>
          </div>
          <p className="max-w-lg border-l-2 border-line pl-4 text-[14px] leading-relaxed text-ink-3">
            63 % des responsables e-commerce disent que leur tunnel d&apos;achat ne peut pas être finalisé par un agent IA.
            <span className="block text-[12px]">Blend Commerce, sondage auprès de 59 responsables, juillet–août 2026.</span>
          </p>
        </div>

        <figure className="relative">
          <BrowserFrame url="https://boutique-exemple.fr/pull-col-rond-noir">
            <ProductMock />
          </BrowserFrame>
          <figcaption className="mt-3 text-center text-[13px] text-ink-3">
            Ce que voit l&apos;agent : le bandeau cookies masque « Ajouter au panier ».
          </figcaption>
        </figure>
      </section>

      {/* Form */}
      <section id="tester" className="scroll-mt-24">
        <div className="rounded-[28px] border border-line bg-card p-6 shadow-card sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:gap-12">
            <div className="space-y-3">
              <h2 className="font-display text-[28px] font-semibold tracking-[-0.02em]">Tester mon site</h2>
              <p className="text-ink-2">5 missions d&apos;achat réelles, jusqu&apos;à la première page du checkout.</p>
              <ul className="space-y-2 pt-2 text-[15px] text-ink-2">
                {["Environ 10 à 20 minutes", "Captures et replay de chaque mission", "L'agent ne paie jamais"].map((t) => (
                  <li key={t} className="flex items-center gap-2.5">
                    <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-pass" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M3.5 8.5l3 3 6-7" />
                    </svg>
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            <form action="/api/audits" method="post" className="grid gap-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Adresse de ton site" name="url" placeholder="ton-site.fr" required />
                <Field label="Un concurrent" hint="Optionnel" name="competitor" placeholder="concurrent.fr" />
              </div>
              <fieldset>
                <legend className="mb-2 text-[14px] font-semibold">Appareil</legend>
                <div className="inline-grid grid-cols-2 rounded-xl bg-card-2 p-1">
                  {[
                    ["desktop", "Ordinateur"],
                    ["mobile", "Mobile"],
                  ].map(([v, l]) => (
                    <label key={v} className="relative cursor-pointer">
                      <input type="radio" name="device" value={v} defaultChecked={v === "desktop"} className="peer sr-only" />
                      <span className="flex h-10 items-center justify-center rounded-lg px-5 text-[15px] font-medium text-ink-2 transition peer-checked:bg-card peer-checked:text-ink peer-checked:shadow-card peer-focus-visible:outline-2 peer-focus-visible:outline-accent">
                        {l}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="flex flex-wrap items-center gap-4 pt-1">
                <button className="inline-flex h-12 items-center gap-2 rounded-full bg-accent px-6 text-[16px] font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.98] dark:text-paper">
                  Lancer l&apos;audit
                  <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M3 8h10M9 4l4 4-4 4" />
                  </svg>
                </button>
                <p className="text-[13px] text-ink-3">Le rapport s&apos;ouvre tout de suite et se remplit pendant l&apos;audit.</p>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section>
        <SectionTitle>Comment ça marche</SectionTitle>
        <ol className="grid gap-4 sm:grid-cols-3">
          {[
            ["Missions", "L'agent cherche, filtre, choisit une taille, remplit le panier et va jusqu'au checkout. Comme un vrai client.", "M3 4h10M3 8h7M3 12h4"],
            ["Preuves", "Un score de réussite, la capture de l'écran où l'agent abandonne et le replay de chaque session.", "M2 4.5h12v8H2zM5.5 4.5l1-2h3l1 2M8 10.5a2 2 0 100-4 2 2 0 000 4z"],
            ["Corrections", "Les blocages classés par impact, un plan de corrections et la comparaison avec ton concurrent.", "M10.5 2.5l3 3-7.5 7.5H3v-3z"],
          ].map(([t, d, icon], i) => (
            <li key={t} className="rounded-2xl border border-line bg-card p-6">
              <div className="flex items-center justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent">
                  <svg viewBox="0 0 16 16" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d={icon} />
                  </svg>
                </span>
                <span className="font-mono text-[13px] text-ink-3">Étape {i + 1}</span>
              </div>
              <h3 className="mt-5 text-[19px] font-semibold tracking-[-0.01em]">{t}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Leaderboard */}
      <section>
        <SectionTitle
          aside={
            <Link href="/classement" className="inline-flex h-11 items-center text-[15px] font-semibold text-accent hover:underline">
              Tout le classement
            </Link>
          }
        >
          Classement mode France
        </SectionTitle>
        {top?.length ? (
          <ul className="overflow-hidden rounded-2xl border border-line bg-card">
            {top.map((s, i) => (
              <li key={s.audit_id} className="border-b border-line last:border-0">
                <Link
                  href={`/audit/${s.audit_id}`}
                  className="grid grid-cols-[2rem_1fr_auto] items-center gap-x-4 gap-y-2 px-5 py-4 transition-colors hover:bg-card-2/60 sm:grid-cols-[2rem_1fr_auto_10rem_4rem]"
                >
                  <span className="font-mono text-[14px] text-ink-3 tnum">{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-[17px] font-semibold">{s.name}</span>
                  <span className={`text-right text-[17px] font-semibold tnum sm:order-last ${scoreColor(s.score)}`}>{s.score ?? "—"} %</span>
                  <span className="hidden sm:block">
                    <MissionDots ok={s.runs_success ?? 0} done={s.runs_scored ?? 0} total={s.runs_scored ?? 0} />
                  </span>
                  <span className="hidden sm:block">
                    <ScoreBar score={s.score} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-2xl border border-dashed border-line p-8 text-center">
            <p className="font-semibold">Les premiers audits tournent.</p>
            <p className="mt-1 text-[15px] text-ink-2">
              Lance le tien en attendant : <a href="#tester" className="font-semibold text-accent hover:underline">tester mon site</a>.
            </p>
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-[13px] text-ink-3">
          <span>Lecture :</span>
          <ToneLabel score={80} />
          <ToneLabel score={50} />
          <ToneLabel score={10} />
        </div>
      </section>
    </div>
  );
}

function Field({ label, hint, name, placeholder, required }: { label: string; hint?: string; name: string; placeholder: string; required?: boolean }) {
  return (
    <label className="grid gap-2">
      <span className="flex items-baseline justify-between text-[14px] font-semibold">
        {label}
        {hint && <span className="font-normal text-ink-3">{hint}</span>}
      </span>
      <input
        name={name}
        required={required}
        placeholder={placeholder}
        inputMode="url"
        autoComplete="url"
        autoCapitalize="none"
        spellCheck={false}
        className="h-12 rounded-xl border border-line bg-paper px-4 text-[17px] placeholder:text-ink-3 transition focus:border-accent focus:bg-card focus:outline-none focus:ring-4 focus:ring-accent-soft"
      />
    </label>
  );
}

// Static illustration of a product page as the agent sees it, blocked by a cookie banner.
function ProductMock() {
  return (
    <div className="relative aspect-[4/3.4] select-none bg-card text-ink" aria-hidden>
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <span className="font-display text-[13px] font-bold tracking-[0.2em]">MAISON</span>
        <span className="flex gap-3">
          <span className="h-2 w-10 rounded-full bg-card-2" />
          <span className="h-2 w-8 rounded-full bg-card-2" />
          <span className="h-2 w-12 rounded-full bg-card-2" />
        </span>
      </div>
      <div className="grid grid-cols-[1fr_1fr] gap-5 p-5">
        <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-[linear-gradient(160deg,#3a3d45,#1b1d22)]">
          <svg viewBox="0 0 100 120" className="absolute inset-0 h-full w-full">
            <path d="M30 25l12-6h16l12 6 14 22-12 7-6-9v58H34V45l-6 9-12-7z" fill="#0f1013" stroke="#4a4e57" strokeWidth="0.6" />
            <path d="M42 19c2 6 14 6 16 0" fill="none" stroke="#4a4e57" strokeWidth="0.8" />
          </svg>
        </div>
        <div className="space-y-3">
          <span className="block h-2 w-16 rounded-full bg-card-2" />
          <p className="text-[15px] font-semibold leading-tight">Pull col rond en laine, noir</p>
          <p className="text-[15px] tnum">49,90 €</p>
          <p className="pt-1 text-[11px] font-semibold text-ink-3">Taille</p>
          <div className="flex gap-1.5">
            {["S", "M", "L", "XL"].map((t) => (
              <span key={t} className={`grid h-7 w-7 place-items-center rounded-md border text-[11px] ${t === "M" ? "border-ink bg-ink text-paper" : "border-line"}`}>
                {t}
              </span>
            ))}
          </div>
          <span className="relative mt-2 block">
            <span className="flex h-9 items-center justify-center rounded-md bg-ink text-[12px] font-semibold text-paper">Ajouter au panier</span>
          </span>
        </div>
      </div>
      {/* Cookie banner */}
      <div className="absolute inset-x-0 bottom-0 top-[48%] border-t border-line bg-card-2/95 p-5 shadow-[0_-12px_32px_-12px_rgb(0_0_0/0.35)] backdrop-blur">
        <p className="text-[13px] font-semibold">Nous respectons votre vie privée</p>
        <p className="mt-1 text-[11px] leading-snug text-ink-2">Nous utilisons des cookies pour améliorer votre expérience, mesurer l&apos;audience et personnaliser…</p>
        <div className="mt-2.5 flex gap-2">
          <span className="flex h-7 items-center rounded bg-card px-3 text-[11px] font-medium text-ink-2">Paramétrer</span>
          <span className="flex h-7 items-center rounded bg-card px-3 text-[11px] font-medium text-ink-2">Tout accepter</span>
        </div>
      </div>
      <AgentCursor x={0.78} y={0.56} animate />
      <span className="absolute left-6 top-[34%]">
        <Stamp success={false} label="Bandeau cookies" animate />
      </span>
    </div>
  );
}
