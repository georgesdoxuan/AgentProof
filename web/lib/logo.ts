import "server-only";
import sharp from "sharp";
import { db } from "./engine";

// Site logos, shown next to every site name (nominative use only: the logos belong to their owners).
// Order: what the site itself declares (square icons first, since the slot is a square), then one third-party
// favicon service, then nothing (the UI draws the brand's initial). Only the public domain name ever leaves the server.
// The result is cached in sites.logo_url (Storage bucket "logos"); logo_checked_at set + logo_url null = nothing found.

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";
const SIZE = 128; // stored square, enough for a 2x retina 48 px slot
const MAX_BYTES = 2_000_000;

type Cand = { url: string; source: string; minPx: number };

async function get(url: string, ms = 8000) {
  return fetch(url, { headers: { "user-agent": UA, accept: "text/html,image/*,*/*;q=0.8", "accept-language": "fr-FR,fr;q=0.9,en;q=0.8" }, redirect: "follow", signal: AbortSignal.timeout(ms) });
}

const attr = (tag: string, name: string) => tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"))?.slice(2).find((v) => v != null) ?? null;
const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&#x2F;/gi, "/").replace(/&#47;/g, "/");
const largest = (sizes: string | null) => Math.max(0, ...(sizes ?? "").split(/\s+/).map((s) => (s.toLowerCase() === "any" ? 512 : parseInt(s, 10) || 0)));

// Candidate images declared by the home page, best first.
export async function declaredLogos(html: string, base: string): Promise<Cand[]> {
  const abs = (u: string | null) => {
    if (!u || u.startsWith("data:")) return null;
    try { return new URL(decode(u.trim()), base).href; } catch { return null; }
  };
  const out: (Cand & { rank: number })[] = [];
  const push = (u: string | null, source: string, rank: number, minPx = 64) => {
    let url = abs(u);
    if (!url || !/^https?:/.test(url)) return;
    // Shopify serves any size from the same file: ask for a sharp 256 px favicon instead of the 32 px one.
    if (/\/cdn\/shop\//.test(url)) url = url.replace(/([?&])(width|height)=\d+/g, "$1$2=256");
    out.push({ url, source, rank, minPx });
  };

  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    const rel = (attr(tag, "rel") ?? "").toLowerCase();
    const href = attr(tag, "href");
    if (/apple-touch-icon/.test(rel)) push(href, "apple-touch-icon", 0 + (1 - Math.min(largest(attr(tag, "sizes")), 512) / 1000));
    else if (/(^|\s)icon(\s|$)/.test(rel)) {
      const px = largest(attr(tag, "sizes"));
      const svg = /\.svg(\?|$)/i.test(href ?? "") || /svg/.test(attr(tag, "type") ?? "");
      if (svg || px >= 96) push(href, svg ? "icon-svg" : "icon", 3 + (1 - Math.min(px, 512) / 1000));
      else push(href, "favicon", 4, 48);
    } else if (rel === "manifest" && href) {
      const m = await get(abs(href)!, 5000).then((r) => (r.ok ? r.json() : null)).catch(() => null);
      for (const i of (m?.icons ?? []) as { src?: string; sizes?: string; purpose?: string }[]) {
        if (/maskable/.test(i.purpose ?? "") && !/any/.test(i.purpose ?? "")) continue;
        if (largest(i.sizes ?? null) >= 96) push(i.src ?? null, "manifest", 1 + (1 - Math.min(largest(i.sizes ?? null), 512) / 1000));
      }
    }
  }
  // JSON-LD Organization.logo
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const walk = (n: unknown): void => {
        if (Array.isArray(n)) return n.forEach(walk);
        if (!n || typeof n !== "object") return;
        const o = n as Record<string, unknown>;
        if (o.logo) push(typeof o.logo === "string" ? o.logo : ((o.logo as Record<string, string>).url ?? null), "json-ld", 2);
        Object.values(o).forEach((v) => typeof v === "object" && walk(v));
      };
      walk(JSON.parse(m[1]));
    } catch {}
  }
  // <img> whose class, id, alt or src says "logo" (header logos)
  for (const tag of html.match(/<img\b[^>]*>/gi) ?? []) {
    const hay = [attr(tag, "class"), attr(tag, "id"), attr(tag, "alt"), attr(tag, "src")].join(" ").toLowerCase();
    if (/\blogo/.test(hay) && !/(payment|paiement|visa|mastercard|paypal|partner|footer|trustpilot|app-?store|google-?play)/.test(hay)) push(attr(tag, "src"), "img-logo", 5);
  }
  // og:logo only: og:image is a marketing photo far more often than a logo.
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) if (/og:logo/i.test(attr(tag, "property") ?? "")) push(attr(tag, "content"), "og:logo", 2.5);

  const seen = new Set<string>();
  return out.sort((a, b) => a.rank - b.rank).filter((c) => !seen.has(c.url) && seen.add(c.url));
}

