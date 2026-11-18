import Link from "next/link";
import { EXCLUDED, db } from "@/lib/engine";
import { MissionBar, StatusGlyph, ToneLabel, blockerLabel, scoreTone } from "@/lib/ui";
import { tr } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

const COLS = "md:grid-cols-[1.75rem_minmax(0,1.5fr)_10.5rem_minmax(0,1.2fr)_minmax(0,1.3fr)_4.5rem]";

// The public leaderboard, shared by /classement and the team space.
export async function Leaderboard() {
  const lang = await getLang();
  const t = tr(lang);
  const { data: scores } = await db.from("site_scores").select("*").order("score", { ascending: false, nullsFirst: false });
  const auditIds = (scores ?? []).map((s) => s.audit_id);
  const { data: fails } = await db.from("runs").select("audit_id, blocker_type").in("audit_id", auditIds).eq("success", false);
  const topBlocker = (id: string) => {
    const c: Record<string, number> = {};
    for (const f of fails ?? []) if (f.audit_id === id && f.blocker_type && !EXCLUDED.includes(f.blocker_type)) c[f.blocker_type] = (c[f.blocker_type] ?? 0) + 1;
    return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  };

  return (
    <>
        {scores?.length ? (
          <div className="mt-12 overflow-hidden rounded-[18px] bg-tile">
            <div className={`type-caption hidden gap-4 border-b border-hairline px-6 py-3 text-ink-2 md:grid ${COLS}`} aria-hidden>
              <span>{t("Rang", "Rank")}</span>
              <span>Site</span>
              <span>Missions</span>
              <span>Verdict</span>
              <span>{t("Blocage principal", "Main blocker")}</span>
              <span className="text-right">Score</span>
            </div>
            <ol>
              {scores.map((s, i) => {
                const blocker = topBlocker(s.audit_id);
                const botOnly = s.score == null && s.runs_bot_blocked > 0 && s.runs_bot_blocked === s.runs_done;
                return (
                  <li key={s.audit_id} className="border-b border-hairline last:border-0">
                    <Link
                      href={`/audit/${s.audit_id}`}
                      className={`grid grid-cols-[1.75rem_1fr_auto] items-center gap-x-4 gap-y-2 px-6 py-5 transition-colors duration-200 hover:bg-bg-2/60 max-[734px]:px-5 ${COLS}`}
                    >
                      <span className="text-ink-2 tnum">{i + 1}</span>
                      <span className="min-w-0">
                        <span className="type-headline block truncate">{s.name}</span>
                        <span className="type-small text-ink-2">{s.device === "mobile" ? "Mobile" : t("Ordinateur", "Desktop")}</span>
                      </span>
                      <span className="flex items-center justify-end gap-2 text-[21px] font-semibold tracking-[0.011em] tnum md:order-last">
                        <StatusGlyph tone={scoreTone(s.score)} className="h-4 w-4 md:hidden" />
                        {s.score ?? "—"}
                        <span className="-ml-1 text-[17px] font-normal text-ink-2">%</span>
                      </span>
                      <span className="col-span-3 col-start-2 flex items-center gap-3 md:col-span-1 md:col-start-auto">
                        <span className="w-24 shrink-0">
                          <MissionBar ok={s.runs_success ?? 0} done={s.runs_scored ?? 0} total={s.runs_scored ?? 0} size="sm" />
                        </span>
                        <span className="type-small whitespace-nowrap text-ink-2 tnum">
                          {s.runs_success} {t("sur", "of")} {s.runs_scored}
                        </span>
                      </span>
                      <span className="type-small col-span-3 col-start-2 hidden md:col-span-1 md:col-start-auto md:block">
                        {botOnly ? (
                          <span className="font-semibold text-ink-2">{t("Anti-bot : hors classement", "Anti-bot: not ranked")}</span>
                        ) : s.score == null ? (
                          // Nothing counted (agent errors, anti-bot, stock...): no verdict on the site until a new audit.
                          <span className="font-semibold text-ink-2">{t("À confirmer", "To be confirmed")}</span>
                        ) : (
                          <ToneLabel score={s.score} />
                        )}
                      </span>
                      <span className="type-small col-span-3 col-start-2 text-ink-2 md:col-span-1 md:col-start-auto">
                        <span className="md:hidden">{t("Blocage principal", "Main blocker")} : </span>
                        {blocker ? <span className="text-ink">{blockerLabel(blocker, lang)}</span> : t("Aucun", "None")}
                        {s.runs_bot_blocked > 0 && !botOnly && " · anti-bot"}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </div>
        ) : (
          <div className="mt-12 rounded-[18px] bg-tile p-12 text-center">
            <p className="type-headline">{t("Aucun audit terminé pour l’instant.", "No finished audit yet.")}</p>
            <Link href="/#tester" className="more mt-1">
              {t("Teste ton site pour apparaître ici", "Test your site to appear here")}
            </Link>
          </div>
        )}

        <dl className="type-small mt-12 grid gap-6 border-t border-line pt-8 text-ink-2 sm:grid-cols-3">
          <div>
            <dt className="font-semibold text-ink">{t("Succès", "Success")}</dt>
            <dd className="mt-1">{t("L’agent atteint la première page du checkout. Il ne saisit rien et ne paie jamais.", "The agent reaches the first checkout page. It enters nothing and never pays.")}</dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">Score</dt>
            <dd className="mt-1">{t("Missions réussies divisées par missions comptées. Restent hors score : rupture de stock, anti-bot, mission impossible sur le catalogue, et les échecs dus à l'agent (étapes épuisées, erreur d'outil).", "Passed missions divided by counted missions. Kept out of the score: out of stock, anti-bot, mission impossible on the catalogue, and failures caused by the agent (out of steps, tool error).")}</dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">{t("Juge visuel", "Visual judge")}</dt>
            <dd className="mt-1">{t("Un modèle Hugging Face relit la capture finale de chaque mission pour confirmer le verdict.", "A Hugging Face model reviews the final screenshot of each mission to confirm the verdict.")}</dd>
          </div>
        </dl>
    </>
  );
}
