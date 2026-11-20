import Link from "next/link";
import { EXCLUDED, db } from "@/lib/engine";
import { BlockerIcon, Chip, DeviceTag, Icon, MissionBar, StatusGlyph, ToneLabel, blockerLabel, hurdles, scoreTone } from "@/lib/ui";
import { tr } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import { SiteLogo } from "../site-logo";

const COLS = "md:grid-cols-[1.75rem_minmax(0,1.5fr)_10.5rem_minmax(0,1.2fr)_minmax(0,1.3fr)_4.5rem]";

type ScoreRow = { score: number | null; runs_scored: number | null; name: string | null };
// One order everywhere (home top 5, /classement, team space): score, then more missions counted, then name. Ties no longer depend on the database.
export const byRank = (a: ScoreRow, b: ScoreRow) =>
  (b.score ?? -1) - (a.score ?? -1) || (b.runs_scored ?? 0) - (a.runs_scored ?? 0) || (a.name ?? "").localeCompare(b.name ?? "", "fr");

export type Device = "desktop" | "mobile";
export const isDevice = (v: unknown): v is Device => v === "desktop" || v === "mobile";

// The public leaderboard, shared by /classement and the team space. One device at a time, so a site never appears twice.
export async function Leaderboard({ device = "desktop", base }: { device?: Device; base: string }) {
  const lang = await getLang();
  const t = tr(lang);
  const { data: rows } = await db.from("site_scores").select("*").eq("device", device);
  const scores = (rows ?? []).sort(byRank);
  const auditIds = (scores ?? []).map((s) => s.audit_id);
  // Main blocker and main hurdle per audit: both reads go out together.
  const [{ data: fails }, { data: wins }] = await Promise.all([
    db.from("runs").select("audit_id, blocker_type").in("audit_id", auditIds).eq("success", false),
    db.from("runs").select("audit_id, success, steps, agent_answer").in("audit_id", auditIds).eq("success", true),
  ]);
  const topBlocker = (id: string) => {
    const c: Record<string, number> = {};
    for (const f of fails ?? []) if (f.audit_id === id && f.blocker_type && !EXCLUDED.includes(f.blocker_type)) c[f.blocker_type] = (c[f.blocker_type] ?? 0) + 1;
    return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  };
  // No blocker does not mean no friction: the main obstacle the agent got past on that audit.
  const topHurdle = (id: string) => hurdles((wins ?? []).filter((w) => w.audit_id === id), lang).items[0]?.[0] ?? null;

  // Reference period: when the audits behind the scores ended (view: the 2 latest public audits per site and device).
  const day = (d: string) => new Date(d).toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });
  const ends = (scores ?? []).map((s) => s.finished_at).filter(Boolean).sort();
  const [first, last] = [ends[0], ends.at(-1)];
  const period = !first || !last ? null : day(first) === day(last) ? t(`le ${day(first)}`, `on ${day(first)}`) : t(`entre le ${day(first)} et le ${day(last)}`, `between ${day(first)} and ${day(last)}`);

  return (
    <>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <nav aria-label={t("Appareil", "Device")} className="inline-grid grid-cols-2 rounded-[10px] bg-fill p-[3px]">
          {(["desktop", "mobile"] as const).map((d) => (
            <Link
              key={d}
              href={d === "desktop" ? base : `${base}?appareil=mobile`}
              aria-current={d === device ? "page" : undefined}
              className={`type-small flex h-9 min-w-[120px] items-center justify-center rounded-[8px] px-4 font-semibold transition-colors duration-200 ${d === device ? "bg-tile text-ink shadow-[0_1px_3px_rgb(0_0_0/0.12)] dark:bg-[#636366]" : "text-ink-2 hover:text-ink"}`}
            >
              {d === "desktop" ? t("Ordinateur", "Desktop") : "Mobile"}
            </Link>
          ))}
        </nav>
        {period && <Chip icon="clock">{t("Audits terminés", "Audits finished")} {period}</Chip>}
        </div>
        {scores?.length ? (
          <div className={`mt-6 overflow-hidden rounded-[18px] bg-tile`}>
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
                      className={`grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-6 py-5 max-[400px]:grid-cols-[minmax(0,1fr)_auto] max-[400px]:gap-x-3 max-[400px]:px-4 transition-colors duration-200 hover:bg-bg-2/60 max-[734px]:px-5 ${COLS}`}
                    >
                      <span className="text-ink-2 tnum max-[400px]:hidden">{i + 1}</span>
                      <span className="flex min-w-0 items-center gap-3">
                        <SiteLogo domain={s.domain} name={s.name} />
                        <span className="min-w-0">
                          <span className="type-headline block truncate">
                            <span className="min-[401px]:hidden tnum text-ink-2">{i + 1}. </span>
                            {s.name}
                          </span>
                          <span className="type-small text-ink-2">
                            <span className="max-[400px]:hidden"><DeviceTag device={s.device} lang={lang} /> · </span>
                            {s.passes} audit{s.passes > 1 ? "s" : ""}, {s.runs_done} missions
                          </span>
                        </span>
                      </span>
                      <span className="flex items-center justify-end gap-2 text-[21px] font-semibold tracking-[0.011em] tnum md:order-last">
                        <StatusGlyph tone={scoreTone(s.score)} className="h-4 w-4 md:hidden" />
                        {s.score ?? "—"}
                        <span className="-ml-1 text-[17px] font-normal text-ink-2">%</span>
                      </span>
                      <span className="col-span-3 col-start-2 flex items-center gap-3 max-[400px]:col-span-2 max-[400px]:col-start-1 md:col-span-1 md:col-start-auto">
                        <span className="w-24 shrink-0">
                          <MissionBar ok={s.runs_success ?? 0} done={s.runs_scored ?? 0} total={s.runs_scored ?? 0} size="sm" />
                        </span>
                        <span className="type-small whitespace-nowrap text-ink-2 tnum">
                          {s.runs_success} {t("sur", "of")} {s.runs_scored}
                        </span>
                      </span>
                      <span className="type-small col-span-3 col-start-2 hidden md:col-span-1 md:col-start-auto md:block">
                        {botOnly ? (
                          <span className="inline-flex items-center gap-1.5 font-semibold text-ink-2">
                            <StatusGlyph tone="none" />
                            {t("Anti-bot : hors classement", "Anti-bot: not ranked")}
                          </span>
                        ) : s.score == null ? (
                          // Nothing counted (agent errors, anti-bot, stock...): no verdict on the site until a new audit.
                          <span className="inline-flex items-center gap-1.5 font-semibold text-ink-2">
                            <StatusGlyph tone="unsure" />
                            {t("À confirmer", "To be confirmed")}
                          </span>
                        ) : (
                          <ToneLabel score={s.score} />
                        )}
                      </span>
                      <span className="type-small col-span-3 col-start-2 text-ink-2 max-[400px]:col-span-2 max-[400px]:col-start-1 md:col-span-1 md:col-start-auto">
                        <span className="md:hidden">{t("Blocage principal", "Main blocker")} : </span>
                        {blocker ? (
                          <span className="inline-flex items-center gap-1.5 align-middle text-ink">
                            <BlockerIcon type={blocker} className="h-[18px] w-[18px]" />
                            {blockerLabel(blocker, lang)}
                          </span>
                        ) : s.runs_bot_blocked > 0 ? (
                          // Kiabi read "None · anti-bot": with no counted blocker, the anti-bot is the main one (out of score).
                          t("Anti-bot (hors score)", "Anti-bot (outside the score)")
                        ) : t("Aucun", "None")}
                        {!blocker && !s.runs_bot_blocked && topHurdle(s.audit_id) && ` · ${t("contourné", "got past")} : ${topHurdle(s.audit_id)!.toLowerCase()}`}
                        {blocker && s.runs_bot_blocked > 0 && !botOnly && " · anti-bot"}
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

        <dl className="type-small mt-12 grid gap-4 text-ink-2 sm:grid-cols-3">
          {(
            [
              ["none", t("Succès", "Success"), t("Première page du checkout atteinte. Rien saisi, rien payé.", "First checkout page reached. Nothing entered, nothing paid.")],
              ["ranking", "Score", t("Réussies ÷ comptées. Stock, anti-bot, mission impossible et erreurs de l’agent hors score.", "Passed ÷ counted. Stock, anti-bot, impossible mission and agent errors out of score.")],
              ["eye", t("Juge visuel", "Visual judge"), t("Un modèle Hugging Face relit la capture finale de chaque mission.", "A Hugging Face model reviews each mission's final screenshot.")],
            ] as const
          ).map(([icon, title, text]) => (
            <div key={icon} className="flex gap-3 rounded-[14px] bg-tile p-5">
              <Icon name={icon} className="mt-[1px] h-5 w-5 text-ink-2" />
              <div>
                <dt className="font-semibold text-ink">{title}</dt>
                <dd className="mt-1">{text}</dd>
              </div>
            </div>
          ))}
        </dl>
    </>
  );
}
