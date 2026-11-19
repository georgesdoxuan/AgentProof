import { EXCLUDED, blockerNames } from "./engine";
import type { Lang } from "./i18n";
import { getLang, getT } from "./lang";

// ---------- score ----------
// Never color alone: every tone has a word and a glyph.
export type Tone = "pass" | "warn" | "fail" | "none";

export function scoreTone(score: number | null): Tone {
  if (score == null) return "none";
  return score >= 70 ? "pass" : score >= 40 ? "warn" : "fail";
}

const TONE_WORD: Record<Lang, Record<Tone, string>> = {
  fr: { pass: "Prêt pour les agents", warn: "Fragile", fail: "Bloquant", none: "En attente" },
  en: { pass: "Ready for agents", warn: "Fragile", fail: "Blocking", none: "Pending" },
};
export const toneWords = (lang: Lang) => TONE_WORD[lang];

// "unsure": a verdict still to confirm (unverified mission, site with nothing counted). Glyph only, no score tone.
type Glyph = Tone | "unsure";
const toneText: Record<Glyph, string> = { pass: "text-pass", warn: "text-warn", fail: "text-fail", none: "text-ink-2", unsure: "text-ink-2" };

// SF Symbols-style filled circles: checkmark, exclamationmark, xmark, minus, questionmark.
const GLYPH: Record<Glyph, string> = {
  pass: "M6.2 10.3l2.6 2.6 5-5.6",
  warn: "M10 5.6v5.2M10 14.1v.1",
  fail: "M7 7l6 6M13 7l-6 6",
  none: "M6.5 10h7",
  unsure: "M7.7 7.6a2.4 2.4 0 1 1 3.5 2.1c-.7.4-1.2.9-1.2 1.7v.3M10 14.3v.1",
};

export function StatusGlyph({ tone, className = "h-[1.05em] w-[1.05em]" }: { tone: Glyph; className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={`shrink-0 ${toneText[tone]} ${className}`} aria-hidden>
      <circle cx="10" cy="10" r="10" fill="currentColor" />
      <path d={GLYPH[tone]} fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export async function ToneLabel({ score, className = "" }: { score: number | null; className?: string }) {
  const t = scoreTone(score);
  const toneWord = toneWords(await getLang());
  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold ${toneText[t]} ${className}`}>
      <StatusGlyph tone={t} />
      {toneWord[t]}
    </span>
  );
}

// One segment per mission, like the storage bar in iPhone Settings: the score is the share of green.
export async function MissionBar({ ok, done, total, size = "md" }: { ok: number; done: number; total: number; size?: "sm" | "md" | "lg" }) {
  const t = await getT();
  const n = Math.max(total, done, 1);
  const h = size === "lg" ? "h-3" : size === "sm" ? "h-1.5" : "h-2";
  return (
    <span className={`flex w-full gap-[3px] ${h}`} role="img" aria-label={t(`${ok} missions réussies sur ${done} comptées`, `${ok} missions passed out of ${done} counted`)}>
      {Array.from({ length: n }, (_, i) => (
        <span
          key={i}
          className={`flex-1 first:rounded-l-full last:rounded-r-full ${i < ok ? "bg-pass" : i < done ? "bg-fail" : "bg-fill"}`}
        />
      ))}
    </span>
  );
}

// ---------- runs ----------
export async function StatusBadge({ run }: { run: { status: string; success: boolean | null; blocker_type?: string | null } }) {
  const t = await getT();
  if (run.status === "launched")
    return (
      <span className="inline-flex items-center gap-1.5 font-semibold text-ink-2">
        <Spinner />
        {t("En cours", "Running")}
      </span>
    );
  const [text, tone]: [string, Glyph] =
    run.status === "todo"
      ? [t("En attente", "Pending"), "none"]
      : run.status === "error" || run.success === null
        ? [t("Non vérifiée", "Unverified"), "unsure"]
        : run.success
          ? [t("Réussie", "Passed"), "pass"]
          : EXCLUDED.includes(run.blocker_type ?? "")
            ? [t("Hors score", "Out of score"), "none"]
            : [t("Bloquée", "Blocked"), "fail"];
  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold ${toneText[tone]}`}>
      <StatusGlyph tone={tone} />
      {text}
    </span>
  );
}

