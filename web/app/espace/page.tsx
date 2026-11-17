import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/engine";
import { ROLE_LABEL, canLaunch, teamContext } from "@/lib/auth";
import { Field, MissionBar, StatusGlyph, scoreTone } from "@/lib/ui";

export const metadata = { title: "Espace · AgentProof" };

type Run = { status: string; success: boolean | null; blocker_type: string | null };

// Same rule as the site_scores view: out of stock and anti-bot blocks stay out of the score.
function score(runs: Run[]) {
  const scored = runs.filter((r) => r.status === "done" && r.success !== null && !["out_of_stock", "captcha_or_bot_block"].includes(r.blocker_type ?? ""));
  const ok = scored.filter((r) => r.success).length;
  return { ok, scored: scored.length, total: runs.length, score: scored.length ? Math.round((100 * ok) / scored.length) : null };
}

export default async function Espace() {
  const ctx = await teamContext();
  if (!ctx) redirect("/connexion?next=/espace");
  const { user, teams, team } = ctx;

  if (!team) return <NoTeam email={user.email} />;

  const { data: audits } = await db
    .from("audits")
    .select("id, created_at, device, status, compare_to, sites(domain), users:created_by(email), runs(status, success, blocker_type)")
    .eq("team_id", team.id)
    .eq("kind", "checkout")
    .order("created_at", { ascending: false })
    .limit(100);
  // Competitor audits show inside the main report, not as their own line.
  const competitors = new Set((audits ?? []).map((a) => a.compare_to).filter(Boolean));
  const rows = (audits ?? []).filter((a) => !competitors.has(a.id));

  return (
    <div className="bg-bg-2 pb-24 pt-16 max-[734px]:pt-10">
      <div className="wrap-wide">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="type-eyebrow text-ink-2">Espace d&apos;équipe · {ROLE_LABEL[team.role]}</p>
            <h1 className="type-h1 mt-2">{team.name}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {teams.length > 1 && (
              <form action="/api/team" method="post" className="flex items-center gap-2">
                <input type="hidden" name="action" value="switch" />
                <label className="sr-only" htmlFor="team-switch">Changer d&apos;équipe</label>
                <select id="team-switch" name="team" defaultValue={team.id} className="h-9 rounded-[8px] border border-line bg-tile px-2 type-small">
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <button className="btn btn-secondary type-small">Ouvrir</button>
              </form>
            )}
            <Link href="/equipe" className="more">Équipe et accès</Link>
            <form action="/api/auth" method="post">
              <input type="hidden" name="action" value="logout" />
              <button className="type-small text-ink-2 hover:text-ink">Déconnexion ({user.email})</button>
            </form>
          </div>
        </header>

        {canLaunch(team.role) ? (
          <form action="/api/audits" method="post" className="tile mt-10 grid gap-4">
            <h2 className="type-h3">Nouvel audit</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Adresse du site" name="url" required />
              <Field label="Un concurrent (facultatif)" name="competitor" />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-ink-2">
                Appareil
                <select name="device" className="h-9 rounded-[8px] border border-line bg-tile px-2 text-ink">
                  <option value="desktop">Ordinateur</option>
                  <option value="mobile">Mobile</option>
                </select>
              </label>
              <button className="btn">Lancer l&apos;audit</button>
            </div>
            <p className="type-small text-ink-2">Le rapport arrive aussi par e-mail à {user.email}.</p>
          </form>
        ) : (
          <p className="tile mt-10 text-ink-2">Accès lecteur : tu consultes les rapports de l&apos;équipe. Un admin ou le propriétaire lance les audits.</p>
        )}

        <h2 className="type-h3 mt-14">Audits de l&apos;équipe</h2>
        {rows.length ? (
          <ol className="mt-5 overflow-hidden rounded-[18px] bg-tile">
            {rows.map((a: any) => {
              const s = score(a.runs);
              return (
                <li key={a.id} className="border-b border-hairline last:border-0">
                  <Link
                    href={`/audit/${a.id}`}
                    className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-6 py-5 transition-colors duration-200 hover:bg-bg-2/60 max-[734px]:px-5 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_10rem_5rem]"
                  >
                    <span className="min-w-0">
                      <span className="type-headline block truncate">
                        {a.sites?.domain}
                        {a.compare_to && <span className="text-ink-2"> · avec concurrent</span>}
                      </span>
                      <span className="type-small text-ink-2">
                        {new Date(a.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} ·{" "}
                        {a.device === "mobile" ? "Mobile" : "Ordinateur"}
                      </span>
                    </span>
                    <span className="type-small hidden truncate text-ink-2 md:block">{a.users?.email ?? "—"}</span>
                    <span className="col-span-2 md:col-span-1">
                      <MissionBar ok={s.ok} done={s.scored} total={s.total} size="sm" />
                    </span>
                    <span className="row-start-1 col-start-2 flex items-center justify-end gap-2 type-headline tnum md:col-start-auto">
                      {a.status === "done" ? (
                        <>
                          <StatusGlyph tone={scoreTone(s.score)} className="h-4 w-4" />
                          {s.score ?? "—"} %
                        </>
                      ) : (
                        <span className="type-small text-ink-2">En cours</span>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="tile mt-5 text-center text-ink-2">Aucun audit pour l&apos;instant.</p>
        )}
      </div>
    </div>
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
      <div className="mx-auto grid w-[min(560px,87.5%)] gap-6">
        <h1 className="type-h1 text-center">Ton espace</h1>
        {!!invites?.length && (
          <div className="tile">
            <h2 className="type-h3">Invitations en attente</h2>
            <ul className="mt-3 grid gap-1 text-ink-2">
              {invites.map((i: any) => (
                <li key={i.id}>
                  {i.teams?.name} · {ROLE_LABEL[i.role as "admin" | "viewer"]}
                </li>
              ))}
            </ul>
            <p className="type-small mt-3 text-ink-2">Ouvre le lien reçu par e-mail pour rejoindre l&apos;équipe.</p>
          </div>
        )}
        <form action="/api/team" method="post" className="tile grid gap-4">
          <h2 className="type-h3">Créer une équipe</h2>
          <input type="hidden" name="action" value="create" />
          <Field label="Nom de l'équipe" name="name" type="text" required />
          <button className="btn">Créer</button>
        </form>
        <form action="/api/auth" method="post" className="text-center">
          <input type="hidden" name="action" value="logout" />
          <button className="type-small text-ink-2 hover:text-ink">Déconnexion ({email})</button>
        </form>
      </div>
    </div>
  );
}
