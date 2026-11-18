import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { staffUser } from "@/lib/auth";
import { db, paymentStages, paymentVerdicts } from "@/lib/engine";
import { locale, tr } from "@/lib/i18n";
import { getLang, getT } from "@/lib/lang";
import { StatusBadge } from "@/lib/ui";
import { AutoRefresh } from "../audit/[id]/refresh";

export async function generateMetadata() {
  const t = await getT();
  return { title: `${t("Test de paiement", "Payment test")} · AgentProof` };
}

const tone = (v: string | null) =>
  v === "bank_declined" || v === "payment_accepted" ? "text-pass" : v === "three_ds_timeout" || v === "inconclusive" ? "text-warn" : "text-fail";

const input =
  "h-12 w-full rounded-[12px] border border-[#86868b] bg-tile px-4 text-[17px] placeholder:text-ink-2 transition-[border-color,box-shadow] duration-200 focus:border-blue focus:shadow-[0_0_0_4px_rgb(0_113_227/0.3)] focus:outline-none dark:border-line";

export default async function TestPaiement() {
  await connection();
  // R&D page for AgentProof's own team: not part of the product, not public.
  const { user, isStaff } = await staffUser();
  if (!user) redirect("/connexion?next=/test-paiement");
  if (!isStaff) notFound();
  const { data: runs } = await db
    .from("runs")
    .select("id, status, success, payment_verdict, bank_seen, agent_answer, judge, steps, duration_s, cost_usd, created_at, missions!inner(slug), audits(sites(name, url))")
    .eq("missions.slug", "paiement")
    .order("created_at", { ascending: false })
    .limit(50);
  const running = runs?.some((r) => r.status !== "done");
  const lang = await getLang();
  const t = tr(lang);
  const PAYMENT_VERDICTS = paymentVerdicts(lang);
  const PAYMENT_STAGES = paymentStages(lang);

  return (
    <div className="bg-bg-2 pb-24 pt-16 max-[734px]:pt-10">
      {running && <AutoRefresh />}
      <div className="wrap-wide">
        <header className="max-w-[760px]">
          <p className="type-eyebrow text-ink-2">{t("R&D interne · Test de paiement réel", "Internal R&D · Real payment test")}</p>
          <h1 className="type-h1 mt-3">{t("Le paiement atteint‑il la banque ?", "Does the payment reach the bank?")}</h1>
          <p className="type-intro mt-5 text-ink-2">
            {t(
              "L’agent achète l’article le moins cher et paie avec la carte de test de l’équipe, sur un compte à 0 €. Un refus « fonds insuffisants » prouve que le paiement a atteint la banque. Une seule tentative par test. Garde ton téléphone à portée pour valider le 3D Secure.",
              "The agent buys the cheapest item and pays with the team's test card, on a €0 account. An “insufficient funds” decline proves the payment reached the bank. One attempt per test. Keep your phone at hand to approve 3D Secure.",
            )}
          </p>
        </header>

        <form action="/api/payment-tests" method="post" className="tile mt-12 grid gap-3 p-6! sm:grid-cols-[1fr_auto]">
          <input name="url" required placeholder={t("site-a-tester.fr", "site-to-test.com")} aria-label={t("Site à tester", "Site to test")} className={input} inputMode="url" autoCapitalize="none" spellCheck={false} />
          <button className="btn rounded-[12px]">{t("Lancer le test", "Run the test")}</button>
        </form>

        <section className="mt-8 space-y-4">
          {(runs ?? []).map((r: any) => {
            const a = r.agent_answer ?? {};
            return (
              <article key={r.id} className="tile grid gap-6 p-7! md:grid-cols-[1fr_17rem]">
                <div className="space-y-2">
                  <div className="type-small flex flex-wrap items-center gap-x-3 gap-y-1">
                    <StatusBadge run={r} />
                    <span className="text-ink-2">{new Date(r.created_at).toLocaleString(locale(lang), { timeZone: "Europe/Paris", dateStyle: "medium", timeStyle: "short" })}</span>
                  </div>
                  <h2 className="type-h3">{r.audits.sites.name}</h2>
                  {r.status === "done" && (
                    <>
                      <p className={`type-headline ${tone(r.payment_verdict)}`}>{PAYMENT_VERDICTS[r.payment_verdict] ?? r.payment_verdict}</p>
                      {a.site_message && <p className="text-ink-2">{t("Message du site", "Site message")} : « {a.site_message} »</p>}
                      {a.furthest_stage && (
                        <p>
                          {t("Étape la plus loin atteinte", "Furthest step reached")} : <span className="font-semibold">{PAYMENT_STAGES[a.furthest_stage] ?? a.furthest_stage}</span>
                        </p>
                      )}
                      <p className="type-small text-ink-2">
                        3D Secure : {a.three_ds_seen ? t("demandé", "requested") : t("non", "no")} · {t("Prestataire", "Provider")} : {a.payment_provider || "?"} · {t("Moyens", "Methods")} : {a.payment_methods || "?"}
                      </p>
                      {r.judge?.result && r.judge.result !== r.payment_verdict && (
                        <p className="type-small text-warn">
                          {t("Juge visuel en désaccord", "Visual judge disagrees")} : {PAYMENT_VERDICTS[r.judge.result] ?? r.judge.result}. {r.judge.reason}
                        </p>
                      )}
                      <p className="type-small text-ink-2 tnum">
                        {r.steps ?? "?"} {t("étapes", "steps")} · {r.duration_s ? `${Math.round(r.duration_s)} s` : "?"}
                        {r.cost_usd != null && ` · ${Number(r.cost_usd).toFixed(3)} $`}
                      </p>
                    </>
                  )}
                </div>
                {r.status === "done" && (
                  <form action="/api/payment-tests/bank" method="post" className="type-small space-y-3 rounded-[18px] bg-bg-2 p-4 dark:bg-[#2c2c2e]">
                    <p className="font-semibold">
                      {t("Vu dans Revolut ?", "Seen in Revolut?")}{" "}
                      {r.bank_seen == null ? (
                        <span className="font-normal text-ink-2">{t("Non renseigné", "Not set")}</span>
                      ) : r.bank_seen ? (
                        <span className="text-pass">{t("Oui", "Yes")}</span>
                      ) : (
                        <span className="text-fail">{t("Non", "No")}</span>
                      )}
                    </p>
                    <input type="hidden" name="run" value={r.id} />
                    <div className="flex gap-2">
                      <button name="seen" value="yes" className="btn btn-dark min-h-9 flex-1 text-[14px]">
                        {t("Oui", "Yes")}
                      </button>
                      <button name="seen" value="no" className="btn btn-secondary min-h-9 flex-1 text-[14px]">
                        {t("Non", "No")}
                      </button>
                    </div>
                  </form>
                )}
              </article>
            );
          })}
          {!runs?.length && <p className="text-ink-2">{t("Aucun test de paiement pour l’instant.", "No payment test yet.")}</p>}
        </section>
      </div>
    </div>
  );
}
