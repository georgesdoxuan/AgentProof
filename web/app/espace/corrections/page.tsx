import Link from "next/link";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { canLaunch, teamContext } from "@/lib/auth";
import { loadCorrections, type Correction } from "@/lib/corrections";
import { tr, type T } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import { deviceLabel, shortDate } from "@/lib/space";
import { BlockerIcon, BrowserFrame, Chevron, Chip, Chips, DeviceTag, Empty, Icon } from "@/lib/ui";
import { CopyButton } from "../controls";
import { SpaceShell } from "../shell";
import { sitePath } from "../parts";
import { SiteLogo } from "../../site-logo";
import { CorrectionsBoard } from "./board";
import { CORRECTIONS_COOKIE, DEFAULT_FILTERS, type Filters, type Labels, type Meta } from "./filters";

export async function generateMetadata() {
  const t = tr(await getLang());
  return { title: `${t("Corrections", "Fixes")} · AgentProof` };
}

const fold = (x: string) => x.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Status pill: the same words and colours as the site checklist (parts.tsx), plus « À faire » and « Corrigée ».
// Light text darkened for 4.5:1 on the tinted pill; dark tokens already pass.
const STATUS: Record<Correction["status"], [string, string, string]> = {
  todo: ["À faire", "To do", "bg-fill text-ink-2"],
  back: ["Toujours présent", "Still there", "bg-warn/15 text-[#9c4600] dark:text-warn"],
  check: ["Corrigé · à vérifier", "Fixed · to check", "bg-blue/12 text-link"],
  done: ["Corrigée", "Fixed", "bg-pass/12 text-pass"],
};
const IMPACT: Record<Correction["impact"], [string, string, string]> = {
  3: ["Impact fort", "High impact", "text-fail"],
  2: ["Impact moyen", "Medium impact", "text-warn"],
  1: ["Impact faible", "Low impact", "text-ink-2"],
  0: ["Hors score", "Out of score", "text-ink-2"],
};
const KIND_ICON = { journey: "cart", payment: "payment" } as const;