export function Spinner({ className = "h-[1em] w-[1em]" }: { className?: string }) {
  return <span className={`ap-spin inline-block shrink-0 rounded-full border-2 border-current border-t-transparent ${className}`} aria-hidden />;
}

// The verdict, floating over the evidence on a glass capsule.
export async function Verdict({ success, label, className = "" }: { success: boolean; label?: string; className?: string }) {
  const t = await getT();
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-glass px-3 py-1.5 type-small font-semibold shadow-[0_4px_16px_rgb(0_0_0/0.12),inset_0_0_0_0.5px_rgb(0_0_0/0.08)] backdrop-blur-xl backdrop-saturate-150 ${className}`}
    >
      <StatusGlyph tone={success ? "pass" : "fail"} />
      <span className="text-ink">{success ? t("Checkout atteint", "Checkout reached") : label ? `${t("Bloqué", "Blocked")} · ${label}` : t("Bloqué", "Blocked")}</span>
    </span>
  );
}

// ---------- evidence ----------
export function BrowserFrame({ url, children, className = "" }: { url?: string | null; children: React.ReactNode; className?: string }) {
  let host = url ?? "";
  try {
    if (url) host = new URL(url).host.replace(/^www\./, "") + new URL(url).pathname.replace(/\/$/, "");
  } catch {}
  return (
    <div className={`overflow-hidden rounded-[12px] bg-tile shadow-[var(--shot-shadow)] ${className}`}>
      <div className="relative flex h-9 items-center border-b border-hairline bg-bg-2 px-3.5 dark:bg-[#2a2a2c]">
        <span className="flex gap-2" aria-hidden>
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        </span>
        {host && (
          <span className="absolute inset-x-[72px] mx-auto flex h-[22px] max-w-[360px] items-center justify-center gap-1.5 rounded-[6px] bg-fill px-3 text-[11px] text-ink-2">
            <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 shrink-0" fill="currentColor" aria-hidden>
              <path d="M3.5 5V3.75a2.5 2.5 0 015 0V5h.25c.41 0 .75.34.75.75v4.5c0 .41-.34.75-.75.75h-5.5a.75.75 0 01-.75-.75v-4.5c0-.41.34-.75.75-.75zm1.25 0h2.5V3.75a1.25 1.25 0 00-2.5 0z" />
            </svg>
            <span className="truncate">{host}</span>
          </span>
        )}
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}

// The agent's pointer: the one mark that runs through the hero and every replay.
// `animate` plays the hero sequence once: travel, tap. Otherwise the ring pulses where the agent clicked.
export function AgentCursor({ x, y, animate = false, className = "" }: { x: number; y: number; animate?: boolean; className?: string }) {
  return (
    <span className={`pointer-events-none absolute z-20 ${className}`} style={{ left: `${x * 100}%`, top: `${y * 100}%` }} aria-hidden>
      <span className={`${animate ? "ap-tap" : "ap-ring"} absolute -left-3 -top-3 h-6 w-6 rounded-full bg-blue/40`} />
      <svg viewBox="0 0 24 24" className={`absolute -left-[3px] -top-[2px] h-7 w-7 drop-shadow-[0_2px_4px_rgb(0_0_0/0.3)] ${animate ? "ap-travel" : ""}`}>
        <path d="M4 2.5l15 8.6-6.4 1.6-3.3 5.9z" fill="var(--blue)" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

// The AgentProof mark: square dots that land in a "V" (the agent's path to a verified purchase),
// with the blue one top right. Dots follow the theme (--ink); app/icon.svg is the favicon copy.
// Top-left corners on an 11-unit grid, 9-unit squares.
export const MARK_DOTS: [number, number][] = [[0, 22], [11, 33], [22, 44], [33, 33], [44, 22]];
export const MARK_ACCENT: [number, number] = [55, 11];
export const MARK_SIZE = 9;

export function Mark({ className = "h-[24px] w-[24px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      {MARK_DOTS.map(([x, y]) => <rect key={x} x={x} y={y} width={MARK_SIZE} height={MARK_SIZE} rx="1.5" fill="var(--ink)" />)}
      <rect x={MARK_ACCENT[0]} y={MARK_ACCENT[1]} width={MARK_SIZE} height={MARK_SIZE} rx="1.5" fill="var(--blue)" />
    </svg>
  );
}

// "Agent" in ink, "Proof" in blue, bold: the wordmark next to the mark.
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-bold tracking-[-0.01em] ${className}`}>
      Agent<span className="text-blue">Proof</span>
    </span>
  );
}

