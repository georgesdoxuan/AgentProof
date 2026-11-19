// Measures what moves while pages load: the header, the space's sidebar, the page title and the first block
// under it, frame by frame, during client-side navigations (sidebar clicks) and full page loads.
// The header and sidebar must never move; the title must sit at the same place in the skeleton and the page.
//
// Usage (dev server running, `npm --prefix web run dev`):
//   node scripts/layout-shift.mjs [--base http://localhost:3123] [--team "Espace de gdo"] [--out result.json]
// Needs the `playwright` package (npm i playwright in a scratch folder, then NODE_PATH=<it>/node_modules).
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const BASE = arg("base", "http://localhost:3123");
const TEAM = arg("team", "Espace de gdo");
const OUT = arg("out");
const TOL = 0.5; // px

const PAGES = [
  "/espace",
  "/espace/sites",
  "/espace/rapports",
  "/espace/classement",
  "/espace/nouveau",
  "/espace/automations",
  "/espace/abonnement",
  "/classement",
  "/",
];

// Runs in the page: samples the watched boxes on every frame until stopped.
const SAMPLER = () => {
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return [Math.round(r.left * 10) / 10, Math.round(r.top * 10) / 10, Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10];
  };
  const pick = () => {
    const h1 = document.querySelector("main h1");
    const head = h1?.closest("header");
    return {
      header: box(document.querySelector("body > header")),
      logo: box(document.querySelector("body > header a")),
      aside: box(document.querySelector("[data-app-shell] aside")),
      navItem: box(document.querySelector("[data-app-shell] aside nav a")),
      h1: box(h1),
      below: box(head?.nextElementSibling ?? null),
      busy: !!document.querySelector("[aria-busy=true]"),
      path: location.pathname,
      sw: window.innerWidth - document.documentElement.clientWidth,
    };
  };
  window.__ls = { frames: [], cls: 0, shifts: [] };
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) {
      window.__ls.cls += e.value;
      window.__ls.shifts.push({ v: Math.round(e.value * 10000) / 10000, input: e.hadRecentInput, src: (e.sources || []).map((s) => (s.node ? `${s.node.nodeName}.${String(s.node.className || "").slice(0, 60)}` : "?") + ` ${Math.round(s.previousRect.y)}→${Math.round(s.currentRect.y)}`) });
    }
  }).observe({ type: "layout-shift", buffered: true });
  const tick = () => {
    if (window.__lsStop) return;
    window.__ls.frames.push({ t: Math.round(performance.now()), ...pick() });
    requestAnimationFrame(tick);
  };
  tick();
};

const diff = (a, b) => (a && b ? Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[3] - b[3])) : 0);

function analyse(frames, from, to) {
  const first = frames[0];
  const last = frames[frames.length - 1];
  const report = { moves: {} };
  // Fixed chrome: compared with the frame before the click (the header) or with the final frame (the sidebar,
  // whose height may legitimately differ between pages with and without the sidebar).
  for (const k of ["header", "logo", "aside", "navItem"]) {
    let max = 0;
    const ref = k === "header" || k === "logo" ? first[k] : last[k];
    for (const f of frames) if (f[k] && ref && (f.path === to || k === "header" || k === "logo")) max = Math.max(max, diff(f[k], ref));
    if (max > TOL) report.moves[k] = max;
  }
  // Title and first block: every distinct position they take on the new page, in order.
  for (const k of ["h1", "below"]) {
    const seq = [];
    for (const f of frames) {
      if (f.path !== to || !f[k]) continue;
      const y = f[k][1];
      if (!seq.length || Math.abs(seq[seq.length - 1].y - y) > TOL) seq.push({ y, busy: f.busy });
    }
    const end = last[k]?.[1];
    const off = seq.filter((s) => end != null && Math.abs(s.y - end) > TOL);
    if (off.length) report.moves[k] = seq.map((s) => `${s.y}${s.busy ? "(sk)" : ""}`).join(" → ");
  }
  const sws = [...new Set(frames.map((f) => f.sw))];
  if (sws.length > 1) report.moves.scrollbar = sws.join(" → ");
  return report;
}

