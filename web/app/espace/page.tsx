import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/engine";
import { ROLE_LABEL, canLaunch, teamContext } from "@/lib/auth";
import { loadSpace, priorities, shortDate, deviceLabel } from "@/lib/space";
import { Chevron, Field, Group, MissionBar, Row, Spinner } from "@/lib/ui";
import { AutoRefresh } from "../audit/[id]/refresh";
import { SpaceShell } from "./shell";
import { BlockerItem, SiteCard } from "./parts";

export const metadata = { title: "Accueil · AgentProof" };

// "georges.doxuan@…" -> "Georges". Short or numeric local parts give a plain greeting.
function firstName(email: string) {
  const w = email.split("@")[0].split(/[._+-]/)[0];
  return /^[a-zà-ÿ]{3,}$/i.test(w) ? w[0].toUpperCase() + w.slice(1).toLowerCase() : null;
}

// Home of the team space: what is running, what to fix first, the sites at a glance.
export default async function Accueil() {
  const ctx = await teamContext();
  if (!ctx) redirect("/connexion?next=/espace");
  const { user, teams, team } = ctx;
  if (!team) return <NoTeam email={user.email} />;

  const { audits, sites } = await loadSpace(team.id);
  const running = audits.filter((a) => a.status !== "done");
  const todo = priorities(sites);
  const openCount = sites.reduce((n, s) => n + s.blockers.filter((b) => b.state !== "check").length, 0);
  const launch = canLaunch(team.role);
  const name = firstName(user.email);

  const status = !audits.length
    ? "Ton espace est prêt. Lance un premier audit pour voir si un agent IA peut acheter sur ton site."
    : [
        `${sites.length} site${sites.length > 1 ? "s" : ""} suivi${sites.length > 1 ? "s" : ""}`,
        running.length ? `${running.length} audit${running.length > 1 ? "s" : ""} en cours` : null,
        openCount ? `${openCount} blocage${openCount > 1 ? "s" : ""} à corriger` : sites.some((s) => s.latest) ? "aucun blocage ouvert" : null,
      ]
        .filter(Boolean)
        .join(" · ") + ".";

  return (
    <SpaceShell
      team={team}
      teams={teams}
      title={name ? `Bonjour ${name}.` : "Bonjour."}
      intro={status}
      actions={
        launch && audits.length > 0 ? (
          <Link href="/espace/nouveau" className="btn">
            Lancer un audit
          </Link>
        ) : undefined
      }
    >
      {running.length > 0 && <AutoRefresh />}

      {!audits.length && (
        <section className="tile p-0!">
          <ol className="grid md:grid-cols-3">
            {[
              ["Indique ton site", "Son adresse, et un concurrent si tu veux te comparer."],
              ["L'agent essaie d'acheter", "Cinq missions réelles, de la recherche au checkout, en 10 à 20 minutes."],
              ["Corrige ce qui bloque", "Capture du blocage, correction proposée, puis relance pour vérifier."],
            ].map(([t, d], i) => (
              <li key={t} className="border-hairline p-8 max-md:border-b md:border-r md:last:border-0 max-md:last:border-0">
                <span className="type-small grid h-7 w-7 place-items-center rounded-full bg-fill font-semibold tnum">{i + 1}</span>
                <h2 className="type-headline mt-4">{t}</h2>
                <p className="type-small mt-1 text-ink-2">{d}</p>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-hairline px-8 py-6">
            <p className="type-small text-ink-2">
              {launch ? `Le rapport arrive aussi par e-mail à ${user.email}.` : `Accès ${ROLE_LABEL.viewer.toLowerCase()} : un admin ou le propriétaire lance les audits.`}
            </p>
            {launch && (
              <Link href="/espace/nouveau" className="btn">
                Lancer mon premier audit
              </Link>
            )}
          </div>
        </section>
      )}

      {running.length > 0 && (
        <Group title="En cours" footer="La page se met à jour toute seule. Ouvre un audit pour regarder l'agent en direct.">
          {running.map((a) => (
            <Link key={a.id} href={`/audit/${a.id}`} className="block border-b border-hairline last:border-0 hover:bg-bg-2/60">
              <div className="grid min-h-[68px] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-5 px-5 py-3 sm:grid-cols-[minmax(0,1fr)_10rem_7rem_1rem]">
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{a.sites?.domain}</span>
                  <span className="type-small text-ink-2">
                    {deviceLabel(a.device)} · lancé {shortDate(a.created_at)}
                  </span>
                </span>
                <span className="hidden sm:block">
                  <MissionBar ok={a.s.ok} done={a.s.done} total={a.s.total} size="sm" />
                </span>
                <span className="type-small flex items-center justify-end gap-2 whitespace-nowrap text-ink-2 tnum">
                  <Spinner className="h-3.5 w-3.5" />
                  {a.s.finished} sur {a.s.total}
                </span>
                <Chevron className="hidden h-3 w-3 text-ink-2 sm:block" />
              </div>
            </Link>
          ))}
        </Group>
      )}

      {todo.length > 0 && (
        <section>
          <div className="mb-3 flex items-baseline justify-between gap-4 px-1">
            <h2 className="type-headline">À corriger en priorité</h2>
            <span className="type-small text-ink-2">Classé par missions perdues</span>
          </div>
          <div className={`grid gap-5 ${todo.length > 1 ? "md:grid-cols-2 xl:grid-cols-3" : ""}`}>
            {todo.map(({ site, b }) => (
              <BlockerItem key={`${site.key}:${b.type}`} site={site} b={b} canEdit={false} compact />
            ))}
          </div>
        </section>
      )}

      {sites.length > 0 && (
        <section>
          <div className="mb-3 flex items-baseline justify-between gap-4 px-1">
            <h2 className="type-headline">Mes sites</h2>
            <Link href="/espace/sites" className="type-small text-link hover:underline">
              Tout voir
            </Link>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {sites.slice(0, 3).map((s) => (
              <SiteCard key={s.key} site={s} />
            ))}
          </div>
        </section>
      )}
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
