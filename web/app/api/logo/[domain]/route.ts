import { refreshLogo } from "@/lib/logo";

// GET /api/logo/<domain>: redirects to the cached logo, or 404 (the UI then draws the initial).
// Only domains already in `sites` are fetched, so this is not an open image proxy.
export async function GET(_: Request, { params }: { params: Promise<{ domain: string }> }) {
  const domain = decodeURIComponent((await params).domain).toLowerCase();
  const url = /^[a-z0-9.-]+$/.test(domain) ? await refreshLogo(domain).catch(() => null) : null;
  if (!url) return new Response(null, { status: 404, headers: { "cache-control": "public, max-age=3600" } });
  return new Response(null, { status: 307, headers: { location: url, "cache-control": "public, max-age=86400, s-maxage=86400" } });
}
