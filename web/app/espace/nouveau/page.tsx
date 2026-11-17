import { redirect } from "next/navigation";
import { canLaunch, teamContext } from "@/lib/auth";
import { cardView } from "@/lib/cards";
import { Field, Group, Segmented } from "@/lib/ui";
import { SpaceShell } from "../shell";

export const metadata = { title: "Lancer un audit · AgentProof" };

export default async function Nouveau({ searchParams }: { searchParams: Promise<{ url?: string }> }) {
  const ctx = await teamContext();
  if (!ctx) redirect("/connexion?next=/espace/nouveau");
  if (!ctx.team || !canLaunch(ctx.team.role)) redirect("/espace");
  const { user, teams, team } = ctx;
  const { url } = await searchParams;
  const card = await cardView(team.id);

  return (
    <SpaceShell team={team} teams={teams} title="Lancer un audit" intro="Un agent IA essaie d'acheter sur ton site, comme un vrai client. Les missions s'arrêtent avant le paiement et ne saisissent aucune donnée personnelle.">
      <Group footer={`Audit complet : cinq missions, 10 à 20 minutes. Paiement seulement : un achat réel avec la carte de l'équipe, 3 à 10 minutes, sans le concurrent. Le rapport arrive aussi par e-mail à ${user.email}.`}>
        <form action="/api/audits" method="post" className="grid gap-5 p-6 sm:p-8">
          {card && !card.missing && (
            <Segmented
              name="mode"
              label="Type de test"
              value="audit"
              options={[
                ["audit", "Audit complet"],
                ["payment", "Paiement seulement"],
              ]}
            />
          )}
          <Field label="Adresse du site" name="url" required defaultValue={url} />
          <Field label="Un concurrent (facultatif)" name="competitor" />
          {card && !card.missing && (
            <label className="type-small flex items-start gap-3 rounded-[12px] bg-bg-2 p-4 dark:bg-[#2c2c2e]">
              <input type="checkbox" name="payment" value="1" className="mt-0.5 h-4 w-4 shrink-0 accent-blue" />
              <span>
                <span className="font-semibold">Ajouter un test de paiement réel à l&apos;audit</span>
                <span className="block text-ink-2">
                  L&apos;agent part au plus près du checkout, prend le premier article disponible et paie une fois avec {card.label} •••• {card.last4}. Avec une carte approvisionnée, la commande est réelle.
                  Jamais sur le concurrent.
                </span>
              </span>
            </label>
          )}
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
