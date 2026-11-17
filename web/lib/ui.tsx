import { BLOCKERS } from "./engine";

// ---------- score ----------
// Score is never shown by color alone: every tone has a word and an icon.
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

const toneText: Record<Tone, string> = { pass: "text-pass", warn: "text-warn", fail: "text-fail", none: "text-ink-3" };
const toneBg: Record<Tone, string> = { pass: "bg-pass", warn: "bg-warn", fail: "bg-fail", none: "bg-ink-3" };
const toneSoft: Record<Tone, string> = { pass: "bg-pass-soft", warn: "bg-warn-soft", fail: "bg-fail-soft", none: "bg-card-2" };

export const scoreColor = (score: number | null) => toneText[scoreTone(score)];

export function ScoreBar({ score, className = "" }: { score: number | null; className?: string }) {
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-card-2 ${className}`} aria-hidden>
      <div className={`h-full rounded-full ${toneBg[scoreTone(score)]}`} style={{ width: `${score ?? 0}%` }} />
    </div>
  );
}

export function ToneLabel({ score }: { score: number | null }) {
  const t = scoreTone(score);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-semibold ${toneSoft[t]} ${toneText[t]}`}>
      <ToneIcon tone={t} />
      {toneWord[t]}
    </span>
  );
}

function ToneIcon({ tone }: { tone: Tone }) {
  const d = tone === "pass" ? "M4 8.5l2.5 2.5L12 5.5" : tone === "fail" ? "M5 5l6 6M11 5l-6 6" : tone === "warn" ? "M8 4.5v4.5M8 11.5v.01" : "M4 8h8";
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

// One square per mission: the score is literally the share of filled squares.
export function MissionDots({ ok, done, total }: { ok: number; done: number; total: number }) {
  const cells = Array.from({ length: Math.max(total, done) }, (_, i) => (i < ok ? "pass" : i < done ? "fail" : "todo"));
  return (
    <span className="inline-flex gap-1" role="img" aria-label={`${ok} missions réussies sur ${done} terminées`}>
      {cells.map((c, i) => (
        <span
          key={i}
          className={`grid h-4 w-4 place-items-center rounded-[4px] ${
            c === "pass" ? "bg-pass text-card" : c === "fail" ? "bg-fail-soft text-fail ring-1 ring-inset ring-fail/40" : "bg-card-2"
          }`}
        >
          {c !== "todo" && <ToneIcon tone={c} />}
        </span>
      ))}
    </span>
  );
}

// ---------- runs ----------
export function StatusBadge({ run }: { run: { status: string; success: boolean | null } }) {
  const [text, cls, icon] =
    run.status === "todo"
      ? ["En attente", "bg-card-2 text-ink-2", <span key="i" className="h-1.5 w-1.5 rounded-full bg-ink-3" />]
      : run.status === "launched"
        ? ["En cours", "bg-accent-soft text-accent", <span key="i" className="ap-spin h-3 w-3 rounded-full border-2 border-current border-t-transparent" />]
        : run.status === "error" || run.success === null
          ? ["Non vérifiée", "bg-card-2 text-ink-2", <span key="i" className="h-1.5 w-1.5 rounded-full bg-ink-3" />]
          : run.success
          ? ["Réussie", "bg-pass-soft text-pass", <ToneIcon key="i" tone="pass" />]
          : ["Bloquée", "bg-fail-soft text-fail", <ToneIcon key="i" tone="fail" />];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-semibold ${cls}`}>
      {icon}
      {text}
    </span>
  );
}

// The verdict stamped on a screenshot, like a mystery shopper's report.
export function Stamp({ success, label, animate = false }: { success: boolean; label?: string; animate?: boolean }) {
  return (
    <span
      className={`${animate ? "ap-stamp" : "-rotate-[8deg]"} inline-block rounded-md border-2 px-2.5 py-1 font-mono text-[12px] font-bold uppercase tracking-[0.12em] backdrop-blur-sm ${
        success ? "border-pass bg-card/85 text-pass" : "border-fail bg-card/85 text-fail"
      }`}
    >
      {success ? "Checkout atteint" : label ? `Bloqué · ${label}` : "Bloqué"}
    </span>
  );
}

// ---------- evidence ----------
export function BrowserFrame({ url, children, className = "" }: { url?: string | null; children: React.ReactNode; className?: string }) {
  let host = url ?? "";
  try {
    if (url) host = new URL(url).host + new URL(url).pathname.replace(/\/$/, "");
  } catch {}
  return (
    <div className={`overflow-hidden rounded-xl border border-line bg-card shadow-card ${className}`}>
      <div className="flex items-center gap-2 border-b border-line bg-card-2/60 px-3 py-2">
        <span className="flex gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
        </span>
        {host && <span className="min-w-0 flex-1 truncate rounded-md bg-card px-2 py-0.5 text-center font-mono text-[11px] text-ink-3">{host}</span>}
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}

export function AgentCursor({ x, y, animate = false }: { x: number; y: number; animate?: boolean }) {
  return (
    <span className="pointer-events-none absolute" style={{ left: `${x * 100}%`, top: `${y * 100}%` }} aria-hidden>
      <span className="ap-pulse absolute -left-4 -top-4 h-8 w-8 rounded-full border-2 border-accent" />
      <span className="absolute -left-1.5 -top-1.5 block h-3 w-3 rounded-full border-2 border-white bg-accent shadow-md" />
      <svg viewBox="0 0 20 20" className={`absolute left-1 top-1 h-6 w-6 drop-shadow ${animate ? "ap-travel" : ""}`}>
        <path d="M3 2l13 7-5.5 1.5L8.5 16z" fill="var(--accent)" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
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

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-accent">{children}</p>;
}

export function SectionTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-4">
      <h2 className="font-display text-[22px] font-semibold tracking-[-0.015em]">{children}</h2>
      {aside}
    </div>
  );
}
