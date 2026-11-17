import { redirect } from "next/navigation";
import { canLaunch, teamContext } from "@/lib/auth";
import { Field, Group, Segmented } from "@/lib/ui";
import { SpaceShell } from "../shell";

export const metadata = { title: "Lancer un audit · AgentProof" };

export default async function Nouveau({ searchParams }: { searchParams: Promise<{ url?: string }> }) {
  const ctx = await teamContext();
  if (!ctx) redirect("/connexion?next=/espace/nouveau");
  if (!ctx.team || !canLaunch(ctx.team.role)) redirect("/espace");
  const { user, teams, team } = ctx;
  const { url } = await searchParams;

  return (
    <SpaceShell team={team} teams={teams} title="Lancer un audit" intro="Un agent IA essaie d'acheter sur ton site, comme un vrai client. Il ne paie jamais et ne saisit aucune donnée personnelle.">
      <Group footer={`Cinq missions, 10 à 20 minutes. Le rapport arrive aussi par e-mail à ${user.email}.`}>
        <form action="/api/audits" method="post" className="grid gap-5 p-6 sm:p-8">
          <Field label="Adresse du site" name="url" required defaultValue={url} />
          <Field label="Un concurrent (facultatif)" name="competitor" />
          <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
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
    </SpaceShell>
  );
}
