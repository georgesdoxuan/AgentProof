import { refreshLogo } from "@/lib/logo";

// GET /api/logo/<domain>: the cached logo itself (no redirect), or 404 (the UI then draws the initial).
// Only domains already in `sites` are fetched, so this is not an open image proxy.
// Served from Vercel's CDN after the first hit: one request, a few KB, from the edge.
const CACHE = "public, max-age=86400, s-maxage=31536000, stale-while-revalidate=604800";

export async function GET(_: Request, { params }: { params: Promise<{ domain: string }> }) {
  const domain = decodeURIComponent((await params).domain).toLowerCase();
  const url = /^[a-z0-9.-]+$/.test(domain) ? await refreshLogo(domain).catch(() => null) : null;
  const img = url ? await fetch(url).catch(() => null) : null;
  if (!img?.ok) return new Response(null, { status: 404, headers: { "cache-control": "public, max-age=3600, s-maxage=86400" } });
  return new Response(img.body, { headers: { "content-type": "image/png", "cache-control": CACHE } });
}