// ---------- icons ----------
// The AgentProof icon set is drawn like the mark: rounded square dots on a 7 by 7 grid (11-unit cells,
// 9-unit dots, as in MARK_DOTS), in the text color, with one blue dot (*) on the detail that matters,
// as the mark has its blue dot. Decorative everywhere: a text label always sits next to the icon.
// Rows top to bottom: "#" dot, "*" blue dot, "." empty.
type Dots = string[];
const ICON: Record<string, Dots> = {
  "cookie_banner": ["..###..", ".#...#.", "#.#...*", "#...#.#", "#.#...#", ".#..##.", "..###.."],
  "popup": ["#######", "#.....#", "#.###.#", "#.##*.#", "#.###.#", "#.....#", "#######"],
  "search_failed": [".###...", "#...#..", "#.*.#..", "#...#..", ".###...", "....#..", ".....#."],
  "filter_failed": ["#######", ".#####.", "..###..", "...#...", "...#...", "...#...", "...*..."],
  "size_selector": ["##...##", "#.###.#", "##...##", ".#...#.", ".#.*.#.", ".#...#.", ".#####."],
  "button_unresponsive": ["#######", "#.....#", "#######", "...*...", "...##..", "...###.", "...#..."],
  "captcha_or_bot_block": ["#######", "#.....#", "#.....#", "#..*..#", ".#...#.", "..#.#..", "...#..."],
  "login_required": ["..###..", "..#*#..", "..###..", ".......", ".#####.", "#.....#", "#######"],
  "out_of_stock": [".#####.", "#.....#", "#######", "#..*..#", "#.....#", "#.....#", "#######"],
  "page_error_or_timeout": ["#######", ".#...#.", "..#.#..", "...*...", "..#.#..", ".#####.", "#######"],
  "mission_not_applicable": ["..###..", ".#...#.", "#...#.#", "#..*..#", "#.#...#", ".#...#.", "..###.."],
  "agent_out_of_steps": [".....#*", ".....#.", "...###.", "...#...", ".###...", ".#.....", "##....."],
  "agent_tool_error": ["#######", "#..#..#", "#..#..#", "#..#..#", "#.....#", "#..*..#", "#######"],
  "other": [".......", ".......", ".......", "#..#..*", ".......", ".......", "......."],
  "none": [".......", "......*", ".....#.", "#...#..", ".#.#...", "..#....", "......."],
  "payment": [".......", "#######", "#######", "#.....#", "#..#.*#", "#######", "......."],
  "desktop": ["#####", "#...#", "#####", "..#..", ".###."],
  "mobile": [".###.", ".#.#.", ".#.#.", ".#.#.", ".###."],
};

// `quiet`: the blue dot goes grey too (blockers outside the score).
export function Icon({ name, quiet, className = "h-[1.1em] w-[1.1em]" }: { name: string; quiet?: boolean; className?: string }) {
  return <DotGlyph dots={ICON[name] ?? ICON.other} quiet={quiet} className={className} />;
}

function DotGlyph({ dots, quiet, className }: { dots: Dots; quiet?: boolean; className?: string }) {
  return (
    <svg viewBox={`0 0 ${dots[0].length * 11} ${dots.length * 11}`} className={`shrink-0 ${className}`} aria-hidden>
      {dots.flatMap((row, y) =>
        [...row].map((c, x) =>
          c === "." ? null : (
            <rect key={`${x}-${y}`} x={x * 11 + 1} y={y * 11 + 1} width={MARK_SIZE} height={MARK_SIZE} rx="1.5" fill={c === "*" && !quiet ? "var(--blue)" : "currentColor"} />
          ),
        ),
      )}
    </svg>
  );
}

// A blocker's icon on a rounded tile, like an iOS Settings row. Blue dot when it counts against the site;
// all grey when it stays outside the score.
export function BlockerIcon({ type, muted, className = "h-8 w-8 rounded-[9px]" }: { type: string | null; muted?: boolean; className?: string }) {
  const out = muted || !type || EXCLUDED.includes(type) || type === "other";
  return (
    <span className={`grid shrink-0 place-items-center bg-fill ${out ? "text-ink-2" : "text-ink"} ${className}`} aria-hidden>
      <Icon name={type ?? "other"} quiet={out} className="h-[72%] w-[72%]" />
    </span>
  );
}

