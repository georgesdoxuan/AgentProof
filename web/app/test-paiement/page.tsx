import { connection } from "next/server";
import { PAYMENT_VERDICTS, db } from "@/lib/engine";
import { Eyebrow, StatusBadge } from "@/lib/ui";
import { AutoRefresh } from "../audit/[id]/refresh";

export const metadata = { title: "Test de paiement — AgentProof" };

const tone = (v: string | null) =>
  v === "bank_declined" || v === "payment_accepted" ? "text-pass" : v === "three_ds_timeout" ? "text-warn" : "text-fail";

export default async function TestPaiement() {
  await connection();
  const { data: runs } = await db
    .from("runs")
    .select("id, status, success, payment_verdict, bank_seen, agent_answer, judge, steps, duration_s, cost_usd, created_at, missions!inner(slug), audits(sites(name, url))")
    .eq("missions.slug", "paiement")
    .order("created_at", { ascending: false })
    .limit(50);
  const running = runs?.some((r) => r.status !== "done");

  return (
    <div className="space-y-10">
      {running && <AutoRefresh />}
      <header className="max-w-3xl space-y-4">
        <Eyebrow>Équipe · Test de paiement réel</Eyebrow>
        <h1 className="font-display text-[36px] font-semibold leading-[1.1] tracking-[-0.03em] sm:text-[44px]">Le paiement passe-t-il jusqu&apos;à la banque ?</h1>
        <p className="text-[17px] leading-relaxed text-ink-2">
          L&apos;agent achète l&apos;article le moins cher et paie avec la carte de test de l&apos;équipe, sur un compte à 0 €. Un refus « fonds insuffisants » prouve que le
          paiement a atteint la banque : avec des fonds, il serait passé. Une seule tentative par test. Garde ton téléphone à portée pour valider le 3D Secure.
        </p>
      </header>

      <form action="/api/payment-tests" method="post" className="grid gap-3 rounded-2xl border border-line bg-card p-5 shadow-card sm:grid-cols-[1fr_14rem_auto]">
        <input name="url" required placeholder="site-a-tester.fr" aria-label="Site à tester" className="rounded-lg border border-line bg-paper px-3 py-2" />
        <input name="key" type="password" required placeholder="Clé équipe" aria-label="Clé équipe" className="rounded-lg border border-line bg-paper px-3 py-2" />
        <button className="rounded-lg bg-ink px-5 py-2 font-semibold text-paper hover:opacity-90">Lancer le test</button>
      </form>

      <section className="space-y-3">
        {(runs ?? []).map((r: any) => {
          const a = r.agent_answer ?? {};
          return (
            <article key={r.id} className="grid gap-3 rounded-2xl border border-line bg-card p-5 shadow-card md:grid-cols-[1fr_16rem]">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge run={r} />
                  <h2 className="text-[17px] font-semibold">{r.audits.sites.name}</h2>
                  <span className="text-[13px] text-ink-3">{new Date(r.created_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}</span>
                </div>
                {r.status === "done" && (
                  <>
                    <p className={`font-semibold ${tone(r.payment_verdict)}`}>{PAYMENT_VERDICTS[r.payment_verdict] ?? r.payment_verdict}</p>
                    {a.site_message && <p className="text-[15px] text-ink-2">Message du site : « {a.site_message} »</p>}
                    <p className="text-[13px] text-ink-3">
                      3D Secure : {a.three_ds_seen ? "demandé" : "non"} · Prestataire : {a.payment_provider || "?"} · Moyens : {a.payment_methods || "?"}
                    </p>
                    {r.judge?.result && r.judge.result !== r.payment_verdict && (
                      <p className="text-[13px] text-warn">Juge visuel en désaccord : {PAYMENT_VERDICTS[r.judge.result] ?? r.judge.result}. {r.judge.reason}</p>
                    )}
                    <p className="text-[13px] text-ink-3">
                      {r.steps ?? "?"} étapes · {r.duration_s ? `${Math.round(r.duration_s)} s` : "?"}
                      {r.cost_usd != null && ` · ${Number(r.cost_usd).toFixed(3)} $`}
                    </p>
                  </>
                )}
              </div>
              {r.status === "done" && (
                <form action="/api/payment-tests/bank" method="post" className="space-y-2 rounded-xl bg-card-2/60 p-3 text-[13px]">
                  <p className="font-semibold">
                    Vu dans Revolut ? {r.bank_seen == null ? <span className="text-ink-3">non renseigné</span> : r.bank_seen ? <span className="text-pass">oui</span> : <span className="text-fail">non</span>}
                  </p>
                  <input type="hidden" name="run" value={r.id} />
                  <input name="key" type="password" required placeholder="Clé équipe" aria-label="Clé équipe" className="w-full rounded-md border border-line bg-paper px-2 py-1" />
                  <div className="flex gap-2">
                    <button name="seen" value="yes" className="flex-1 rounded-md bg-pass-soft px-2 py-1 font-semibold text-pass">Oui</button>
                    <button name="seen" value="no" className="flex-1 rounded-md bg-fail-soft px-2 py-1 font-semibold text-fail">Non</button>
                  </div>
                </form>
              )}
            </article>
          );
        })}
        {!runs?.length && <p className="text-ink-3">Aucun test de paiement pour l&apos;instant.</p>}
      </section>
    </div>
  );
}
