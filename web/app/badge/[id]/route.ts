import { db, scoreOf } from "@/lib/engine";

// "Agent-ready" badge for one finished audit: /badge/<audit id>.svg, to embed on the merchant's site.
// By audit id, not by domain: a team's audits stay private unless the team shares the report link.
const COLORS = { pass: "#00792e", warn: "#b25000", fail: "#d70015", none: "#6e6e73" };

function badgeSvg(score: number | null) {
  const tone = score == null ? "none" : score >= 70 ? "pass" : score >= 40 ? "warn" : "fail";
  const right = score == null ? "en cours" : `${{ pass: "agent-ready", warn: "fragile", fail: "bloquant", none: "" }[tone]} ${score} %`;
  const lw = 78; // "AgentProof"
  const rw = 14 + right.length * 6.6;
  const w = Math.round(lw + rw);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="28" role="img" aria-label="AgentProof : ${right}">
<title>AgentProof : ${right}</title>
<clipPath id="r"><rect width="${w}" height="28" rx="6"/></clipPath>
<g clip-path="url(#r)"><rect width="${lw}" height="28" fill="#1d1d1f"/><rect x="${lw}" width="${rw}" height="28" fill="${COLORS[tone]}"/></g>
<g fill="#fff" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif" font-size="12" font-weight="600">
<text x="${lw / 2}" y="18" text-anchor="middle">AgentProof</text><text x="${lw + rw / 2}" y="18" text-anchor="middle">${right}</text></g>
</svg>`;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id.replace(/\.svg$/, "");
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response("Not found", { status: 404 });
  const { data: a } = await db.from("audits").select("status, kind, runs(status, success, blocker_type)").eq("id", id).maybeSingle();
  if (!a || a.kind !== "checkout") return new Response("Not found", { status: 404 });
  return new Response(badgeSvg(a.status === "done" ? scoreOf(a.runs) : null), {
    headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "public, max-age=3600, s-maxage=3600" },
  });
}
