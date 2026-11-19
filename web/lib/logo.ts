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
      .png()
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
  // Last resort before the initial: the site's own 32 px favicon (soft on retina, but the right brand).
  for (const c of cands.filter((c) => c.source === "favicon")) {
    const png = await vetImage(c.url, 32);
    if (png) return { png, source: "favicon-32", from: c.url };
  }
  return null;
}

// Finds, stores and caches a site's logo. Safe to call again: `force` retries a site already checked.
export async function refreshLogo(domain: string, force = false) {
  const { data: site } = await db.from("sites").select("domain, url, logo_url, logo_checked_at").eq("domain", domain).maybeSingle();
  if (!site || (site.logo_checked_at && !force)) return site?.logo_url ?? null;
  const found = await findLogo(site.domain, site.url).catch(() => null);
  let logo_url: string | null = null;
  if (found) {
    const path = `${domain}.png`;
    const { error } = await db.storage.from("logos").upload(path, found.png, { contentType: "image/png", upsert: true, cacheControl: "86400" });
    if (!error) logo_url = `${db.storage.from("logos").getPublicUrl(path).data.publicUrl}?v=${Date.now().toString(36)}`;
  }
  await db.from("sites").update({ logo_url, logo_source: found?.source ?? "initial", logo_checked_at: new Date().toISOString() }).eq("domain", domain);
  return logo_url;
}