// Mission types, keyed by the French title stored in the database. Neutral tile: a mission is a task, not a verdict.
const MISSION_ICON: Record<string, Dots> = {
  "Recherche + taille": [".###...", "#...#..", "#...#..", "#...#..", ".###...", "....#..", ".....*."],
  "Menu + filtre taille": [".......", "#######", ".......", "#######", ".......", "####*..", "......."],
  "Filtre de prix": ["...####", "..#...#", ".#..*.#", "#.....#", ".#...#.", "..#.#..", "...#..."],
  "Variante couleur": ["###.###", "###.###", "###.###", ".......", "###.***", "###.***", "###.***"],
  "Article en promo": ["##....#", "##...#.", "....#..", "...#...", "..#....", ".#...**", "#....**"],
  "Deux articles": [".......", ".#...*.", "#.#.*.*", "###.***", "###.***", "###.***", "......."],
  "Quantité dans le panier": ["...#...", "...#...", "...#...", "###*###", "...#...", "...#...", "...#..."],
  "Frais de livraison": [".......", "####...", "#..#...", "#..####", "#....*#", "#######", ".#...#."],
  "Recherche avec faute": [".###...", "#...#..", "#...#..", "#...#..", ".###...", "....#..", "*.*..#."],
  "Parcours depuis l'accueil": ["...*...", "..###..", ".#####.", "#######", ".#...#.", ".#.#.#.", ".#.#.#."],
  "Test de paiement": [".......", "#######", "#######", "#.....#", "#..#.*#", "#######", "......."],
};
export const MISSION_TYPES = Object.keys(MISSION_ICON);

export function MissionIcon({ title, className = "h-8 w-8 rounded-[9px]" }: { title: string | null | undefined; className?: string }) {
  return (
    <span className={`grid shrink-0 place-items-center bg-fill text-ink ${className}`} aria-hidden>
      <DotGlyph dots={MISSION_ICON[title ?? ""] ?? ICON.other} className="h-[72%] w-[72%]" />
    </span>
  );
}

// "Ordinateur" / "Mobile" with its device glyph.
export function DeviceTag({ device, lang = "fr" }: { device: string; lang?: Lang }) {
  return (
    // Inline, not flex: keeps the text on the surrounding baseline.
    <span className="whitespace-nowrap">
      <Icon name={device === "mobile" ? "mobile" : "desktop"} className="mr-1 inline-block h-[1.15em] w-[1.15em] align-[-0.22em]" />
      {device === "mobile" ? "Mobile" : lang === "en" ? "Desktop" : "Ordinateur"}
    </span>
  );
}

// ---------- helpers ----------
export const blockerLabel = (b: string | null, lang: Lang = "fr") => (b ? blockerNames(lang)[b] ?? b : "—");

type Run = { status: string; success: boolean | null; blocker_type: string | null };


export function summarize(runs: Run[]) {
  const finished = runs.filter((r) => r.status === "done" || r.status === "error");
  const scored = runs.filter((r) => r.status === "done" && r.success !== null && !EXCLUDED.includes(r.blocker_type ?? ""));
  const ok = scored.filter((r) => r.success).length;
  const counts: Record<string, number> = {};
  for (const r of finished) if (r.success === false && r.blocker_type) counts[r.blocker_type] = (counts[r.blocker_type] ?? 0) + 1;
  const blockers = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return {
    total: runs.length,
    finished: finished.length,
    done: scored.length,
    ok,
    score: scored.length ? Math.round((100 * ok) / scored.length) : null,
    blockers,
    unverified: runs.filter((r) => r.status === "done" && r.success === null).length,
    excluded: runs.filter((r) => r.status === "done" && r.success === false && EXCLUDED.includes(r.blocker_type ?? "")).length,
    errors: runs.filter((r) => r.status === "error").length,
  };
}

