// Fetches (again) the logo of every site. Run from web/:
// JITI_ALIAS='{"server-only":"<web>/node_modules/server-only/empty.js","@/":"<web>/"}' node --env-file=.env.local node_modules/.bin/jiti ../scripts/backfill-logos.ts [domain...]
import { db } from "@/lib/engine";
import { refreshLogo } from "@/lib/logo";

const only = process.argv.slice(2);
const { data } = await db.from("sites").select("domain, logo_source").order("domain");
for (const s of data ?? []) {
  if (only.length ? !only.includes(s.domain) : s.logo_source === "manual") continue;
  const url = await refreshLogo(s.domain, true);
  const { data: row } = await db.from("sites").select("logo_source").eq("domain", s.domain).single();
  console.log(s.domain.padEnd(22), row?.logo_source, url ?? "");
}
