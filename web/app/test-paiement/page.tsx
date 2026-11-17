import { connection } from "next/server";
import { PAYMENT_VERDICTS, db } from "@/lib/engine";
import { StatusBadge } from "@/lib/ui";
import { AutoRefresh } from "../audit/[id]/refresh";

export const metadata = { title: "Test de paiement · AgentProof" };

const tone = (v: string | null) =>
  v === "bank_declined" || v === "payment_accepted" ? "text-pass" : v === "three_ds_timeout" ? "text-warn" : "text-fail";

const input =
  "h-12 w-full rounded-[12px] border border-[#86868b] bg-tile px-4 text-[17px] placeholder:text-ink-2 transition-[border-color,box-shadow] duration-200 focus:border-blue focus:shadow-[0_0_0_4px_rgb(0_113_227/0.3)] focus:outline-none dark:border-line";

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
    <div className="bg-bg-2 pb-24 pt-16 max-[734px]:pt-10">
      {running && <AutoRefresh />}
      <div className="wrap-wide">
        <header className="max-w-[760px]">
          <p className="type-eyebrow text-ink-2">Équipe · Test de paiement réel</p>
          <h1 className="type-h1 mt-3">Le paiement atteint‑il la banque ?</h1>
          <p className="type-intro mt-5 text-ink-2">
            L&apos;agent achète l&apos;article le moins cher et paie avec la carte de test de l&apos;équipe, sur un compte à 0 €. Un refus « fonds insuffisants » prouve que le
            paiement a atteint la banque. Une seule tentative par test. Garde ton téléphone à portée pour valider le 3D Secure.
          </p>
        </header>

        <form action="/api/payment-tests" method="post" className="tile mt-12 grid gap-3 p-6! sm:grid-cols-[1fr_14rem_auto]">
          <input name="url" required placeholder="site-a-tester.fr" aria-label="Site à tester" className={input} inputMode="url" autoCapitalize="none" spellCheck={false} />
          <input name="key" type="password" required placeholder="Clé équipe" aria-label="Clé équipe" className={input} autoComplete="off" />
          <button className="btn rounded-[12px]">Lancer le test</button>
        </form>

        <section className="mt-8 space-y-4">
          {(runs ?? []).map((r: any) => {
            const a = r.agent_answer ?? {};
            return (
              <article key={r.id} className="tile grid gap-6 p-7! md:grid-cols-[1fr_17rem]">
                <div className="space-y-2">
                  <div className="type-small flex flex-wrap items-center gap-x-3 gap-y-1">
                    <StatusBadge run={r} />
                    <span className="text-ink-2">{new Date(r.created_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "medium", timeStyle: "short" })}</span>
                  </div>
                  <h2 className="type-h3">{r.audits.sites.name}</h2>
                  {r.status === "done" && (
                    <>
                      <p className={`type-headline ${tone(r.payment_verdict)}`}>{PAYMENT_VERDICTS[r.payment_verdict] ?? r.payment_verdict}</p>
                      {a.site_message && <p className="text-ink-2">Message du site : « {a.site_message} »</p>}
                      <p className="type-small text-ink-2">
                        3D Secure : {a.three_ds_seen ? "demandé" : "non"} · Prestataire : {a.payment_provider || "?"} · Moyens : {a.payment_methods || "?"}
                      </p>
                      {r.judge?.result && r.judge.result !== r.payment_verdict && (
                        <p className="type-small text-warn">
                          Juge visuel en désaccord : {PAYMENT_VERDICTS[r.judge.result] ?? r.judge.result}. {r.judge.reason}
                        </p>
                      )}
                      <p className="type-small text-ink-2 tnum">
                        {r.steps ?? "?"} étapes · {r.duration_s ? `${Math.round(r.duration_s)} s` : "?"}
                        {r.cost_usd != null && ` · ${Number(r.cost_usd).toFixed(3)} $`}
                      </p>
                    </>
                  )}
                </div>
                {r.status === "done" && (
                  <form action="/api/payment-tests/bank" method="post" className="type-small space-y-3 rounded-[18px] bg-bg-2 p-4 dark:bg-[#2c2c2e]">
                    <p className="font-semibold">
                      Vu dans Revolut ?{" "}
                      {r.bank_seen == null ? (
                        <span className="font-normal text-ink-2">Non renseigné</span>
                      ) : r.bank_seen ? (
                        <span className="text-pass">Oui</span>
                      ) : (
                        <span className="text-fail">Non</span>
                      )}
                    </p>
                    <input type="hidden" name="run" value={r.id} />
                    <input name="key" type="password" required placeholder="Clé équipe" aria-label="Clé équipe" className={`${input} h-10 text-[15px]`} autoComplete="off" />
                    <div className="flex gap-2">
                      <button name="seen" value="yes" className="btn btn-dark min-h-9 flex-1 text-[14px]">
                        Oui
                      </button>
                      <button name="seen" value="no" className="btn btn-secondary min-h-9 flex-1 text-[14px]">
                        Non
                      </button>
                    </div>
                  </form>
                )}
              </article>
            );
          })}
          {!runs?.length && <p className="text-ink-2">Aucun test de paiement pour l&apos;instant.</p>}
        </section>
      </div>
    </div>
  );
}