// .ico files: sharp cannot read them. Take the largest entry, embedded PNG or 32-bit BMP (BGRA, bottom-up, AND mask after).
function icoToImage(b: Buffer) {
  const n = b.readUInt16LE(4);
  const best = Array.from({ length: n }, (_, i) => ({ w: b[6 + 16 * i] || 256, h: b[7 + 16 * i] || 256, off: b.readUInt32LE(18 + 16 * i) }))
    .filter((e) => e.off < b.length)
    .sort((a, c) => c.w - a.w)[0];
  if (!best) return null;
  const d = b.subarray(best.off);
  if (d.readUInt32BE(0) === 0x89504e47) return sharp(d);
  if (d.readUInt32LE(0) !== 40 || d.readUInt16LE(14) !== 32) return null;
  const { w, h } = best, px = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const s = 40 + ((h - 1 - y) * w + x) * 4, t = (y * w + x) * 4;
      px[t] = d[s + 2]; px[t + 1] = d[s + 1]; px[t + 2] = d[s]; px[t + 3] = d[s + 3];
    }
  return sharp(px, { raw: { width: w, height: h, channels: 4 } });
}

// Downloads an image and checks it is a real, usable logo. Returns a 128 px square PNG.
export async function vetImage(url: string, minPx = 64): Promise<Buffer | null> {
  const r = await get(url).catch(() => null);
  if (!r?.ok) return null;
  const type = r.headers.get("content-type") ?? "";
  if (/text\/html|json/.test(type)) return null; // error page served with 200
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length < 200 || buf.length > MAX_BYTES) return null;
  const svg = /svg/.test(type) || /^\s*(<\?xml[^>]*>\s*)?<svg/i.test(buf.subarray(0, 300).toString());
  try {
    const src = buf.readUInt32BE(0) === 0x00000100 ? icoToImage(buf) : sharp(buf, { density: svg ? 300 : undefined });
    if (!src) return null;
    const { width: w0 = 0, height: h0 = 0 } = await src.metadata();
    if (!w0 || !h0 || (!svg && Math.min(w0, h0) < minPx)) return null;
    // Trim uniform margins (white or transparent) so every logo fills its tile the same way.
    const png = await src.png().toBuffer();
    const trimmed = await sharp(png).trim({ threshold: 12 }).png().toBuffer().catch(() => png);
    const img = sharp(trimmed).ensureAlpha();
    const { width: w = 0, height: h = 0 } = await img.metadata();
    const ratio = w / h;
    if (ratio > 3 || ratio < 1 / 3) return null; // wide banners and wordmarks unreadable in a square
    const stats = await img.clone().stats();
    if (stats.isOpaque && stats.channels.slice(0, 3).every((c) => c.stdev < 2)) return null; // flat single color: placeholder
    if (!stats.isOpaque) {
      // White logo on transparent (made for a dark header): invisible on the light tile.
      const { data } = await img.clone().resize(48, 48, { fit: "inside" }).raw().toBuffer({ resolveWithObject: true });
      let lum = 0, a = 0;
      for (let i = 0; i < data.length; i += 4) { const al = data[i + 3] / 255; lum += al * (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]); a += al; }
      if (!a || lum / a > 225) return null;
    }
    // A full-bleed square app icon fills the tile; anything else gets a 12 % margin.
    // Only when nothing was trimmed: an opaque logo on a white field gets a margin, not a crop.
    const bleed = stats.isOpaque && ratio > 0.9 && ratio < 1.1 && w >= w0 * 0.95 && h >= h0 * 0.95;
    const inner = bleed ? SIZE : Math.round(SIZE * 0.76);
    const pad = (SIZE - inner) / 2;
    const bg = stats.isOpaque ? { r: 255, g: 255, b: 255, alpha: 1 } : { r: 0, g: 0, b: 0, alpha: 0 };
    return await img
      .resize(inner, inner, { fit: "contain", background: bg })
      .extend({ top: Math.floor(pad), bottom: Math.ceil(pad), left: Math.floor(pad), right: Math.ceil(pad), background: bg })
      .png({ palette: true, quality: 90, effort: 10 }) // a few KB instead of ~20
      .toBuffer();
  } catch {
    return null; // formats sharp cannot read
  }
}

