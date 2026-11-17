import Link from "next/link";
import { connection } from "next/server";
import { db } from "@/lib/engine";
import { AgentCursor, BrowserFrame, MissionBar, StatusGlyph, Verdict, blockerLabel, scoreTone } from "@/lib/ui";

export default async function Home() {
  await connection();
  const [{ data: top }, { data: proof }] = await Promise.all([
    db.from("site_scores").select("*").eq("device", "desktop").order("score", { ascending: false, nullsFirst: false }).limit(5),
    // A real blocked mission for the "Preuves" tile: evidence over illustration.
    db
      .from("runs")
      .select("screenshot_url, final_url, blocker_type")
      .eq("success", false)
      .not("screenshot_url", "is", null)
      .not("blocker_type", "in", "(captcha_or_bot_block,out_of_stock,other)")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return (
    <>
      {/* Hero */}
      <section className="overflow-hidden pt-[88px] text-center max-[734px]:pt-14">
        <div className="wrap">
          <h1 className="type-hero ap-fade">Un agent IA essaie d&apos;acheter sur ton site.</h1>
          <p className="type-subhead ap-fade mx-auto mt-5 max-w-[640px] text-ink-2 [animation-delay:0.2s]">
            AgentProof te montre où il bloque. Preuves à l&apos;appui.
          </p>
          <div className="ap-fade mt-8 flex flex-wrap items-center justify-center gap-x-[17px] gap-y-2 [animation-delay:0.4s]">
            <a href="#tester" className="btn">
              Tester mon site
            </a>
            <Link href="/classement" className="more">
              Voir le classement
            </Link>
          </div>
        </div>
        <figure className="mx-auto mt-16 w-[min(1080px,92%)] max-[734px]:mt-12">
          <BrowserFrame url="https://maison-exemple.fr/pull-col-rond-noir">
            <ProductMock />
          </BrowserFrame>
          <figcaption className="type-small mx-auto mt-5 max-w-[520px] text-ink-2">
            L&apos;agent clique sur « Ajouter au panier ». Un bandeau cookies surgit et le recouvre. La mission s&apos;arrête là.
          </figcaption>
        </figure>
      </section>

      {/* Statement */}
      <section className="section">
        <div className="wrap">
          <p className="type-h2 text-ink-2">
            Demain, des agents IA feront les courses à la place de tes clients.{" "}
            <span className="text-ink">Un bandeau cookies, une pop-up ou un sélecteur de taille suffit à les arrêter.</span> Ils achètent alors ailleurs.
            Et <span className="text-ink">63 % des responsables e-commerce</span> pensent que leur tunnel d&apos;achat ne passerait pas le test.
            <sup className="ml-0.5 align-super text-[0.4em]">
              <a href="#note-1" className="text-link" aria-label="Note 1">
                1
              </a>
            </sup>
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="section bg-bg-2">
        <div className="wrap-wide">
          <h2 className="type-h1 mb-12 max-[734px]:mb-8">Ce que tu reçois.</h2>
          <div className="grid gap-5 lg:grid-cols-2">
            <article className="tile grid items-center gap-10 lg:col-span-2 lg:grid-cols-[1fr_1.1fr]">
              <div>
                <p className="type-eyebrow text-ink-2">Missions</p>
                <h3 className="type-h2 mt-3">Cinq achats réels, jusqu&apos;au checkout.</h3>
                <p className="mt-4 max-w-[440px] text-ink-2">
                  L&apos;agent cherche, filtre, choisit une taille et remplit le panier, comme un client. Il s&apos;arrête à la première page du checkout.
                </p>
              </div>
              <MissionsVisual />
            </article>

            <article className="tile flex flex-col">
              <p className="type-eyebrow text-ink-2">Preuves</p>
              <h3 className="type-h3 mt-3">Une capture là où l&apos;agent abandonne.</h3>
              <p className="mt-3 text-ink-2">Chaque mission a son replay pas à pas. Un juge visuel relit la dernière capture pour confirmer le verdict.</p>
              <div className="mt-8 -mb-16 translate-x-6 max-[734px]:-mb-10 max-[734px]:translate-x-4">
                <BrowserFrame url={proof?.final_url}>
                  {proof?.screenshot_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={proof.screenshot_url} alt={`Capture réelle d'une mission bloquée : ${blockerLabel(proof.blocker_type)}`} className="block w-full" loading="lazy" />
                  ) : (
                    <div className="aspect-[16/10] bg-bg-2" />
                  )}
                  <Verdict success={false} label={blockerLabel(proof?.blocker_type ?? "cookie_banner")} className="absolute left-4 top-4" />
                </BrowserFrame>
              </div>
            </article>

            <article className="tile flex flex-col">
              <p className="type-eyebrow text-ink-2">Corrections</p>
              <h3 className="type-h3 mt-3">Un plan classé par impact.</h3>
              <p className="mt-3 text-ink-2">Les blocages les plus fréquents d&apos;abord, la correction à faire, et ton score face à celui d&apos;un concurrent.</p>
              <FixesVisual />
            </article>
          </div>
        </div>
      </section>

      {/* Form */}
      <section id="tester" className="section scroll-mt-[52px]">
        <div className="mx-auto w-[min(692px,87.5%)]">
          <h2 className="type-h1 text-center">Teste ton site.</h2>
          <p className="type-intro mt-4 text-center text-ink-2">Cinq missions d&apos;achat, 10 à 20 minutes. Le rapport s&apos;ouvre tout de suite et se remplit pendant l&apos;audit.</p>
          <form action="/api/audits" method="post" className="mt-12 grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Adresse de ton site" name="url" required />
              <Field label="Un concurrent (facultatif)" name="competitor" />
            </div>
            <fieldset className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <legend className="sr-only">Appareil</legend>
              <span className="text-ink-2" aria-hidden>
                Appareil
              </span>
              <div className="inline-grid grid-cols-2 rounded-[10px] bg-fill p-[3px]">
                {[
                  ["desktop", "Ordinateur"],
                  ["mobile", "Mobile"],
                ].map(([v, l]) => (
                  <label key={v} className="relative cursor-pointer">
                    <input type="radio" name="device" value={v} defaultChecked={v === "desktop"} className="peer sr-only" />
                    <span className="type-small flex h-9 min-w-[120px] items-center justify-center rounded-[8px] px-4 font-semibold text-ink-2 transition-colors duration-200 peer-checked:bg-tile peer-checked:text-ink peer-checked:shadow-[0_1px_3px_rgb(0_0_0/0.12)] peer-focus-visible:outline-2 peer-focus-visible:outline-blue dark:peer-checked:bg-[#636366]">
                      {l}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <button className="btn mt-4 min-h-[56px] w-full rounded-[12px]">Lancer l&apos;audit</button>
            <p className="type-small text-center text-ink-2">L&apos;agent ne paie jamais et ne saisit aucune donnée personnelle.</p>
          </form>
        </div>
      </section>

      {/* Leaderboard */}
      <section className="section bg-bg-2">
        <div className="wrap">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
            <h2 className="type-h1">Le classement mode.</h2>
            <Link href="/classement" className="more type-intro">
              Tout le classement
            </Link>
          </div>
          {top?.length ? (
            <ol className="overflow-hidden rounded-[18px] bg-tile">
              {top.map((s, i) => (
                <li key={s.audit_id} className="border-b border-hairline last:border-0">
                  <Link
                    href={`/audit/${s.audit_id}`}
                    className="grid grid-cols-[1.75rem_1fr_auto] items-center gap-x-4 px-6 py-5 transition-colors duration-200 hover:bg-bg-2/60 max-[734px]:px-5 sm:grid-cols-[1.75rem_1fr_12rem_5.5rem]"
                  >
                    <span className="text-ink-2 tnum">{i + 1}</span>
                    <span className="type-headline truncate">{s.name}</span>
                    <span className="hidden sm:block">
                      <MissionBar ok={s.runs_success ?? 0} done={s.runs_scored ?? 0} total={s.runs_scored ?? 0} size="sm" />
                    </span>
                    <span className="flex items-center justify-end gap-2 type-headline tnum">
                      <StatusGlyph tone={scoreTone(s.score)} className="h-4 w-4" />
                      {s.score ?? "—"} %
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <div className="rounded-[18px] bg-tile p-10 text-center">
              <p className="type-headline">Les premiers audits tournent.</p>
              <a href="#tester" className="more mt-1">
                Teste ton site en attendant
              </a>
            </div>
          )}
          <p className="type-small mt-5 flex flex-wrap gap-x-5 gap-y-1 text-ink-2">
            <span className="inline-flex items-center gap-1.5"><StatusGlyph tone="pass" /> 70 % et plus : prêt pour les agents</span>
            <span className="inline-flex items-center gap-1.5"><StatusGlyph tone="warn" /> 40 à 69 % : fragile</span>
            <span className="inline-flex items-center gap-1.5"><StatusGlyph tone="fail" /> Moins de 40 % : bloquant</span>
          </p>
        </div>
      </section>

      <div className="bg-bg-2">
        <ol className="wrap-wide type-caption pb-6 text-ink-2">
          <li id="note-1" className="scroll-mt-20">
            1. Blend Commerce, sondage auprès de 59 responsables e-commerce, juillet–août 2026 : leur tunnel d&apos;achat ne peut pas être finalisé par un agent IA.
          </li>
        </ol>
      </div>
    </>
  );
}

// apple.com form field: the label sits in the field and floats up once it has focus or text.
function Field({ label, name, required }: { label: string; name: string; required?: boolean }) {
  return (
    <label className="relative block">
      <input
        name={name}
        required={required}
        placeholder=" "
        inputMode="url"
        autoComplete="url"
        autoCapitalize="none"
        spellCheck={false}
        className="peer h-14 w-full rounded-[12px] border border-[#86868b] bg-tile px-4 pt-[18px] text-[17px] transition-[border-color,box-shadow] duration-200 focus:border-blue focus:shadow-[0_0_0_4px_rgb(0_113_227/0.3)] focus:outline-none dark:border-line"
      />
      <span className="pointer-events-none absolute left-4 top-[9px] type-caption text-ink-2 transition-all duration-200 peer-placeholder-shown:top-[17px] peer-placeholder-shown:text-[17px] peer-focus:top-[9px] peer-focus:text-[12px]">
        {label}
      </span>
    </label>
  );
}

const MISSIONS: [string, boolean, string?][] = [
  ["Recherche « pull noir », taille M", true],
  ["Menu, puis filtre de taille", true],
  ["Filtre de prix, moins de 60 €", false, "Pop-up"],
  ["Variante couleur", true],
  ["Article en promotion", true],
];

function MissionsVisual() {
  return (
    <div className="rounded-[18px] bg-bg-2 p-2 dark:bg-[#2c2c2e]" aria-hidden>
      <div className="flex items-center justify-between px-4 pb-3 pt-3">
        <span className="type-small font-semibold">maison-exemple.fr</span>
        <span className="type-small text-ink-2 tnum">4 sur 5</span>
      </div>
      <ul className="overflow-hidden rounded-[12px] bg-tile">
        {MISSIONS.map(([t, ok, why]) => (
          <li key={t} className="flex items-center gap-3 border-b border-hairline px-4 py-3.5 last:border-0">
            <StatusGlyph tone={ok ? "pass" : "fail"} className="h-5 w-5" />
            <span className="min-w-0 flex-1 truncate">{t}</span>
            {why && <span className="type-small text-fail">{why}</span>}
          </li>
        ))}
      </ul>
      <div className="px-4 pb-2 pt-4">
        <MissionBar ok={4} done={5} total={5} />
      </div>
    </div>
  );
}

function FixesVisual() {
  const rows: [string, number, string][] = [
    ["Bandeau cookies", 3, "Le bouton « Tout accepter » doit rester visible sans défiler."],
    ["Sélecteur de taille", 2, "Les tailles doivent être des boutons, pas des images."],
  ];
  return (
    <div className="mt-8 space-y-3" aria-hidden>
      {rows.map(([name, n, fix]) => (
        <div key={name} className="rounded-[18px] bg-bg-2 p-5 dark:bg-[#2c2c2e]">
          <div className="flex items-baseline justify-between gap-3">
            <span className="type-headline">{name}</span>
            <span className="type-small text-ink-2 tnum">{n} missions</span>
          </div>
          <p className="type-small mt-2 text-ink-2">{fix}</p>
        </div>
      ))}
      <div className="rounded-[18px] bg-bg-2 p-5 dark:bg-[#2c2c2e]">
        <div className="type-small grid grid-cols-[6rem_1fr_3rem] items-center gap-3">
          <span className="font-semibold">Ton site</span>
          <MissionBar ok={2} done={5} total={5} size="sm" />
          <span className="text-right tnum">40 %</span>
          <span className="text-ink-2">Concurrent</span>
          <MissionBar ok={4} done={5} total={5} size="sm" />
          <span className="text-right text-ink-2 tnum">80 %</span>
        </div>
      </div>
    </div>
  );
}

// A product page as the agent sees it. Plays once: the agent taps "Ajouter au panier", a cookie banner slides over it.
function ProductMock() {
  return (
    <div className="relative flex aspect-[16/9] select-none flex-col bg-tile text-left text-ink max-[734px]:aspect-[4/3.6]" aria-hidden>
      <div className="flex items-center justify-between border-b border-hairline px-8 py-4 max-[734px]:px-4 max-[734px]:py-2.5">
        <span className="text-[13px] font-semibold tracking-[0.32em]">MAISON</span>
        <span className="flex gap-6 text-[12px] text-ink-2 max-[734px]:hidden">
          <span>Femme</span>
          <span>Homme</span>
          <span>Nouveautés</span>
          <span>Panier (0)</span>
        </span>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-[1.1fr_1fr] gap-10 p-8 max-[734px]:gap-4 max-[734px]:p-4">
        <div className="relative overflow-hidden rounded-[6px] bg-[#ececee] dark:bg-[#2c2c2e]">
          <svg viewBox="0 0 100 125" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid meet">
            <path d="M31 30l12-6h14l12 6 13 24-11 6-6-10v52H35V50l-6 10-11-6z" fill="#1d1d1f" />
            <path d="M43 24c2 5 12 5 14 0" fill="none" stroke="#3a3a3c" strokeWidth="1" />
          </svg>
        </div>
        <div className="flex flex-col pt-2 max-[734px]:pt-0">
          <span className="text-[11px] text-ink-2 max-[734px]:text-[9px]">Mailles · Pulls</span>
          <p className="mt-2 text-[22px] font-semibold leading-tight tracking-[-0.01em] max-[734px]:text-[14px]">Pull col rond en laine</p>
          <p className="mt-1 text-[15px] text-ink-2 tnum max-[734px]:text-[12px]">49,90 €</p>
          <p className="mt-6 text-[12px] font-semibold max-[734px]:mt-3 max-[734px]:text-[10px]">Taille</p>
          <div className="mt-2 flex gap-2 max-[734px]:gap-1">
            {["XS", "S", "M", "L", "XL"].map((t) => (
              <span
                key={t}
                className={`grid h-9 w-11 place-items-center rounded-[6px] border text-[12px] max-[734px]:h-6 max-[734px]:w-6 max-[734px]:text-[9px] ${t === "M" ? "border-ink" : "border-line text-ink-2"}`}
              >
                {t}
              </span>
            ))}
          </div>
          <span className="relative mt-auto block">
            <span className="flex h-12 items-center justify-center rounded-[6px] bg-ink text-[14px] font-semibold text-tile max-[734px]:h-8 max-[734px]:text-[10px]">
              Ajouter au panier
            </span>
            <AgentCursor x={0.62} y={0.55} animate />
          </span>
        </div>
      </div>

      {/* Cookie banner */}
      <div className="ap-banner absolute inset-x-0 bottom-0 z-10 h-[44%] border-t border-hairline bg-tile px-8 py-6 shadow-[0_-16px_40px_-12px_rgb(0_0_0/0.25)] max-[734px]:h-[46%] max-[734px]:px-4 max-[734px]:py-3">
        <p className="text-[15px] font-semibold max-[734px]:text-[11px]">Nous respectons votre vie privée</p>
        <p className="mt-1.5 max-w-[560px] text-[12px] leading-relaxed text-ink-2 max-[734px]:text-[9px]">
          Nous utilisons des cookies pour améliorer votre expérience, mesurer l&apos;audience et personnaliser les contenus. Vous pouvez modifier vos choix à tout moment.
        </p>
        <div className="mt-4 flex gap-2 max-[734px]:mt-2">
          <span className="flex h-9 items-center rounded-[6px] bg-bg-2 px-4 text-[12px] text-ink-2 max-[734px]:h-6 max-[734px]:px-2 max-[734px]:text-[9px] dark:bg-[#2c2c2e]">Paramétrer</span>
          <span className="flex h-9 items-center rounded-[6px] bg-bg-2 px-4 text-[12px] text-ink-2 max-[734px]:h-6 max-[734px]:px-2 max-[734px]:text-[9px] dark:bg-[#2c2c2e]">Continuer sans accepter</span>
        </div>
      </div>

      <span className="absolute bottom-[24%] right-[4%] z-30 max-[734px]:bottom-[30%] max-[734px]:right-[3%]">
        <span className="ap-verdict">
          <Verdict success={false} label="Bandeau cookies" />
        </span>
      </span>
    </div>
  );
}