// Espace › Corrections: every fix the audits ask for, on every site, in one filterable list. Each row opens on the proof
// (capture, the agent's words, the missions it stopped), the suggested fix and what to do next.
export default async function Corrections() {
  const ctx = await teamContext();
  if (!ctx) redirect("/connexion?next=/espace/corrections");
  if (!ctx.team) redirect("/espace");
  const { team } = ctx;
  const lang = await getLang();
  const t = tr(lang);
  const [{ items }, jar, h] = await Promise.all([loadCorrections(team.id, lang), cookies(), headers()]);
  const base = process.env.PUBLIC_URL || `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const edit = canLaunch(team.role);

  let saved: Partial<Filters> = {};
  try {
    saved = JSON.parse(decodeURIComponent(jar.get(CORRECTIONS_COOKIE)?.value ?? "{}"));
  } catch {}
  const initial: Filters = { ...DEFAULT_FILTERS, ...saved };
  // A saved site that has left the space (trash, new team): back to every site.
  if (!items.some((m) => m.site.key === initial.site)) initial.site = "all";

  const open = items.filter((m) => m.status === "todo" || m.status === "back");
  const lost = open.filter((m) => m.kind === "journey" && m.impact > 0).reduce((n, m) => n + m.missions, 0);
  const sitesHit = new Set(open.map((m) => m.site.key)).size;
  const check = items.filter((m) => m.status === "check").length;
  const plural = (n: number, fr: string, en: string) => `${n} ${t(fr, en)}${n > 1 ? "s" : ""}`;

  const intro = items.length ? (
    <Chips>
      <Chip icon="wrench" tone={open.length ? "warn" : "pass"}>
        {!open.length ? t("Rien à corriger", "Nothing to fix") : open.length > 1 ? t(`${open.length} corrections à faire`, `${open.length} fixes to do`) : t("1 correction à faire", "1 fix to do")}
      </Chip>
      {sitesHit > 0 && <Chip icon="layers">{plural(sitesHit, "site", "site")}</Chip>}
      {lost > 0 && <Chip icon="trend">{plural(lost, "mission", "mission")} {t(lost > 1 ? "perdues" : "perdue", "lost")}</Chip>}
      {check > 0 && <Chip icon="shield">{check} {t("à vérifier", "to check")}</Chip>}
    </Chips>
  ) : undefined;

  const L: Labels = {
    status: { open: t("À faire", "To do"), check: t("À vérifier", "To check"), done: t("Corrigées", "Fixed"), all: t("Toutes", "All") },
    statusLabel: t("Statut des corrections", "Fix status"),
    site: "Site",
    allSites: t("Tous les sites", "All sites"),
    kind: t("Type d'audit", "Audit type"),
    allKinds: t("Tous les types", "All types"),
    kinds: { journey: t("Parcours", "Journey"), payment: t("Paiement", "Payment") },
    impact: "Impact",
    allImpacts: t("Tous les impacts", "Any impact"),
    impacts: { 3: t(IMPACT[3][0], IMPACT[3][1]), 2: t(IMPACT[2][0], IMPACT[2][1]), 1: t(IMPACT[1][0], IMPACT[1][1]), 0: t(IMPACT[0][0], IMPACT[0][1]) },
    device: t("Appareil", "Device"),
    allDevices: t("Tous les appareils", "All devices"),
    devices: { desktop: deviceLabel("desktop", lang), mobile: deviceLabel("mobile", lang) },
    period: t("Période", "Period"),
    periods: { all: t("Depuis le début", "All time"), "30d": t("30 derniers jours", "Last 30 days"), "7d": t("7 derniers jours", "Last 7 days") },
    sort: t("Trier", "Sort"),
    sorts: { impact: t("Par impact", "By impact"), date: t("Plus récentes", "Newest"), site: t("Par site", "By site") },
    group: t("Grouper par site", "Group by site"),
    search: t("Rechercher", "Search"),
    reset: t("Effacer les filtres", "Clear filters"),
    export: t("Exporter", "Export"),
    exportDone: t("Exporté", "Exported"),
    emptyTitle: t("Aucune correction pour ces filtres", "No fix matches these filters"),
    csvHead: [
      "Site",
      t("Appareil", "Device"),
      t("Type d'audit", "Audit type"),
      t("Problème", "Problem"),
      "Impact",
      t("Missions perdues", "Missions lost"),
      t("Statut", "Status"),
      t("Date de l'audit", "Audit date"),
      t("Correction proposée", "Suggested fix"),
      t("Constat de l'agent", "Agent's finding"),
      t("Rapport", "Report"),
      "Replay",
    ],
    countOne: t("{n} correction", "{n} fix"),
    countMany: t("{n} corrections", "{n} fixes"),
    filtersLabel: t("Filtrer les corrections", "Filter the fixes"),
  };

  const metas: Meta[] = items.map((m) => {
    const report = `${base}/audit/${m.auditId}${m.kind === "journey" ? `#blocage-${m.type}` : ""}`;
    const replay = m.run ? `${base}/replay/${m.run.id}?a=${m.replayAudit}` : "";
    return {
      id: m.id,
      kind: m.kind,
      site: m.site.key,
      siteLabel: m.site.label,
      device: m.site.device,
      label: m.label,
      impact: m.impact,
      missions: m.missions,
      status: m.status,
      at: m.at,
      text: fold(`${m.label} ${m.site.label} ${m.site.domain} ${m.hint} ${m.run?.detail ?? ""} ${m.hits.map((x) => x.title).join(" ")} ${L.kinds[m.kind]}`),
      csv: [
        m.site.label,
        deviceLabel(m.site.device, lang),
        L.kinds[m.kind],
        m.label,
        t(IMPACT[m.impact][0], IMPACT[m.impact][1]),
        m.kind === "journey" ? String(m.missions) : "",
        t(STATUS[m.status][0], STATUS[m.status][1]),
        new Date(m.at).toISOString().slice(0, 10),
        m.hint,
        m.run?.detail ?? "",
        report,
        replay,
      ],
    };
  });

  const rows = Object.fromEntries(items.map((m) => [m.id, <Item key={m.id} m={m} t={t} lang={lang} edit={edit} base={base} />]));
  const heads = Object.fromEntries(
    [...new Map(items.map((m) => [m.site.key, m.site])).values()].map((s) => [
      s.key,
      <Link key={s.key} href={sitePath(s)} className="flex min-w-0 items-center gap-3 hover:underline">
        <SiteLogo domain={s.domain} name={s.domain} size="sm" />
        <span className="type-headline truncate">{s.label}</span>
        <span className="type-small text-ink-2">
          <DeviceTag device={s.device} lang={lang} />
        </span>
      </Link>,
    ]),
  );
  const today = new Date();
  const stamp = today.toISOString().slice(0, 10);

  return (
    <SpaceShell
      title={t("Corrections", "Fixes")}
      bare
      intro={intro}
      actions={
        edit && items.length > 0 ? (
          <Link href="/espace/nouveau" className="btn min-h-[40px] px-[18px] text-[15px]">
            {t("Lancer un audit", "Run an audit")}
          </Link>
        ) : undefined
      }
    >
      {items.length ? (
        <CorrectionsBoard items={metas} rows={rows} heads={heads} initial={initial} L={L} now={today.getTime()} file={`agentproof-corrections-${stamp}.csv`} />
      ) : (
        <Empty icon="wrench" title={t("Aucune correction pour l’instant", "No fixes yet")}>
          {edit && (
            <Link href="/espace/nouveau" className="text-link hover:underline">
              {t("Lancer un audit", "Run an audit")}
            </Link>
          )}
        </Empty>
      )}
    </SpaceShell>
  );
}

// One correction: a summary row that opens (native <details>, one open at a time) on everything needed to act.
function Item({ m, t, lang, edit, base }: { m: Correction; t: T; lang: "fr" | "en"; edit: boolean; base: string }) {
  const st = STATUS[m.status];
  const im = IMPACT[m.impact];
  const report = `/audit/${m.auditId}${m.kind === "journey" ? `#blocage-${m.type}` : ""}`;
  const replay = m.run ? `/replay/${m.run.id}?a=${m.replayAudit}` : null;
  const kind = m.kind === "journey" ? t("Parcours", "Journey") : t("Paiement", "Payment");
  const lostText = m.kind === "journey" ? `${m.missions} mission${m.missions > 1 ? "s" : ""} ${t(m.missions > 1 ? "perdues" : "perdue", "lost")}` : m.who.join(", ");
  const ticket = [
    `[AgentProof] ${m.label} · ${m.site.label} (${deviceLabel(m.site.device, lang).toLowerCase()})`,
    `${t("Type d'audit", "Audit type")} : ${kind} · ${t(im[0], im[1])}${m.kind === "journey" && m.missions ? ` · ${lostText}` : ""}`,
    `${t("Audit du", "Audit of")} ${shortDate(m.at, lang)}`,
    m.run?.detail ? `${t("Constat de l'agent", "Agent's finding")} : « ${m.run.detail} »` : "",
    `${t("Correction proposée", "Suggested fix")} : ${m.hint}`,
    ...m.hits.map((x) => `Mission ${x.n} · ${x.title} : ${base}/replay/${x.runId}?a=${m.replayAudit}`),
    replay && !m.hits.length ? `Replay : ${base}${replay}` : "",
    m.run?.shot ? `${t("Capture", "Screenshot")} : ${m.run.shot}` : "",
    `${t("Rapport", "Report")} : ${base}${report}`,
    `${t("Dans AgentProof", "In AgentProof")} : ${base}/espace/corrections#${m.id}`,
  ]
    .filter(Boolean)
    .join("\n");
  const relaunch = `/espace/nouveau?url=${encodeURIComponent(m.site.url)}&device=${m.site.device}`;

  const badges = (
    <>
      <span className="type-caption inline-flex h-[22px] items-center gap-1 whitespace-nowrap rounded-full bg-fill px-2 font-semibold text-ink-2">
        <Icon name={KIND_ICON[m.kind]} className="h-[13px] w-[13px]" />
        {kind}
      </span>
      {m.status !== "done" && <span className={`type-small whitespace-nowrap font-semibold md:w-[7.5rem] ${im[2]}`}>{t(im[0], im[1])}</span>}
      <span className={`type-caption inline-flex h-[22px] items-center whitespace-nowrap rounded-full px-2 font-semibold ${st[2]}`}>{t(st[0], st[1])}</span>
    </>
  );

  return (
    <details id={m.id} name="corrections" className="group/c scroll-mt-24 border-b border-hairline last:border-0">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-3 transition-colors hover:bg-bg-2/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue md:gap-5 [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
          <SiteLogo domain={m.site.domain} name={m.site.domain} className="max-sm:mt-0.5" />
          <span className="min-w-0">
            <span className="flex min-w-0 items-center gap-2 font-semibold">
              {m.kind === "journey" ? <BlockerIcon type={m.type} className="h-4 w-4 shrink-0" /> : <Icon name="payment" className="h-4 w-4 shrink-0" />}
              <span className="truncate">{m.label}</span>
            </span>
            <span className="type-small block truncate text-ink-2">
              {m.site.label} · <DeviceTag device={m.site.device} lang={lang} /> · {shortDate(m.at, lang)}
            </span>
            {/* Phones: the badges go on a line of their own under the name; the chevron stays on the right. */}
            <span className="mt-1.5 flex flex-wrap items-center gap-2 sm:hidden">{badges}</span>
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2 max-sm:hidden md:gap-3">{badges}</span>
        <Chevron className="h-3 w-3 shrink-0 text-ink-2 transition-transform duration-200 group-open/c:rotate-90" />
      </summary>

      <div className="grid gap-x-8 gap-y-6 border-t border-hairline bg-bg-2/40 px-5 py-6 md:grid-cols-[minmax(0,1fr)_minmax(0,340px)] md:px-6 dark:bg-white/[0.02]">
        <div className="flex min-w-0 flex-col gap-5">
          {m.status === "done" ? (
            <p className="flex items-center gap-2 font-semibold text-pass">
              <Icon name="shield" className="h-5 w-5" />
              {t("Correction prouvée : absente du dernier audit ou réussie au rejeu.", "Fix proven: gone from the latest audit or passed in the replay.")}
            </p>
          ) : (
            <Chips>
              {m.kind === "journey" ? <Chip tone={m.impact ? "fail" : "plain"}>{lostText}</Chip> : <>
                  <Chip icon="payment" tone="fail">{t("Paiement non transmis", "Payment not sent")}</Chip>
                  <Chip icon="person">{lostText}</Chip>
                </>}
              {m.impact === 0 && <Chip icon="mission_not_applicable">{t("Hors score", "Out of score")}</Chip>}
            </Chips>
          )}

          {m.run?.detail && (
            <div>
              <h4 className="type-caption font-semibold uppercase tracking-wide text-ink-2">{t("Constat de l’agent", "The agent's finding")}</h4>
              <p className="type-small mt-1.5 text-ink-2">« {m.run.detail} »</p>
            </div>
          )}

          <div>
            <h4 className="type-caption font-semibold uppercase tracking-wide text-ink-2">{t("Correction proposée", "Suggested fix")}</h4>
            <p className="mt-1.5 flex gap-2">
              <Chevron className="mt-[0.45em] h-3 w-3 shrink-0 text-link" />
              <span>{m.hint}</span>
            </p>
          </div>

          {m.hits.length > 0 && (
            <div>
              <h4 className="type-caption font-semibold uppercase tracking-wide text-ink-2">{t("Missions arrêtées", "Missions stopped")}</h4>
              <ul className="mt-1.5 grid gap-1">
                {m.hits.map((x) => (
                  <li key={x.runId} className="type-small flex flex-wrap items-baseline gap-x-2">
                    <Link href={`/audit/${m.auditId}#mission-${x.n}`} className="hover:underline">
                      <span className="text-ink-2 tnum">Mission {x.n}</span> · {x.title}
                    </Link>
                    <Link href={`/replay/${x.runId}?a=${m.replayAudit}`} className="text-link hover:underline">
                      Replay
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-3 pt-1">
            {edit && m.kind === "journey" && m.status !== "done" && (
              <form action="/api/fixes" method="post" className="flex flex-wrap gap-3">
                <input type="hidden" name="site" value={m.site.site_id} />
                <input type="hidden" name="device" value={m.site.device} />
                <input type="hidden" name="blocker" value={m.type} />
                <input type="hidden" name="back" value={`/espace/corrections#${m.id}`} />
                {m.status === "todo" ? (
                  <button className="btn btn-dark min-h-[40px] px-[18px] text-[15px]">{t("Marquer comme corrigé", "Mark as fixed")}</button>
                ) : (
                  <>
                    {/* Replays only the missions this blocker stopped (1 to 3): the fix is then proven by the agent. */}
                    <button name="action" value="prove" className="btn btn-dark min-h-[40px] px-[18px] text-[15px]">
                      {t("Prouver la correction", "Prove the fix")}
                    </button>
                    <button name="action" value="undo" className="btn btn-secondary min-h-[40px] px-[18px] text-[15px]">
                      {t("Annuler", "Undo")}
                    </button>
                  </>
                )}
              </form>
            )}
            {edit && m.kind === "payment" && (
              <Link href={relaunch} className="btn btn-dark min-h-[40px] px-[18px] text-[15px]">
                {t("Relancer le test de paiement", "Rerun the payment test")}
              </Link>
            )}
            <span className="type-small flex flex-wrap items-center gap-x-5 gap-y-2">
              <Link href={report} className="text-link hover:underline">
                {t("Voir dans le rapport", "See in the report")}
              </Link>
              {replay && !m.hits.length && (
                <Link href={replay} className="text-link hover:underline">
                  {t("Voir le replay", "Watch the replay")}
                </Link>
              )}
              {edit && m.kind === "journey" && (
                <Link href={relaunch} className="text-link hover:underline">
                  {t("Relancer l’audit", "Rerun the audit")}
                </Link>
              )}
              <CopyButton value={ticket} label={t("Copier le ticket", "Copy the ticket")} done={t("Ticket copié", "Ticket copied")} />
            </span>
          </div>
        </div>

        {m.run?.shot ? (
          <a href={m.run.shot} target="_blank" rel="noreferrer" className="block self-start rounded-[12px]" aria-label={`${t("Ouvrir la capture", "Open the screenshot")} : ${m.label}`}>
            <BrowserFrame url={m.run.url}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.run.shot} alt={`${t("Écran où l'agent s'arrête", "Screen where the agent stops")} : ${m.label}`} className="block w-full" loading="lazy" />
            </BrowserFrame>
          </a>
        ) : (
          <div className="type-small grid aspect-[16/10] place-items-center self-start rounded-[12px] bg-bg-2 text-ink-2 dark:bg-[#2c2c2e]">
            {m.status === "done" ? (
              <Link href={`${sitePath(m.site)}#corrections`} className="text-link hover:underline">
                {t("Voir le site", "See the site")}
              </Link>
            ) : (
              t("Pas de capture", "No screenshot")
            )}
          </div>
        )}
      </div>
    </details>
  );
}