// What the agent had to get past on missions it still passed, read from its own report (steps_summary, blocker_detail).
// ponytail: keyword match on the agent's text; add an "obstacles" field to the agent's answer schema if wording drifts.
const HURDLES: [string, string, RegExp, string][] = [
  ["Bandeau cookies à fermer", "Cookie banner to close", /cookie|consentement/i, "cookie_banner"],
  ["Pop-up à fermer", "Pop-up to close", /(dismiss|clos|ferm)[^.]{0,60}(pop-?up|newsletter|modal|overlay)|(pop-?up|newsletter|modal|overlay)[^.]{0,40}(dismiss|closed|ferm)/i, "popup"],
  ["Recherche à reprendre", "Search to retry", /no results?|aucun r[ée]sultat|pas de r[ée]sultat/i, "search_failed"],
  ["Filtre qui ne répond pas", "Filter that does not respond", /(tried|tent[ée]) (to )?(de )?(filter|filtrer)/i, "filter_failed"],
];
export const LONG_PATH = 20;

export function hurdles(runs: { success?: boolean | null; steps?: number | null; agent_answer?: { steps_summary?: string; blocker_detail?: string } | null }[], lang: Lang) {
  const won = runs.filter((r) => r.success);
  // [label, missions, icon]
  const out: [string, number, string][] = [];
  for (const [fr, en, re, icon] of HURDLES) {
    const n = won.filter((r) => re.test(`${r.agent_answer?.steps_summary ?? ""} ${r.agent_answer?.blocker_detail ?? ""}`)).length;
    if (n) out.push([lang === "en" ? en : fr, n, icon]);
  }
  const long = won.filter((r) => (r.steps ?? 0) >= LONG_PATH).length;
  if (long) out.push([lang === "en" ? `Long path (${LONG_PATH}+ steps)` : `Parcours long (${LONG_PATH} étapes ou plus)`, long, "agent_out_of_steps"]);
  return { passed: won.length, items: out.sort((a, b) => b[1] - a[1]) };
}