async function settle(page) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForFunction(() => !document.querySelector("[aria-busy=true]"), null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(600);
}

async function run(viewport) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport });
  await page.goto(`${BASE}/api/auth/dev?email=claude@agentproof.test&next=/espace`);
  await settle(page);
  // Georges's team has real sites and reports: switch to it when it is offered.
  const sel = page.locator("[data-app-shell] aside select").first();
  if (await sel.count()) {
    const opts = await sel.locator("option").allTextContents();
    const cur = await sel.inputValue();
    const want = await sel.locator("option", { hasText: TEAM }).first().getAttribute("value").catch(() => null);
    if (want && want !== cur) {
      await Promise.all([page.waitForURL(/.*/, { waitUntil: "load" }), sel.selectOption(want)]);
      await settle(page);
    }
    console.error(`teams: ${opts.join(", ")}`);
  }
  // A site page and a report, found on the list pages.
  const pages = [...PAGES];
  await page.goto(`${BASE}/espace/sites`);
  await settle(page);
  const site = await page.locator('main a[href^="/espace/sites/"]:not([href$="corbeille"])').first().getAttribute("href").catch(() => null);
  if (site) pages.splice(2, 0, site);
  await page.goto(`${BASE}/espace/rapports`);
  await settle(page);
  const rep = await page.locator('main a[href^="/audit/"]').first().getAttribute("href").catch(() => null);
  if (rep) pages.push(rep.split("#")[0]);

  // Warm up: compile every route once so dev-mode compile time does not stand in for real loading.
  for (const p of pages) {
    await page.goto(BASE + p);
    await settle(page);
  }

  const results = [];
  // 1) Client-side navigation, each page to the next one, through Next's router (same path as a <Link> click).
  for (let i = 0; i < pages.length; i++) {
    const from = pages[i];
    const to = pages[(i + 1) % pages.length];
    await page.goto(BASE + from);
    await settle(page);
    await page.evaluate(SAMPLER);
    await page.evaluate((to) => {
      const a = [...document.querySelectorAll("a[href]")].find((a) => a.getAttribute("href") === to);
      if (a) a.click();
      else window.next?.router?.push(to);
    }, to);
    await page.waitForURL((u) => u.pathname === to.split("?")[0], { timeout: 30000 }).catch(() => {});
    await settle(page);
    const data = await page.evaluate(() => {
      window.__lsStop = true;
      return window.__ls;
    });
    results.push({ kind: "nav", from, to, cls: Math.round(data.cls * 10000) / 10000, ...analyse(data.frames, from, to), shifts: data.shifts.filter((s) => s.v > 0.001).slice(0, 6) });
  }
  // 2) Full page loads (reload / link opened in a new tab): CLS from the browser.
  await page.addInitScript(SAMPLER);
  for (const p of pages) {
    await page.goto(BASE + p);
    await settle(page);
    const data = await page.evaluate(() => {
      window.__lsStop = true;
      return window.__ls;
    });
    results.push({ kind: "load", to: p, cls: Math.round(data.cls * 10000) / 10000, ...analyse(data.frames, p, p), shifts: data.shifts.filter((s) => s.v > 0.001).slice(0, 6) });
  }
  await browser.close();
  return results;
}

const all = {};
for (const [name, vp] of [["desktop", { width: 1440, height: 900 }], ["mobile", { width: 390, height: 844 }]]) {
  all[name] = await run(vp);
  console.log(`\n## ${name}`);
  for (const r of all[name]) {
    const moves = Object.entries(r.moves).map(([k, v]) => `${k}: ${v}`).join("; ");
    console.log(`${r.kind === "nav" ? `${r.from} → ${r.to}` : `load ${r.to}`}  cls=${r.cls}${moves ? `  MOVES ${moves}` : ""}`);
  }
}
if (OUT) writeFileSync(OUT, JSON.stringify(all, null, 2));
