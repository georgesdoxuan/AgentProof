import { BLOCKERS } from "./engine";

// ---------- score ----------
// Never color alone: every tone has a word and a glyph.
export type Tone = "pass" | "warn" | "fail" | "none";

export function scoreTone(score: number | null): Tone {
  if (score == null) return "none";
  return score >= 70 ? "pass" : score >= 40 ? "warn" : "fail";
}

export const toneWord: Record<Tone, string> = {
  pass: "Prêt pour les agents",
  warn: "Fragile",
  fail: "Bloquant",
  none: "En attente",
};

const toneText: Record<Tone, string> = { pass: "text-pass", warn: "text-warn", fail: "text-fail", none: "text-ink-2" };

// SF Symbols-style filled circles: checkmark, exclamationmark, xmark, minus.
const GLYPH: Record<Tone, string> = {
  pass: "M6.2 10.3l2.6 2.6 5-5.6",
  warn: "M10 5.6v5.2M10 14.1v.1",
  fail: "M7 7l6 6M13 7l-6 6",
  none: "M6.5 10h7",
};

export function StatusGlyph({ tone, className = "h-[1.05em] w-[1.05em]" }: { tone: Tone; className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={`shrink-0 ${toneText[tone]} ${className}`} aria-hidden>
      <circle cx="10" cy="10" r="10" fill="currentColor" />
      <path d={GLYPH[tone]} fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ToneLabel({ score, className = "" }: { score: number | null; className?: string }) {
  const t = scoreTone(score);
  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold ${toneText[t]} ${className}`}>
      <StatusGlyph tone={t} />
      {toneWord[t]}
    </span>
  );
}

// One segment per mission, like the storage bar in iPhone Settings: the score is the share of green.
export function MissionBar({ ok, done, total, size = "md" }: { ok: number; done: number; total: number; size?: "sm" | "md" | "lg" }) {
  const n = Math.max(total, done, 1);
  const h = size === "lg" ? "h-3" : size === "sm" ? "h-1.5" : "h-2";
  return (
    <span className={`flex w-full gap-[3px] ${h}`} role="img" aria-label={`${ok} missions réussies sur ${done} comptées`}>
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
export function StatusBadge({ run }: { run: { status: string; success: boolean | null } }) {
  if (run.status === "launched")
    return (
      <span className="inline-flex items-center gap-1.5 font-semibold text-ink-2">
        <Spinner />
        En cours
      </span>
    );
  const [text, tone]: [string, Tone] =
    run.status === "todo"
      ? ["En attente", "none"]
      : run.status === "error" || run.success === null
        ? ["Non vérifiée", "none"]
        : run.success
          ? ["Réussie", "pass"]
          : ["Bloquée", "fail"];
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
export function Verdict({ success, label, className = "" }: { success: boolean; label?: string; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-glass px-3 py-1.5 type-small font-semibold shadow-[0_4px_16px_rgb(0_0_0/0.12),inset_0_0_0_0.5px_rgb(0_0_0/0.08)] backdrop-blur-xl backdrop-saturate-150 ${className}`}
    >
      <StatusGlyph tone={success ? "pass" : "fail"} />
      <span className="text-ink">{success ? "Checkout atteint" : label ? `Bloqué · ${label}` : "Bloqué"}</span>
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

// ---------- helpers ----------
export const blockerLabel = (b: string | null) => (b ? BLOCKERS[b] ?? b : "—");

type Run = { status: string; success: boolean | null; blocker_type: string | null };

// Outcomes that say nothing about the site's interface are shown but kept out of the score.
export const EXCLUDED = ["out_of_stock", "captcha_or_bot_block"];

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

export function Chevron({ dir = "right", className = "h-[0.7em] w-[0.7em]" }: { dir?: "right" | "left" | "down"; className?: string }) {
  const d = dir === "left" ? "M8 1.5L3.5 6 8 10.5" : dir === "down" ? "M1.5 4L6 8.5 10.5 4" : "M4 1.5L8.5 6 4 10.5";
  return (
    <svg viewBox="0 0 12 12" className={`shrink-0 ${className}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

// apple.com form field: the label sits in the field and floats up once it has focus or text.
export function Field({ label, name, required, type = "url", defaultValue }: { label: string; name: string; required?: boolean; type?: "url" | "email" | "text"; defaultValue?: string }) {
  return (
    <label className="relative block">
      <input
        name={name}
        required={required}
        defaultValue={defaultValue}
        type={type === "email" ? "email" : "text"}
        placeholder=" "
        inputMode={type}
        autoComplete={type === "text" ? "off" : type}
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

