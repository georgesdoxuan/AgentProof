"use client";
import { useEffect, useMemo, useState } from "react";

// Espace › Corrections: the server renders every row (summary + details) and the group heads; this filters, sorts,
// groups and exports them. Filters live in a cookie (read by page.tsx), so the first paint already shows the saved view.
import { CORRECTIONS_COOKIE, DEFAULT_FILTERS, type Filters, type Labels, type Meta } from "./filters";

const fold = (x: string) => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const DAY = 86_400_000;
const STATUSES: Filters["status"][] = ["open", "check", "done", "all"];
const inStatus = (m: Meta, s: Filters["status"]) => (s === "all" ? true : s === "open" ? m.status === "todo" || m.status === "back" : s === "check" ? m.status === "check" : m.status === "done");

// Same pop-up look as the space's other selects (controls.tsx): native menu, no default chrome.
const popUp =
  "h-9 max-w-full cursor-pointer appearance-none truncate rounded-[8px] bg-fill bg-[length:10px] bg-[right_10px_center] bg-no-repeat pl-3 pr-8 type-small font-semibold text-ink transition-colors hover:bg-line/60 focus-visible:outline-2 focus-visible:outline-blue data-[on=true]:bg-blue/12 data-[on=true]:text-link";
const popUpChevrons = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 14'%3E%3Cpath d='M2 5l3-3 3 3M2 9l3 3 3-3' fill='none' stroke='%2386868b' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
};
const glyph = (d: string, cls: string) => (
  <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={d} />
  </svg>
);
const SEARCH = "M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM15.5 15.5 20 20";
const DOWNLOAD = "M12 4v11M7.5 10.5 12 15l4.5-4.5M5 20h14";