// Favicon services, as a fallback: only the public domain name is sent. Google answers 404 (generic globe) when it has
// nothing; DuckDuckGo answers 404 too. Both serve the site's own favicon, never another brand's logo.
const SERVICES = [
  (d: string) => ["google-s2", `https://www.google.com/s2/favicons?domain=${encodeURIComponent(d)}&sz=128`],
  (d: string) => ["duckduckgo", `https://icons.duckduckgo.com/ip3/${encodeURIComponent(d)}.ico`],
] as const;

// ---------- cutout ----------
// Removes the background (and a solid plate behind the mark, like an app-icon square) so the logo sits on the page
// itself, then writes two variants: one for light pages, one for dark pages (dark ink turned light).
const lum = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const sat = (r: number, g: number, b: number) => (Math.max(r, g, b) - Math.min(r, g, b)) / 255;

// Flood fill from the edges of the box: pixels close to the border's median color become transparent (soft edge).
function peel(px: Buffer, W: number, box: [number, number, number, number]) {
  const [x0, y0, x1, y1] = box;
  const border: number[][] = [];
  for (let x = x0; x <= x1; x++) for (const y of [y0, y1]) border.push([x, y]);
  for (let y = y0; y <= y1; y++) for (const x of [x0, x1]) border.push([x, y]);
  const opaque = border.filter(([x, y]) => px[(y * W + x) * 4 + 3] > 200);
  if (opaque.length < border.length * 0.6) return false; // already transparent around: nothing to peel
  const med = [0, 1, 2].map((c) => opaque.map(([x, y]) => px[(y * W + x) * 4 + c]).sort((a, b) => a - b)[opaque.length >> 1]);
  const dist = (i: number) => Math.hypot(px[i] - med[0], px[i + 1] - med[1], px[i + 2] - med[2]);
  // The border must be one color (a plate), not the logo itself running off the edge.
  if (opaque.filter(([x, y]) => dist((y * W + x) * 4) < 40).length < border.length * 0.85) return false;
  // A pixel joins the background if it is close to the border color, or very close to the background pixel next to
  // it (a soft gradient plate, like Nike's grey tile).
  const T = 38, seen = new Uint8Array(px.length / 4), stack: [number, number][] = opaque.map(([x, y]) => [y * W + x, -1]);
  const orig = Buffer.from(px);
  while (stack.length) {
    const [p, from] = stack.pop()!;
    if (seen[p]) continue;
    const i = p * 4, d = dist(i);
    const smooth = from >= 0 && orig[i + 3] > 200 && Math.hypot(orig[i] - orig[from * 4], orig[i + 1] - orig[from * 4 + 1], orig[i + 2] - orig[from * 4 + 2]) < 6;
    if (orig[i + 3] > 0 && d > T * 2 && !smooth) continue;
    seen[p] = 1;
    px[i + 3] = smooth && d > T ? 0 : Math.round(orig[i + 3] * Math.min(1, Math.max(0, (d - T) / T)));
    const x = p % W, y = (p / W) | 0;
    if (x > x0) stack.push([p - 1, p]);
    if (x < x1) stack.push([p + 1, p]);
    if (y > y0) stack.push([p - W, p]);
    if (y < y1) stack.push([p + W, p]);
  }
  return true;
}

function bbox(px: Buffer, W: number, H: number): [number, number, number, number] | null {
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (px[(y * W + x) * 4 + 3] > 24) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return x1 < 0 ? null : [x0, y0, x1, y1];
}

