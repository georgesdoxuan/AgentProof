import { EXCLUDED, blockerNames, db } from "@/lib/engine";
import { getLang } from "@/lib/lang";

// The report as data, for a spreadsheet or the merchant's own tools: /audit/<id>/export?format=csv (or json).
// Same visibility as the report page: anyone with the link; real payment tests are never exported (card, private).
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response("Not found", { status: 404 });
  const { data: audit } = await db
    .from("audits")
    .select("id, kind, device, model, status, created_at, finished_at, sites(domain, url), runs(id, status, success, blocker_type, blocker_detail, final_url, steps, duration_s, cost_usd, attempts, first_attempt, screenshot_url, missions(title, position))")
    .eq("id", id)
    .maybeSingle();
  if (!audit || audit.kind === "payment") return new Response("Not found", { status: 404 });
  const lang = await getLang();
  const origin = new URL(req.url).origin;
  const runs = ((audit.runs ?? []) as any[]).sort((a, b) => (a.missions?.position ?? 0) - (b.missions?.position ?? 0) || a.id - b.id);
  const verdict = (r: any) =>
    r.status !== "done" && r.status !== "error" ? "pending" : r.status === "error" || r.success === null ? "unverified" : r.success ? "passed" : EXCLUDED.includes(r.blocker_type) ? "out_of_score" : "blocked";
  const rows = runs.map((r) => ({
    mission: r.missions?.title ?? "",
    verdict: verdict(r),
    second_try: r.status === "done" && r.success === true && !!r.first_attempt,
    blocker: r.blocker_type ?? "",
    blocker_label: r.blocker_type ? (blockerNames(lang)[r.blocker_type] ?? r.blocker_type) : "",
    detail: r.blocker_detail ?? "",
    final_url: r.final_url ?? "",
    steps: r.steps ?? null,
    duration_s: r.duration_s != null ? Math.round(r.duration_s) : null,
    cost_usd: r.cost_usd != null ? Number(Number(r.cost_usd).toFixed(4)) : null,
    screenshot: r.screenshot_url ?? "",
    replay: `${origin}/replay/${r.id}?a=${audit.id}`,
  }));
  const site = audit.sites as any;
  const name = `agentproof-${site?.domain ?? "audit"}-${String(audit.created_at).slice(0, 10)}`;

  if (new URL(req.url).searchParams.get("format") === "json") {
    const body = { audit: { id: audit.id, site: site?.domain, url: site?.url, device: audit.device, model: audit.model, status: audit.status, created_at: audit.created_at, finished_at: audit.finished_at, report: `${origin}/audit/${audit.id}` }, missions: rows };
    return new Response(JSON.stringify(body, null, 2), { headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="${name}.json"` } });
  }
  // CSV: semicolons and a BOM, so Excel in French opens it in columns with the accents intact.
  const cols = Object.keys(rows[0] ?? { mission: "" }) as (keyof (typeof rows)[number])[];
  const cell = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = "﻿" + [cols.join(";"), ...rows.map((r) => cols.map((c) => cell(r[c])).join(";"))].join("\r\n");
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}.csv"` } });
}