export function CorrectionsBoard({
  items,
  rows,
  heads,
  initial,
  L,
  now,
  file,
}: {
  items: Meta[];
  rows: Record<string, React.ReactNode>;
  heads: Record<string, React.ReactNode>;
  initial: Filters;
  L: Labels;
  now: number;
  file: string;
}) {
  const [f, setF] = useState<Filters>(initial);
  const [q, setQ] = useState("");
  const [copied, setCopied] = useState(false);
  const count = (n: number) => (n > 1 ? L.countMany : L.countOne).replace("{n}", String(n));

  const set = (patch: Partial<Filters>) => {
    const next = { ...f, ...patch };
    setF(next);
    document.cookie = `${CORRECTIONS_COOKIE}=${encodeURIComponent(JSON.stringify(next))}; path=/; max-age=31536000; samesite=lax`;
  };

  // A link to one correction (#c-…, from the home cards or a copied ticket): show it whatever the saved filters, and open it.
  useEffect(() => {
    const open = () => {
      const id = decodeURIComponent(location.hash.slice(1));
      const m = items.find((x) => x.id === id);
      if (!m) return;
      setQ("");
      setF((cur) => ({ ...DEFAULT_FILTERS, status: inStatus(m, cur.status) ? cur.status : "all", sort: cur.sort, group: cur.group }));
      requestAnimationFrame(() => {
        const el = document.getElementById(id) as HTMLDetailsElement | null;
        if (!el) return;
        el.open = true;
        el.scrollIntoView({ block: "start" });
      });
    };
    open();
    window.addEventListener("hashchange", open);
    return () => window.removeEventListener("hashchange", open);
  }, [items]);

  // Everything but the status: the status tabs count within the other filters.
  const query = fold(q.trim());
  const base = useMemo(
    () =>
      items.filter(
        (m) =>
          (f.site === "all" || m.site === f.site) &&
          (f.kind === "all" || m.kind === f.kind) &&
          (f.impact === "all" || String(m.impact) === f.impact) &&
          (f.device === "all" || m.device === f.device) &&
          (f.period === "all" || now - Date.parse(m.at) <= (f.period === "7d" ? 7 : 30) * DAY) &&
          (!query || m.text.includes(query)),
      ),
    [items, f, query, now],
  );
  const shown = useMemo(() => {
    const byImpact = (a: Meta, b: Meta) => b.impact - a.impact || b.missions - a.missions;
    const byDate = (a: Meta, b: Meta) => Date.parse(b.at) - Date.parse(a.at);
    const bySite = (a: Meta, b: Meta) => a.siteLabel.localeCompare(b.siteLabel) || a.device.localeCompare(b.device);
    const cmp = f.sort === "date" ? (a: Meta, b: Meta) => byDate(a, b) || byImpact(a, b) : f.sort === "site" ? (a: Meta, b: Meta) => bySite(a, b) || byImpact(a, b) : (a: Meta, b: Meta) => byImpact(a, b) || byDate(a, b);
    return base.filter((m) => inStatus(m, f.status)).sort(cmp);
  }, [base, f.status, f.sort]);

  // Options only for what the team has: one site = no site menu, no payment test = no type menu, and so on.
  const sites = useMemo(() => [...new Map(items.map((m) => [m.site, m.siteLabel + (items.some((x) => x.site !== m.site && x.siteLabel === m.siteLabel) ? ` · ${L.devices[m.device as "desktop" | "mobile"]}` : "")])).entries()].sort((a, b) => a[1].localeCompare(b[1])), [items, L]);
  const kinds = [...new Set(items.map((m) => m.kind))];
  const devices = [...new Set(items.map((m) => m.device))];
  const impacts = (["3", "2", "1", "0"] as const).filter((i) => items.some((m) => String(m.impact) === i));
  const filtered = f.site !== "all" || f.kind !== "all" || f.impact !== "all" || f.device !== "all" || f.period !== "all" || !!query;

  const exportCsv = () => {
    const cell = (s: string) => (/[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
    // Semicolons and a BOM: opens in French Excel and Numbers as columns, accents intact.
    const text = "\ufeff" + [L.csvHead, ...shown.map((m) => m.csv)].map((r) => r.map(cell).join(";")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
    a.download = file;
    a.click();
    URL.revokeObjectURL(a.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const select = (label: string, value: string, onChange: (v: string) => void, options: [string, string][]) => (
    <label className="min-w-0">
      <span className="sr-only">{label}</span>
      <select value={value} data-on={value !== options[0][0] || undefined} onChange={(e) => onChange(e.target.value)} className={popUp} style={popUpChevrons}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );

  const groups = f.group ? [...new Set(shown.map((m) => m.site))] : [null];
  const tab = "type-small flex h-8 items-center gap-1.5 whitespace-nowrap rounded-[8px] px-3 font-semibold text-ink-2 transition-colors aria-[pressed=true]:bg-tile aria-[pressed=true]:text-ink aria-[pressed=true]:shadow-[0_1px_3px_rgb(0_0_0/0.12)] dark:aria-[pressed=true]:bg-[#636366]";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label={L.statusLabel} className="-mx-1 max-w-[calc(100%+0.5rem)] overflow-x-auto px-1 [scrollbar-width:none]">
          <div className="inline-flex rounded-[10px] bg-fill p-[3px]">
            {STATUSES.map((s) => (
              <button key={s} type="button" aria-pressed={f.status === s} onClick={() => set({ status: s })} className={tab}>
                {L.status[s]}
                <span className="font-normal text-ink-2 tnum">{base.filter((m) => inStatus(m, s)).length}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2 max-sm:w-full">
          <label className="relative min-w-0 max-sm:flex-1">
            <span className="sr-only">{L.search}</span>
            {glyph(SEARCH, "pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-2")}
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value.slice(0, 80))}
              placeholder={L.search}
              className="type-small h-9 w-56 max-w-full rounded-[8px] bg-fill pl-8 pr-3 text-ink outline-none placeholder:text-ink-2 focus-visible:outline-2 focus-visible:outline-blue max-sm:w-full"
            />
          </label>
          <button type="button" onClick={exportCsv} disabled={!shown.length} className="type-small inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-fill px-3 font-semibold text-ink transition-colors hover:bg-line/60 disabled:opacity-40" aria-live="polite">
            {glyph(DOWNLOAD, "h-4 w-4 text-ink-2")}
            {copied ? L.exportDone : L.export}
          </button>
        </div>
      </div>

      <div role="group" aria-label={L.filtersLabel} className="flex flex-wrap items-center gap-2">
        {sites.length > 1 && select(L.site, f.site, (v) => set({ site: v }), [["all", L.allSites], ...sites])}
        {kinds.length > 1 && select(L.kind, f.kind, (v) => set({ kind: v }), [["all", L.allKinds], ...kinds.map((k) => [k, L.kinds[k]] as [string, string])])}
        {impacts.length > 1 && select(L.impact, f.impact, (v) => set({ impact: v }), [["all", L.allImpacts], ...impacts.map((i) => [i, L.impacts[i]] as [string, string])])}
        {devices.length > 1 && select(L.device, f.device, (v) => set({ device: v }), [["all", L.allDevices], ...devices.map((d) => [d, L.devices[d as "desktop" | "mobile"]] as [string, string])])}
        {select(L.period, f.period, (v) => set({ period: v }), [["all", L.periods.all], ["30d", L.periods["30d"]], ["7d", L.periods["7d"]]])}
        {filtered && (
          <button type="button" onClick={() => (setQ(""), set({ site: "all", kind: "all", impact: "all", device: "all", period: "all" }))} className="type-small h-9 px-2 text-link hover:underline">
            {L.reset}
          </button>
        )}
        <span className="ml-auto flex flex-wrap items-center gap-2">
          {select(L.sort, f.sort, (v) => set({ sort: v as Filters["sort"] }), [["impact", L.sorts.impact], ["date", L.sorts.date], ["site", L.sorts.site]])}
          <label className="type-small inline-flex h-9 cursor-pointer items-center gap-2 rounded-[8px] bg-fill px-3 font-semibold text-ink transition-colors hover:bg-line/60 has-[:checked]:bg-blue/12 has-[:checked]:text-link has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-blue">
            <input type="checkbox" checked={f.group} onChange={(e) => set({ group: e.target.checked })} className="sr-only" />
            {glyph("M4 6h16M4 12h10M4 18h7", "h-4 w-4")}
            {L.group}
          </label>
        </span>
      </div>

      <p className="sr-only" aria-live="polite">
        {count(shown.length)}
      </p>

      <div className="space-y-6">
        {!shown.length ? (
          <div className="tile flex flex-col items-center gap-3 py-12! text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-fill text-ink-2" aria-hidden>
              {glyph(filtered ? SEARCH : "M5 12.5l4.5 4.5L19 7.5", "h-6 w-6")}
            </span>
            <p className="type-headline">{L.emptyTitle}</p>
            {filtered && (
              <button type="button" onClick={() => (setQ(""), set({ site: "all", kind: "all", impact: "all", device: "all", period: "all" }))} className="type-small text-link hover:underline">
                {L.reset}
              </button>
            )}
          </div>
        ) : (
          groups.map((g) => {
            const mine = g ? shown.filter((m) => m.site === g) : shown;
            return (
              <section key={g ?? "all"}>
                {g && (
                  <div className="mb-3 flex items-center justify-between gap-3 px-1">
                    {heads[g]}
                    <span className="type-small text-ink-2 tnum">{count(mine.length)}</span>
                  </div>
                )}
                <div className="overflow-hidden rounded-[18px] bg-tile">{mine.map((m) => <div key={m.id}>{rows[m.id]}</div>)}</div>
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}