export async function cutout(png: Buffer): Promise<{ light: Buffer; dark: Buffer } | null> {
  const N = 256;
  const { data, info } = await sharp(png).resize(N, N, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = Buffer.from(data), W = info.width, H = info.height, src = Buffer.from(data);
  peel(px, W, [0, 0, W - 1, H - 1]);
  // A plate left behind (square or rounded tile filling its box): peel it too, once.
  const b = bbox(px, W, H);
  if (!b) return null;
  let filled = 0;
  for (let y = b[1]; y <= b[3]; y++) for (let x = b[0]; x <= b[2]; x++) if (px[(y * W + x) * 4 + 3] > 200) filled++;
  if (filled / ((b[2] - b[0] + 1) * (b[3] - b[1] + 1)) > 0.8) {
    // rounded corners are transparent: inset the box a little so its edge lies on the plate
    const k = Math.round(Math.min(b[2] - b[0], b[3] - b[1]) * 0.12);
    const before = Buffer.from(px);
    if (peel(px, W, [b[0] + k, b[1] + k, b[2] - k, b[3] - k])) {
      // clear what is outside the inset box but still the plate's color (its rounded rim)
      for (let y = b[1]; y <= b[3]; y++) for (let x = b[0]; x <= b[2]; x++) {
        if (x >= b[0] + k && x <= b[2] - k && y >= b[1] + k && y <= b[3] - k) continue;
        px[(y * W + x) * 4 + 3] = 0;
      }
      if (!bbox(px, W, H)) px.set(before); // the plate was the whole logo: keep it
    }
  }
  // Ink: average color of what is left. Grey/white/black marks are recolored per theme (one-color logos).
  let n = 0, s = 0, l = 0;
  for (let i = 0; i < px.length; i += 4) if (px[i + 3] > 128) { n++; s += sat(px[i], px[i + 1], px[i + 2]); l += lum(px[i], px[i + 1], px[i + 2]); }
  if (!n) return null;
  const mono = s / n < 0.12;
  // A solid tile (most of its box filled), like a colored square or a black plate with the name knocked out in white.
  const on = (x: number, y: number) => px[(y * W + x) * 4 + 3] > 128;
  const bb = bbox(px, W, H);
  let fill = 0;
  if (bb) for (let y = bb[1]; y <= bb[3]; y++) for (let x = bb[0]; x <= bb[2]; x++) if (on(x, y)) fill++;
  const tile = !!bb && fill / ((bb[2] - bb[0] + 1) * (bb[3] - bb[1] + 1)) > 0.6;
  // A white mark that reaches the tile's edge (Decathlon's swoosh, Uniqlo's letters, Nike's swoosh on black): the peel
  // runs into it and leaves holes, black on a dark page. Put back what it removed inside the logo, as in the source:
  // pixels with logo on all four sides (left, right, above, below), or on two opposite sides for a solid tile.
  if (!mono || tile) {
    const L = new Int32Array(H).fill(W), R = new Int32Array(H).fill(-1), T = new Int32Array(W).fill(H), B = new Int32Array(W).fill(-1);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (on(x, y)) { L[y] = Math.min(L[y], x); R[y] = x; T[x] = Math.min(T[x], y); B[x] = Math.max(B[x], y); }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4, row = x > L[y] && x < R[y], col = y > T[x] && y < B[x];
      if (px[i + 3] < 250 && src[i + 3] > 200 && (tile ? row || col : row && col)) px.set(src.subarray(i, i + 4), i);
    }
    // A one-color plate goes (see below): its soft outer rim would be left as a thin frame.
    if (mono && bb) for (let y = bb[1]; y <= bb[3]; y++) for (let x = bb[0]; x <= bb[2]; x++)
      if (Math.min(x - bb[0], bb[2] - x, y - bb[1], bb[3] - y) < 3) px[(y * W + x) * 4 + 3] = 0;
  }
  const variant = (dark: boolean) => {
    const out = Buffer.from(px);
    for (let i = 0; i < out.length; i += 4) {
      if (!out[i + 3]) continue;
      const L = lum(out[i], out[i + 1], out[i + 2]);
      if (mono) {
        // one-color logo: ink = theme text color, inner details (white on black) stay as holes; for a white mark, its
        // dark parts are the details. A one-color plate (Aesop's black band): the plate is the
        // background and the letters knocked out of it are the mark, so the plate goes and the letters take the ink.
        const ink = (l / n > 128) !== tile ? 255 - L : L;
        const a = 1 - ink / 255;
        out[i + 3] = Math.round(out[i + 3] * Math.min(1, Math.max(0, (a - 0.08) / 0.84)));
        out.fill(dark ? 245 : 29, i, i + 3);
      } else if (dark && Math.max(out[i], out[i + 1], out[i + 2]) < 110) {
        // dark parts of a colored logo would vanish on black: same hue, lighter
        const f = (200 - L) / Math.max(1, L + 1);
        for (let c = 0; c < 3; c++) out[i + c] = Math.min(255, Math.round(out[i + c] + (255 - out[i + c]) * Math.min(0.75, f / 8)));
      }
    }
    return out;
  };
  const fit = async (raw: Buffer) => {
    const t = await sharp(raw, { raw: { width: W, height: H, channels: 4 } }).trim({ threshold: 1 }).png().toBuffer().catch(() => null);
    if (!t) return null;
    const inner = Math.round(SIZE * 0.9), pad = (SIZE - inner) / 2, clear = { r: 0, g: 0, b: 0, alpha: 0 };
    return sharp(t).resize(inner, inner, { fit: "contain", background: clear })
      .extend({ top: Math.floor(pad), bottom: Math.ceil(pad), left: Math.floor(pad), right: Math.ceil(pad), background: clear })
      .png({ palette: true, quality: 90, effort: 10 }).toBuffer();
  };
  const [light, dark] = await Promise.all([fit(variant(false)), fit(variant(true))]);
  return light && dark ? { light, dark } : null;
}

