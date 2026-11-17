import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/engine";
import { ROLE_LABEL, canLaunch, teamContext } from "@/lib/auth";
import { Chevron, Field, Group, MissionBar, Row, Segmented, Spinner, StatusGlyph, scoreTone, summarize } from "@/lib/ui";
import { SpaceShell } from "./shell";

export const metadata = { title: "Vue d'ensemble · AgentProof" };

type Audit = {
  id: string;
  created_at: string;
  device: string;
  status: string;
  compare_to: string | null;
  sites: { domain: string } | null;
  users: { email: string } | null;
  runs: { status: string; success: boolean | null; blocker_type: string | null }[];
};

const FILTERS = [
  ["tous", "Tous"],
  ["en-cours", "En cours"],
  ["termines", "Terminés"],
] as const;

const date = (d: string) => new Date(d).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const deviceLabel = (d: string) => (d === "mobile" ? "Mobile" : "Ordinateur");

export default async function Espace({ searchParams }: { searchParams: Promise<{ vue?: string }> }) {
  const ctx = await teamContext();
  if (!ctx) redirect("/connexion?next=/espace");
  const { user, teams, team } = ctx;
  if (!team) return <NoTeam email={user.email} />;
  const vue = (await searchParams).vue ?? "tous";

  const { data } = await db
    .from("audits")
    .select("id, created_at, device, status, compare_to, sites(domain), users:created_by(email), runs(status, success, blocker_type)")
    .eq("team_id", team.id)
    .eq("kind", "checkout")
    .order("created_at", { ascending: false })
    .limit(100);
  const all = (data ?? []) as unknown as Audit[];
  // Competitor audits show inside the main report, not as their own line.
  const competitors = new Set(all.map((a) => a.compare_to).filter(Boolean));
  const audits = all.filter((a) => !competitors.has(a.id)).map((a) => ({ ...a, s: summarize(a.runs) }));

  // One line per site and device: latest finished score, and how it moved since the audit before.
  const sites = new Map<string, { latest: (typeof audits)[number]; previous?: number | null }>();
  for (const a of audits) {
    if (a.status !== "done" || !a.sites) continue;
    const key = `${a.sites.domain}|${a.device}`;
    const seen = sites.get(key);
    if (!seen) sites.set(key, { latest: a });
    else if (seen.previous === undefined) seen.previous = a.s.score;
  }

  const running = audits.filter((a) => a.status !== "done");
  const shown = vue === "en-cours" ? running : vue === "termines" ? audits.filter((a) => a.status === "done") : audits;
  const launch = canLaunch(team.role);

  return (
    <SpaceShell
      team={team}
      teams={teams}
      title="Vue d'ensemble"
      intro={audits.length ? `${audits.length} audit${audits.length > 1 ? "s" : ""} · ${sites.size} site${sites.size > 1 ? "s" : ""} suivi${sites.size > 1 ? "s" : ""}${running.length ? ` · ${running.length} en cours` : ""}` : undefined}
    >
      {launch ? (
        <Group title="Nouvel audit" footer={`Cinq missions, 10 à 20 minutes. Le rapport arrive aussi par e-mail à ${user.email}.`}>
          <form action="/api/audits" method="post" className="grid gap-4 p-5 sm:p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Adresse du site" name="url" required />
              <Field label="Un concurrent (facultatif)" name="competitor" />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Segmented
                name="device"
                label="Appareil"
                value="desktop"
                options={[
                  ["desktop", "Ordinateur"],
                  ["mobile", "Mobile"],
                ]}
              />
              <button className="btn">Lancer l&apos;audit</button>
            </div>
          </form>
        </Group>
      ) : (
        <Group>
          <Row className="text-ink-2">Accès {ROLE_LABEL.viewer.toLowerCase()} : tu consultes les rapports de l&apos;équipe. Un admin ou le propriétaire lance les audits.</Row>
        </Group>
      )}

      {sites.size > 0 && (
        <Group title="Sites suivis" footer="Dernier audit terminé de chaque site, et l'écart avec l'audit précédent.">
          {[...sites.values()].map(({ latest: a, previous }) => {
            const delta = previous != null && a.s.score != null ? a.s.score - previous : null;
            return (
              <Link key={a.id} href={`/audit/${a.id}`} className="group block border-b border-hairline last:border-0 hover:bg-bg-2/60">
                <div className="grid min-h-[68px] grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-5 px-5 py-3 sm:grid-cols-[minmax(0,1fr)_8rem_5rem_5.5rem_1rem]">
                  <span className="min-w-0">
                    <span className="type-headline block truncate">{a.sites!.domain}</span>
                    <span className="type-small text-ink-2">
                      {deviceLabel(a.device)} · {date(a.created_at)}
                    </span>
                  </span>
                  <span className="hidden sm:block">
                    <MissionBar ok={a.s.ok} done={a.s.done} total={a.s.total} size="sm" />
                  </span>
                  <span className={`type-small whitespace-nowrap text-right tnum ${delta == null || delta === 0 ? "text-ink-2" : delta > 0 ? "text-pass" : "text-fail"}`}>
                    {delta == null ? "" : delta === 0 ? "Stable" : `${delta > 0 ? "+" : "−"}${Math.abs(delta)} pts`}
                  </span>
                  <span className="type-headline flex items-center justify-end gap-2 whitespace-nowrap tnum">
                    <StatusGlyph tone={scoreTone(a.s.score)} className="h-4 w-4" />
                    {a.s.score ?? "—"} %
                  </span>
                  <Chevron className="hidden h-3 w-3 text-ink-2 sm:block" />
                </div>
              </Link>
            );
          })}
        </Group>
      )}

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-1">
          <h2 className="type-headline">Historique</h2>
          {audits.length > 0 && (
            <nav aria-label="Filtrer l'historique" className="inline-flex rounded-[10px] bg-fill p-[3px]">
              {FILTERS.map(([v, l]) => (
                <Link
                  key={v}
                  href={v === "tous" ? "/espace" : `/espace?vue=${v}`}
                  scroll={false}
                  aria-current={vue === v ? "true" : undefined}
                  className="type-small flex h-8 items-center rounded-[8px] px-3.5 font-semibold text-ink-2 transition-colors aria-[current=true]:bg-tile aria-[current=true]:text-ink aria-[current=true]:shadow-[0_1px_3px_rgb(0_0_0/0.12)] dark:aria-[current=true]:bg-[#636366]"
                >
                  {l}
                </Link>
              ))}
            </nav>
          )}
        </div>
        <div className="overflow-hidden rounded-[18px] bg-tile">
          {shown.length ? (
            shown.map((a) => (
              <Link key={a.id} href={`/audit/${a.id}`} className="block border-b border-hairline last:border-0 hover:bg-bg-2/60">
                <div className="grid min-h-[68px] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-5 px-5 py-3 md:grid-cols-[minmax(0,1fr)_minmax(0,12rem)_8rem_5.5rem_1rem]">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">
                      {a.sites?.domain ?? "Site supprimé"}
                      {a.compare_to && <span className="font-normal text-ink-2"> · avec concurrent</span>}
                    </span>
                    <span className="type-small text-ink-2">
                      {date(a.created_at)} · {deviceLabel(a.device)}
                    </span>
                  </span>
                  <span className="type-small hidden truncate text-ink-2 md:block">{a.users?.email === user.email ? "Toi" : a.users?.email ?? "—"}</span>
                  <span className="hidden md:block">
                    <MissionBar ok={a.s.ok} done={a.s.done} total={a.s.total} size="sm" />
                  </span>
                  <span className="flex items-center justify-end gap-2 whitespace-nowrap tnum">
                    {a.status === "done" ? (
                      <>
                        <StatusGlyph tone={scoreTone(a.s.score)} className="h-4 w-4" />
                        <span className="font-semibold">{a.s.score ?? "—"} %</span>
                      </>
                    ) : (
                      <span className="type-small flex items-center gap-2 text-ink-2">
                        <Spinner className="h-3.5 w-3.5" />
                        {a.s.finished} sur {a.s.total}
                      </span>
                    )}
                  </span>
                  <Chevron className="hidden h-3 w-3 text-ink-2 md:block" />
                </div>
              </Link>
            ))
          ) : (
            <div className="px-6 py-14 text-center">
              <p className="type-headline">{audits.length ? "Aucun audit dans cette vue." : "Aucun audit pour l'instant."}</p>
              <p className="mt-1 text-ink-2">
                {audits.length ? (
                  <Link href="/espace" className="text-link hover:underline">
                    Voir tous les audits
                  </Link>
                ) : launch ? (
                  "Lance le premier avec le formulaire ci-dessus."
                ) : (
                  "Les audits de l'équipe apparaîtront ici."
                )}
              </p>
            </div>
          )}
        </div>
      </section>
    </SpaceShell>
  );
}