export function Chevron({ dir = "right", className = "h-[0.7em] w-[0.7em]" }: { dir?: "right" | "left" | "down"; className?: string }) {
  const d = dir === "left" ? "M8 1.5L3.5 6 8 10.5" : dir === "down" ? "M1.5 4L6 8.5 10.5 4" : "M4 1.5L8.5 6 4 10.5";
  return (
    <svg viewBox="0 0 12 12" className={`shrink-0 ${className}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

// apple.com form field: the label sits in the field and floats up once it has focus or text.
export function Field({ label, name, required, type = "url", defaultValue }: { label: string; name: string; required?: boolean; type?: "url" | "email" | "text" | "password"; defaultValue?: string }) {
  return (
    <label className="relative block">
      <input
        name={name}
        required={required}
        defaultValue={defaultValue}
        type={type === "email" || type === "password" ? type : "text"}
        placeholder=" "
        inputMode={type === "password" ? "text" : type}
        autoComplete={type === "text" ? "off" : type === "password" ? "new-password" : type}
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


// ---------- controls shared by the team space ----------
// Segmented control (radio group): one look for every short exclusive choice, as on the home form.
export function Segmented({ name, options, value, label }: { name: string; options: [string, string][]; value: string; label: string }) {
  return (
    <fieldset className="inline-grid auto-cols-fr grid-flow-col rounded-[10px] bg-fill p-[3px]">
      <legend className="sr-only">{label}</legend>
      {options.map(([v, l]) => (
        <label key={v} className="relative cursor-pointer">
          <input type="radio" name={name} value={v} defaultChecked={v === value} className="peer sr-only" />
          <span className="type-small flex h-9 items-center justify-center whitespace-nowrap rounded-[8px] px-4 font-semibold text-ink-2 transition-colors duration-200 peer-checked:bg-tile peer-checked:text-ink peer-checked:shadow-[0_1px_3px_rgb(0_0_0/0.12)] peer-focus-visible:outline-2 peer-focus-visible:outline-blue dark:peer-checked:bg-[#636366]">
            {l}
          </span>
        </label>
      ))}
    </fieldset>
  );
}

// Inset grouped list, like iOS Settings: a titled group of rows separated by hairlines.
export function Group({ title, footer, aside, children }: { title?: string; footer?: React.ReactNode; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      {(title || aside) && (
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-1">
          {title && <h2 className="type-headline">{title}</h2>}
          {aside}
        </div>
      )}
      <div className="overflow-hidden rounded-[18px] bg-tile">{children}</div>
      {footer && <p className="type-small mt-2.5 px-1 text-ink-2">{footer}</p>}
    </section>
  );
}

export function Row({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`flex min-h-[60px] flex-wrap items-center gap-x-4 gap-y-2 border-b border-hairline px-5 py-3 last:border-0 ${className}`}>{children}</div>;
}

// Initials in a circle: tells members apart at a glance without photos.
export function Avatar({ email, className = "h-9 w-9" }: { email: string; className?: string }) {
  const hue = [...email].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 0);
  return (
    <span className={`grid shrink-0 place-items-center rounded-full type-small font-semibold text-white ${className}`} style={{ background: `hsl(${hue} 42% 40%)` }} aria-hidden>
      {email[0]?.toUpperCase()}
    </span>
  );
}

const TAGGED = /^(Observé|Hypothèse|À vérifier|Correction possible) :\u00a0/;

// The LLM writes "1. Problème : … / Correction : …". Show each pair as a card; fall back to plain text.
export async function Recommendations({ text }: { text: string }) {
  const t = await getT();
  const TAG_EN: Record<string, string> = { Observé: "Observed", Hypothèse: "Hypothesis", "À vérifier": "To check", "Correction possible": "Possible fix" };
  const intro: string[] = [];
  const items: { problem: string; fix: string[] }[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const p = line.match(/^\d+[.)]\s*(?:\*\*)?(?:Probl[eè]me\s*(?:\*\*)?\s*:\s*(?:\*\*)?)?(.*)$/i);
    const f = line.match(/^(?:[-*]\s*)?(?:\*\*)?Correction\s*(?:\*\*)?\s*:?\s*(.*)$/i);
    const tag = line.match(/^(Observé|Hypothèse|À vérifier|Correction possible)\s*:\s*(.*)$/);
    if (tag && items.length) items[items.length - 1].fix.push(`${tag[1]} :\u00a0${tag[2]}`);
    else if (p) {
      // "Problème … → Correction : …" sometimes arrives on one line.
      const [problem, ...fix] = p[1].split(/\s*(?:→|->)?\s*(?:\*\*)?Correction\s*(?:\*\*)?\s*:\s*/i);
      items.push({ problem: problem.replace(/\*\*/g, ""), fix: fix.filter(Boolean) });
    }
    else if (f && items.length) items[items.length - 1].fix.push(f[1]);
    else if (items.length) items[items.length - 1].fix.push(line);
    else intro.push(line);
  }
  // Free text: one paragraph per line, at reading size and measure.
  if (!items.length)
    return (
      <div className="tile space-y-3 p-8! max-[734px]:p-6! print:p-[5mm]!">
        {intro.map((l, i) => (
          <p key={i} className="max-w-[720px]">{l}</p>
        ))}
      </div>
    );

  return (
    <div className="space-y-6">
      {intro.length > 0 && <p className="max-w-[720px] text-ink-2">{intro.join(" ")}</p>}
      <ol className={`grid gap-4 md:grid-cols-2 print:grid-cols-1 print:gap-[3mm] ${items.length > 2 ? "lg:grid-cols-3" : ""}`}>
        {items.map((it, i) => (
          <li key={i} className="tile flex flex-col p-7! print:p-[5mm]!">
            <span className="type-small text-ink-2">{it.fix.some((l) => TAGGED.test(l)) ? t("Blocage", "Blocker") : t("Correction", "Fix")} {i + 1}</span>
            <p className="mt-3 font-semibold">{it.problem}</p>
            {it.fix.some((l) => TAGGED.test(l)) ? (
              // Facts, hypothesis and check kept apart: the reader sees what was observed and what is only supposed.
              <dl className="mt-4 space-y-2 type-small">
                {it.fix.map((l, j) => {
                  const k = l.match(TAGGED)?.[1] ?? "";
                  const v = k ? l.slice(k.length + 3) : l;
                  return (
                    <div key={j}>
                      {k && <dt className={`inline font-semibold ${k === "Hypothèse" ? "text-warn" : ""}`}>{t(k, TAG_EN[k] ?? k)} : </dt>}
                      <dd className="inline text-ink-2">{v}</dd>
                    </div>
                  );
                })}
              </dl>
            ) : it.fix.length > 0 && (
              <p className="mt-4 flex gap-2 text-ink-2">
                <Chevron className="mt-[0.45em] h-3 w-3 text-link" />
                <span>{it.fix.join(" ")}</span>
              </p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
