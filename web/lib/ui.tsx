import { EXCLUDED, blockerNames, payOpen } from "./engine";
import type { Lang } from "./i18n";
import { getLang, getT } from "./lang";
import { accountColor } from "./avatar";
import { CopyButton } from "@/app/espace/controls";
import { Hint } from "./hint";
import { GLYPH as LINE } from "./glyphs";
import { translate } from "./translate";

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

export async function ToneLabel({ score, exPay = false, className = "" }: { score: number | null; exPay?: boolean; className?: string }) {
  const t = scoreTone(score);
  const lang = await getLang();
  const toneWord = toneWords(lang);
  // 100 % of the missions, but the real payment test placed no order: never "ready" without a word about it.
  if (exPay)
    return (
      <span className={`inline-flex items-center gap-1.5 font-semibold text-warn ${className}`}>
        <Icon name="payment" />
        {lang === "en" ? "Order not confirmed" : "Commande non confirmée"}
      </span>
    );
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

// A score only counts the missions that were scored: say how many when some are out of score, so 100 % on 3 of 5
// never reads like 100 % on 5. Computed from the runs at read time, so old reports get it too.
export async function ScoredNote({ done, out, short = false, className = "" }: { done: number; out: number; short?: boolean; className?: string }) {
  if (out <= 0) return null;
  const t = await getT();
  const all = done + out;
  return (
    <span className={`type-caption text-ink-2 tnum ${short ? "whitespace-nowrap" : ""} ${className}`}>
      {short
        ? t(`${done} notée${done > 1 ? "s" : ""} sur ${all}`, `${done} of ${all} scored`)
        : t(`${done} mission${done > 1 ? "s" : ""} notée${done > 1 ? "s" : ""} sur ${all} · ${out} hors score`, `${done} of ${all} missions scored · ${out} out of score`)}
    </span>
  );
}
// Missions left out of a summarize() score: excluded blockers, unverified by the judge, errors on our side.
export const outOfScore = (s: { excluded: number; unverified: number; errors: number }) => s.excluded + s.unverified + s.errors;

// Says what the three segment colors mean, once, under a group of bars.
export async function MissionLegend({ className = "" }: { className?: string }) {
  const t = await getT();
  const dot = "inline-block h-2 w-3.5 rounded-full";
  return (
    <p className={`type-caption flex flex-wrap gap-x-4 gap-y-1 text-ink-2 ${className}`}>
      <span className="inline-flex items-center gap-1.5"><span className={`${dot} bg-pass`} />{t("Mission réussie", "Mission passed")}</span>
      <span className="inline-flex items-center gap-1.5"><span className={`${dot} bg-fail`} />{t("Mission bloquée", "Mission blocked")}</span>
      <span className="inline-flex items-center gap-1.5"><span className={`${dot} bg-fill`} /><Icon name="shield" className="h-3.5 w-3.5 shrink-0" />{t("Hors score (rupture de stock, erreur de l’agent…)", "Out of score (out of stock, agent error…)")}</span>
    </p>
  );
}

// ---------- runs ----------
export async function StatusBadge({ run, secondTry = false }: { run: { status: string; success: boolean | null; blocker_type?: string | null }; secondTry?: boolean }) {
  const t = await getT();
  if (run.status === "launched")
    return (
      <span className="inline-flex items-center gap-1.5 font-semibold text-live">
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
          ? [secondTry ? t("Réussie au 2ᵉ essai", "Passed on 2nd try") : t("Réussie", "Passed"), "pass"]
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
// One outline set for blockers, hurdles and devices: SF Symbols-style, 24 grid, 1.8 stroke, round ends,
// the same drawing rules as the team-space sidebar (app/espace/controls.tsx). Always next to a text label.
const ICON: Record<string, string> = {
  none: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM8 12.5l2.7 2.7L16 9.5",
  cookie_banner: "M20.9 12.6A9 9 0 1 1 11.4 3.1a3 3 0 0 0 3.5 3.4 3 3 0 0 0 3.6 3.6 3 3 0 0 0 2.4 2.5zM8.5 10.5h.01M9.5 15.5h.01M14.5 15h.01",
  popup: "M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM3 8h18M8 11.5h8v5H8z",
  search_failed: "M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM20 20l-4.9-4.9M8.5 8.5l4 4M12.5 8.5l-4 4",
  filter_failed: "M3.5 5h17l-6.5 8v6l-4-2v-4z",
  size_selector: "M8.5 3.5 3 6.5l2 4.5 2.5-1.2v10.7h9V9.8L19 11l2-4.5-5.5-3a3.5 3.5 0 0 1-7 0z",
  button_unresponsive: "M18 11.5V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h6M13 12l8 3-3.5 1.2L16 20z",
  captcha_or_bot_block: "M12 3l7.5 3v5.5c0 4.5-3.1 8.2-7.5 9.5-4.4-1.3-7.5-5-7.5-9.5V6zM9.5 9.5l5 5M14.5 9.5l-5 5",
  login_required: "M12 4a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM5 20.5a7 7 0 0 1 14 0",
  out_of_stock: "M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5zM3.5 7.5 12 12l8.5-4.5M12 12v9",
  page_error_or_timeout: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3.5 2",
  mission_not_applicable: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM5.6 5.6l12.8 12.8",
  agent_out_of_steps: "M3 20h5v-5h5v-5h5V5h3",
  agent_tool_error: "M14.5 5.5a4.5 4.5 0 0 0-5.8 5.8L3.5 16.5a2.1 2.1 0 0 0 3 3l5.2-5.2a4.5 4.5 0 0 0 5.8-5.8l-2.7 2.7-2.6-.4-.4-2.6z",
  other: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM8 12h.01M12 12h.01M16 12h.01",
  cart: "M3 4h2.2l2.3 11h10.3l2.2-7.5H6.4M9 19.5h.01M17 19.5h.01",
  payment: "M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM3 10h18M7 15h3",
  desktop: LINE.desktop,
  both: LINE.both,
  credit: LINE.credit,
  team: LINE.team,
  card: LINE.card,
  key: LINE.key,
  bolt: LINE.bolt,
  person: LINE.person,
  invite: LINE.invite,
  plus: LINE.plus,
  globe: LINE.globe,
  pencil: LINE.pencil,
  download: LINE.download,
  signout: LINE.signout,
  // Pricing tiers on the home page.
  ranking: "M5 20V13M12 20V5M19 20v-9",
  audit: "M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM20 20l-4.9-4.9M7.5 10.5l2 2 3.5-3.5",
  monthly: "M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM4 10h16M8 3v4M16 3v4M9.5 15l2 2 3.5-3.5",
  agency: "M9 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM3 19.5a6 6 0 0 1 12 0M16 4.5a3 3 0 0 1 0 5.5M18 13.6a6 6 0 0 1 3 5.9",
  mobile: LINE.mobile,
  // Facts shown as chips instead of sentences (duration, rules, delivery, access).
  clock: LINE.clock,
  mail: "M4 5.5h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1zM3.5 6.5 12 13l8.5-6.5",
  lock: "M6 10.5h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1zM8 10.5V7.5a4 4 0 0 1 8 0v3",
  nopay: "M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM3 10h18M4 4l16 16",
  shield: "M12 3l7.5 3v5.5c0 4.5-3.1 8.2-7.5 9.5-4.4-1.3-7.5-5-7.5-9.5V6zM9 12l2 2 4-4",
  eye: "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z",
  live: "M12 10.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM8.2 8.2a5.4 5.4 0 0 0 0 7.6M15.8 8.2a5.4 5.4 0 0 1 0 7.6M5.3 5.3a9.5 9.5 0 0 0 0 13.4M18.7 5.3a9.5 9.5 0 0 1 0 13.4",
  refresh: "M20 12a8 8 0 1 1-2.4-5.7M20 4v4.5h-4.5",
  info: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v5.5M12 7.8v.1",
  sparkle: "M12 3.5l1.8 5.2 5.2 1.8-5.2 1.8L12 17.5l-1.8-5.2L5 10.5l5.2-1.8zM18.5 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z",
  layers: "M12 3.5 21 8l-9 4.5L3 8zM3 12.5l9 4.5 9-4.5M3 16.5l9 4.5 9-4.5",
  trash: "M4 6.5h16M9.5 6.5V4.5h5v2M6.5 6.5l1 13.5h9l1-13.5M10 10.5v6M14 10.5v6",
  star: "M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z",
  pin: "M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11zM12 7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z",
  trend: "M3 17l6-6 4 4 8-8M15 7h6v6",
  wrench: "M14.5 5.5a4.5 4.5 0 0 0-5.8 5.8L3.5 16.5a2.1 2.1 0 0 0 3 3l5.2-5.2a4.5 4.5 0 0 0 5.8-5.8l-2.7 2.7-2.6-.4-.4-2.6z",
  doc: "M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v5h5M9 13h6M9 17h6",
  tag: "M3.5 12.5v-8a1 1 0 0 1 1-1h8l8 8-9 9zM8 8h.01",
  home: "M3.5 10.5 12 3.5l8.5 7V20a1 1 0 0 1-1 1H15v-6H9v6H4.5a1 1 0 0 1-1-1z",
  play: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM10 8.5v7l5.5-3.5z",
};

// ---------- chips and notes ----------
// What used to be a grey sentence ("5 missions, a few minutes, the agent never pays") becomes a row of chips:
// a line icon from the set above and two or three words, like the metadata pills in Linear, Vercel or Stripe.
type ChipTone = "plain" | "blue" | "pass" | "warn" | "fail" | "live";
const CHIP_TONE: Record<ChipTone, string> = {
  plain: "bg-fill text-ink",
  blue: "bg-blue/12 text-link",
  pass: "bg-pass/12 text-pass",
  // Light text darkened for 4.5:1 on the tinted pill, as the blocker state pills.
  warn: "bg-warn/15 text-[#9c4600] dark:text-warn",
  fail: "bg-fail/10 text-fail",
  // An audit still running (yellow); a finished one uses pass. 4.6:1 at least on the tint, light and dark.
  live: "bg-live-fill/20 text-live",
};
// size "lg": the space home's header facts. 36px (15px text) from 735px, 48px (17px text) from 1280px where the row has the
// width for them; the page offsets the extra height with a negative margin. Phones keep the 26px chips: larger ones
// would wrap onto more lines and push the page down.
export function Chip({ icon, tone = "plain", size = "md", children, className = "" }: { icon?: string; tone?: ChipTone; size?: "md" | "lg"; children: React.ReactNode; className?: string }) {
  const lg = size === "lg";
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full font-semibold type-caption min-h-[26px] gap-1.5 px-2.5 py-0.5 ${lg ? "min-[735px]:min-h-9 min-[735px]:gap-2 min-[735px]:px-3.5 min-[735px]:py-1 min-[735px]:text-[15px] min-[735px]:leading-5 xl:min-h-12 xl:gap-2.5 xl:px-5 xl:text-[17px] xl:leading-6" : ""} ${CHIP_TONE[tone]} ${className}`}>
      {icon && <Icon name={icon} className={`h-[14px] w-[14px] ${lg ? "min-[735px]:h-[18px] min-[735px]:w-[18px] xl:h-5 xl:w-5" : ""} ${tone === "plain" ? "text-ink-2" : ""}`} />}
      {children}
    </span>
  );
}
export function Chips({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {children}
    </div>
  );
}

// A small card for the one indication that must stay on the page (a rule, a limit, an access level):
// a bare line icon (as in the sidebar), one short line, an optional link. Replaces the grey paragraph under a form.
export function Note({ icon = "info", children, action, className = "" }: { icon?: string; children: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={`type-small flex items-center gap-3 rounded-[12px] bg-tile px-3.5 py-2.5 shadow-[inset_0_0_0_0.5px_var(--line)] ${className}`}>
      <Icon name={icon} className="h-[18px] w-[18px] text-ink-2" />
      <span className="min-w-0 flex-1 text-ink-2">{children}</span>
      {action && <span className="shrink-0">{action}</span>}
    </div>
  );
}

// Empty state, as in Linear or Vercel: an icon in a soft circle, one short title, an optional action. No paragraph.
export function Empty({ icon, title, children, className = "" }: { icon: string; title: React.ReactNode; children?: React.ReactNode; className?: string }) {
  return (
    <div className={`tile flex flex-col items-center gap-3 py-12! text-center ${className}`}>
      <span className="grid h-12 w-12 place-items-center rounded-full bg-fill text-ink-2" aria-hidden>
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <p className="type-headline">{title}</p>
      {children && <div className="type-small text-ink-2">{children}</div>}
    </div>
  );
}

export function Icon({ name, className = "h-[1.1em] w-[1.1em]" }: { name: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`shrink-0 ${className}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={ICON[name] ?? ICON.other} />
    </svg>
  );
}

// A blocker's icon, drawn like the team-space sidebar: a bare outline glyph, grey, in blue when it matters
// (there: the current section; here: a blocker that counts against the site). Decorative: the blocker's
// name is always written beside it.
export function BlockerIcon({ type, muted, className = "h-5 w-5" }: { type: string | null; muted?: boolean; className?: string }) {
  const out = muted || !type || EXCLUDED.includes(type) || type === "other";
  return <Icon name={type ?? "other"} className={`${out ? "text-ink-2" : "text-blue"} ${className}`} />;
}

// Mission types, keyed by the French title stored in the database. Grey: a mission is a task, not a verdict.
const MISSION_ICON: Record<string, string> = {
  "Recherche + taille": "M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM20 20l-4.9-4.9",
  "Menu + filtre taille": "M4 6h16M4 12h16M4 18h10",
  "Filtre de prix": "M3.5 12.5v-8a1 1 0 0 1 1-1h8l8 8-9 9zM8 8h.01",
  "Variante couleur": "M12 3.5s-6 6.4-6 10.5a6 6 0 0 0 12 0c0-4.1-6-10.5-6-10.5z",
  "Article en promo": "M6 18 18 6M7.5 6a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM16.5 15a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z",
  "Deux articles": "M5 8h14l-1 12.5H6zM9 8V6.5a3 3 0 0 1 6 0V8",
  "Quantité dans le panier": "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8v8M8 12h8",
  "Frais de livraison": "M3 6h11v10H3zM14 9.5h4l3 3.5v3h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17.5 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  "Recherche avec faute": "M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM20 20l-4.9-4.9M7.5 11c1-1.3 2-1.3 3 0s2 1.3 3 0",
  "Parcours depuis l'accueil": "M3.5 10.5 12 3.5l8.5 7V20a1 1 0 0 1-1 1H15v-6H9v6H4.5a1 1 0 0 1-1-1z",
  "Test de paiement": ICON.payment,
};
export const MISSION_TYPES = Object.keys(MISSION_ICON);
// Glyph path for a mission, for client components (they cannot import this file). A team's own mission gets the pencil.
export const TEAM_MISSION_ICON = "M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4";
export const missionIconPath = (title: string | null | undefined, team = false) => MISSION_ICON[title ?? ""] ?? (team ? TEAM_MISSION_ICON : ICON.other);

export function MissionIcon({ title, team, className = "h-5 w-5" }: { title: string | null | undefined; team?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`shrink-0 text-ink-2 ${className}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={missionIconPath(title, team)} />
    </svg>
  );
}

// "Ordinateur" / "Mobile" with its device glyph.
export function DeviceTag({ device, lang = "fr" }: { device: string; lang?: Lang }) {
  return (
    // Inline, not flex: keeps the text on the surrounding baseline.
    <span className="whitespace-nowrap">
      <Icon name={device === "mobile" ? "mobile" : "desktop"} className="mr-1 inline-block h-[1.15em] w-[1.15em] align-[-0.2em]" />
      {device === "mobile" ? "Mobile" : lang === "en" ? "Desktop" : "Ordinateur"}
    </span>
  );
}

// ---------- helpers ----------
// Non-breaking hyphen: « anti-bot » never splits across two lines in a card title.
export const blockerLabel = (b: string | null, lang: Lang = "fr") => (b ? (blockerNames(lang)[b] ?? b).replace(/-/g, "‑") : "—");

type Run = { status: string; success: boolean | null; blocker_type: string | null };


// Mention after a 100 % whose real payment test placed no order: "100 % hors paiement". Short: a card icon only, for
// the narrow sidebar, with the words for screen readers and on hover.
export function ExPay({ lang, short = false, className = "" }: { lang: Lang; short?: boolean; className?: string }) {
  const words = lang === "en" ? "excl. payment" : "hors paiement";
  const title = lang === "en" ? "Excluding payment: the real payment test placed no order" : "Hors paiement : le test de paiement réel n’a pas confirmé de commande";
  return short ? (
    <span title={title} className={`inline-flex text-warn ${className}`}>
      <Icon name="payment" className="h-[1em] w-[1em]" />
      <span className="sr-only">{title}</span>
    </span>
  ) : (
    <span title={title} className={`whitespace-nowrap font-normal text-ink-2 ${className}`}>
      {" "}
      {words}
    </span>
  );
}

// pays: the real payment test linked to the audit, if any. exPay: a 100 % that must say "hors paiement".
export function summarize(runs: Run[], pays: { status: string; verdict: string | null }[] = []) {
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
    exPay: scored.length > 0 && ok === scored.length && payOpen(pays),
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
      <span className="pointer-events-none absolute left-4 right-4 top-[9px] truncate type-caption text-ink-2 transition-all duration-200 peer-placeholder-shown:top-[17px] peer-placeholder-shown:text-[17px] peer-focus:top-[9px] peer-focus:text-[12px]">
        {label}
      </span>
    </label>
  );
}


// ---------- controls shared by the team space ----------
// Segmented control (radio group): one look for every short exclusive choice, as on the home form.
// An option may carry a line icon (third item), drawn before its label.
// On phones the icons drop out and the padding tightens, so three choices fit a card at 390 px.
export function Segmented({ name, options, value, label, className = "" }: { name: string; options: ([string, React.ReactNode] | [string, React.ReactNode, string])[]; value: string; label: string; className?: string }) {
  return (
    <fieldset className={`inline-grid auto-cols-fr grid-flow-col rounded-[10px] bg-fill p-[3px] ${className}`}>
      <legend className="sr-only">{label}</legend>
      {options.map(([v, l, icon]) => (
        <label key={v} className="relative cursor-pointer">
          <input type="radio" name={name} value={v} defaultChecked={v === value} className="peer sr-only" />
          <span className="type-small flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-[8px] px-4 font-semibold max-sm:px-3 text-ink-2 transition-colors duration-200 peer-checked:bg-tile peer-checked:text-ink peer-checked:shadow-[0_1px_3px_rgb(0_0_0/0.12)] peer-focus-visible:outline-2 peer-focus-visible:outline-blue dark:peer-checked:bg-[#636366]">
            {icon && <Icon name={icon} className="h-[17px] w-[17px] max-sm:hidden" />}
            {l}
          </span>
        </label>
      ))}
    </fieldset>
  );
}

// Inset grouped list, like iOS Settings: a titled group of rows separated by hairlines.
// `icon`: a bare line glyph before the title, as on the Automations cards (20px, secondary ink).
export function Group({ title, icon, footer, aside, children }: { title?: string; icon?: string; footer?: React.ReactNode; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      {(title || aside) && (
        <div className="mb-3 flex min-h-7 flex-wrap items-center justify-between gap-x-4 gap-y-1 px-1">
          {title && (
            <h2 className="type-headline flex min-w-0 items-center gap-2.5">
              {icon && <Icon name={icon} className="h-5 w-5 text-ink-2" />}
              <span className="min-w-0">{footer ? <Hint tip={footer}>{title}</Hint> : title}</span>
            </h2>
          )}
          {aside}
        </div>
      )}
      <div className="overflow-hidden rounded-[18px] bg-tile">{children}</div>
      {/* A titled group keeps its explanation on the title, shown on hover; an untitled one has nowhere else to put it. */}
      {footer && !title && <p className="type-small mt-2.5 px-1 text-ink-2">{footer}</p>}
    </section>
  );
}

// Réglages tabs: what the team has on the leading side, what to add or change in a narrower column beside it.
// Two columns from 56rem of page width (a container query on SpaceShell, so the same with the sidebar folded or open),
// one below, main first. Every column stacks its groups on the page's 40px rhythm.
export function Columns({ main, side }: { main: React.ReactNode; side?: React.ReactNode }) {
  const col = "grid min-w-0 content-start gap-10 max-[734px]:gap-8";
  return (
    <div className={`grid items-start gap-10 max-[734px]:gap-8 ${side ? "@4xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] @6xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]" : ""}`}>
      <div className={col}>{main}</div>
      {side && <div className={col}>{side}</div>}
    </div>
  );
}

export function Row({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`flex min-h-[60px] flex-wrap items-center gap-x-4 gap-y-2 border-b border-hairline px-5 py-3 last:border-0 ${className}`}>{children}</div>;
}

// Initials in a circle: tells members apart at a glance without photos.
export function Avatar({ email, className = "h-9 w-9" }: { email: string; className?: string }) {
  return (
    <span className={`grid shrink-0 place-items-center rounded-full type-small font-semibold text-white ${className}`} style={{ background: accountColor(email) }} aria-hidden>
      {email[0]?.toUpperCase()}
    </span>
  );
}

const TAGGED = /^(Observé|Hypothèse|À vérifier|Correction possible) :\u00a0/;

// The LLM writes "1. Problème : … / Correction : …". Show each pair as a card; fall back to plain text.
// Evidence for each fix: the missions it names (by title), so the reader jumps to the screenshot and replay,
// and a ready-to-paste ticket for the merchant's developer. Both optional (the team space reuses this card without them).
export type FixMission = { n: number; title: string; shot: string | null; replay: string };
export type FixTicket = { report: string; site: string; device: string; date: string };

function ticketText(problem: string, lines: string[], ms: FixMission[], k: FixTicket) {
  return [
    `[AgentProof] ${k.site} : ${problem}`,
    `Rapport : ${k.report}`,
    `Appareil : ${k.device} · audit du ${k.date}`,
    ...lines.map((l) => l.replace(/\u00a0/g, " ")),
    ...ms.map((m) => `Mission ${m.n} « ${m.title} » · replay : ${m.replay}${m.shot ? ` · capture : ${m.shot}` : ""}`),
    "Les hypothèses et corrections sont générées par IA : à vérifier avant d'agir.",
  ].join("\n");
}

export async function Recommendations({ text, missions = [], ticket }: { text: string; missions?: FixMission[]; ticket?: FixTicket }) {
  const t = await getT();
  const TAG_EN: Record<string, string> = { Observé: "Observed", Hypothèse: "Hypothesis", "À vérifier": "To check", "Correction possible": "Possible fix" };
  const intro: string[] = [];
  const items: { problem: string; fix: string[] }[] = [];
  // Plans written before 20/11 said "payment not tested" even next to a payment test: the score's scope line says it right.
  for (const raw of text.replace(/ ?Le paiement n'a pas été testé\./g, "").split("\n")) {
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
  // Missions are matched on the plan as written (their titles are French), before any translation.
  const named = items.map((it) => [...it.problem.matchAll(/«\s*(.+?)\s*»/g)].map((m) => m[1]));
  // The plan is written in French: shown in the interface language, like the agent's text (lib/translate.ts).
  // Tags stay French in memory (they drive the layout) and get their label from TAG_EN; only the prose is sent.
  const lang = await getLang();
  if (lang !== "fr") {
    const value = (l: string) => (TAGGED.test(l) ? l.slice(l.match(TAGGED)![1].length + 3) : l);
    const src = [...intro, ...items.flatMap((it) => [it.problem, ...it.fix.map(value)])];
    const out = (await translate(src, lang, 8000, "fr")) as string[];
    let k = 0;
    intro.forEach((_, i) => (intro[i] = out[k++]));
    for (const it of items) {
      it.problem = out[k++];
      it.fix = it.fix.map((l) => {
        const tag = l.match(TAGGED)?.[1];
        const v = out[k++];
        return tag ? `${tag} :\u00a0${v}` : v;
      });
    }
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
        {items.map((it, i) => {
          const ms = missions.filter((m) => named[i].includes(m.title));
          return (
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
                      {k && <dt className={`inline font-semibold ${k === "Hypothèse" ? "text-warn" : ""}`}>{t(k, TAG_EN[k] ?? k)}{t(" : ", ": ")}</dt>}
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
            {(ms.length > 0 || ticket) && (
              <div className="no-print mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-5 type-small">
                {ms.map((m) => (
                  <a key={m.n} href={`#mission-${m.n}`} className="text-link hover:underline">
                    {t(`Voir la mission ${m.n}`, `See mission ${m.n}`)}
                  </a>
                ))}
                {ticket && <CopyButton value={ticketText(it.problem, it.fix, ms, ticket)} label={t("Copier pour mon développeur", "Copy for my developer")} done={t("Copié", "Copied")} />}
              </div>
            )}
          </li>
          );
        })}
      </ol>
    </div>
  );
}