// Signed in but in no team: pending invitations first, or create a team.
async function NoTeam({ email }: { email: string }) {
  const { data: invites } = await db
    .from("invitations")
    .select("id, role, teams(name)")
    .eq("email", email)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString());
  return (
    <div className="bg-bg-2 py-24 max-[734px]:py-14">
      <div className="mx-auto grid w-[min(560px,87.5%)] gap-10">
        <header className="text-center">
          <h1 className="type-h1">Ton espace.</h1>
          <p className="type-intro mt-3 text-ink-2">Rejoins une équipe ou crée la tienne pour lancer des audits.</p>
        </header>
        {!!invites?.length && (
          <Group title="Invitations en attente" footer="Ouvre le lien reçu par e-mail pour rejoindre l'équipe.">
            {invites.map((i: any) => (
              <Row key={i.id}>
                <span className="flex-1 font-semibold">{i.teams?.name}</span>
                <span className="type-small text-ink-2">{ROLE_LABEL[i.role as "admin" | "viewer"]}</span>
              </Row>
            ))}
          </Group>
        )}
        <Group title="Créer une équipe">
          <form action="/api/team" method="post" className="grid gap-4 p-5 sm:p-6">
            <input type="hidden" name="action" value="create" />
            <Field label="Nom de l'équipe" name="name" type="text" required />
            <button className="btn justify-self-end">Créer l&apos;équipe</button>
          </form>
        </Group>
        <form action="/api/auth" method="post" className="text-center">
          <input type="hidden" name="action" value="logout" />
          <button className="type-small text-link hover:underline">Se déconnecter de {email}</button>
        </form>
      </div>
    </div>
  );
}