export async function findLogo(domain: string, url: string): Promise<{ png: Buffer; source: string; from: string } | null> {
  const page = await get(url).catch(() => null);
  const html = page?.ok ? (await page.text()).slice(0, 1_500_000) : "";
  const cands = html ? await declaredLogos(html, page!.url || url) : [];
  for (const c of cands.slice(0, 8)) {
    const png = await vetImage(c.url, c.minPx);
    if (png) return { png, source: c.source, from: c.url };
  }
  // The home page may be behind an anti-bot wall: the root favicon is often still served.
  const root = await vetImage(new URL("/favicon.ico", url).href, 48);
  if (root) return { png: root, source: "favicon", from: "/favicon.ico" };
  for (const svc of SERVICES) {
    const [source, from] = svc(domain);
    const png = await vetImage(from, 48);
    if (png) return { png, source, from };
  }
  // Last resort before the initial: a 32 px favicon (soft on retina, but the right brand). The ones the page declares,
  // then the root one and the services: when the home page is behind an anti-bot wall (H&M, many Shopify stores
  // answering 429), they are the only source left.
  const small: [string, string][] = [
    ...cands.filter((c) => c.source === "favicon").map((c): [string, string] => ["favicon-32", c.url]),
    ["favicon-32", new URL("/favicon.ico", url).href],
    ...SERVICES.map((svc) => { const [source, from] = svc(domain); return [`${source}-32`, from] as [string, string]; }),
  ];
  for (const [source, from] of small) {
    const png = await vetImage(from, 32);
    if (png) return { png, source, from };
  }
  return null;
}

// A site where nothing was found (anti-bot wall, timeout, site down that day) is tried again after this delay,
// so a passing failure does not leave a brand on its initial forever.
const RETRY_MS = 3 * 24 * 3600 * 1000;

// Finds, stores and caches a site's logo. Safe to call again: `force` retries a site already checked.
export async function refreshLogo(domain: string, force = false) {
  const { data: site } = await db.from("sites").select("domain, url, logo_url, logo_checked_at").eq("domain", domain).maybeSingle();
  const fresh = site?.logo_checked_at && (site.logo_url || Date.now() - new Date(site.logo_checked_at).getTime() < RETRY_MS);
  if (!site || (fresh && !force)) return site?.logo_url ?? null;
  const found = await findLogo(site.domain, site.url).catch(() => null);
  let logo_url: string | null = null;
  const cut = found ? await cutout(found.png).catch(() => null) : null;
  if (cut) {
    const up = (path: string, png: Buffer) => db.storage.from("logos").upload(path, png, { contentType: "image/png", upsert: true, cacheControl: "86400" });
    const [a, b] = await Promise.all([up(`${domain}.png`, cut.light), up(`${domain}.dark.png`, cut.dark)]);
    if (!a.error && !b.error) logo_url = `${db.storage.from("logos").getPublicUrl(`${domain}.png`).data.publicUrl}?v=${Date.now().toString(36)}`;
  }
  await db.from("sites").update({ logo_url, logo_source: found?.source ?? "initial", logo_checked_at: new Date().toISOString() }).eq("domain", domain);
  return logo_url;
}
