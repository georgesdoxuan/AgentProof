import { PAY_REACHED_BANK, paymentVerdicts } from "@/lib/engine";
import { tr, type Lang } from "@/lib/i18n";
import { Chevron, Chip, Chips, StatusGlyph } from "@/lib/ui";

// The result of a real payment test, readable at a glance: one verdict, one line on what it means for the merchant,
// the tunnel as a row of steps (cart → delivery → card → bank → order), then the technical details folded away.
// Rule from PR #88: reaching the bank (3D Secure requested, card declined for lack of funds) validates the tunnel,
// but the order is not confirmed, so the audit never shows 100 % alone ("hors paiement").

type Step = { key: string; label: string; note?: string; state: "done" | "open" | "fail" | "warn" | "todo" };

// furthest_stage → how many of the four tunnel steps (cart, delivery, card, bank) the agent got through.
const STAGE_DEPTH: Record<string, number> = { home: 0, product: 0, cart: 1, checkout: 2, shipping: 2, card_form: 3, payment_submitted: 4 };

const known = (v?: string | null) => (v && !/^(unknown|inconnu|\?)$/i.test(v.trim()) ? v.trim() : null);

export function paymentSteps(pay: any, lang: Lang): Step[] {
  const t = tr(lang);
  const v: string | null = pay.payment_verdict;
  const a = pay.agent_answer ?? {};
  const reachedBank = PAY_REACHED_BANK.includes(v ?? "");
  // A 3D Secure request or a declined card means the payment reached the bank, whatever furthest_stage says
  // (the agent often reports the card form it came back to once the 3D Secure page expired).
  const depth = reachedBank ? 4 : (STAGE_DEPTH[a.furthest_stage] ?? 0);
  const bankNote =
    v === "payment_accepted" ? t("Paiement accepté", "Payment accepted")
    : v === "bank_declined" ? t("Carte refusée (sans fonds)", "Card declined (no funds)")
    : v === "three_ds_timeout" || a.three_ds_seen ? t("3D Secure demandé", "3D Secure requested")
    : undefined;
  const steps: Step[] = [
    { key: "cart", label: t("Panier", "Cart"), state: "todo" },
    { key: "delivery", label: t("Livraison", "Delivery"), state: "todo" },
    { key: "card", label: t("Carte", "Card"), state: "todo" },
    { key: "bank", label: t("Banque", "Bank"), note: reachedBank ? bankNote : undefined, state: "todo" },
    { key: "order", label: t("Commande", "Order"), state: "todo" },
  ];
  steps.forEach((s, i) => { if (i < depth) s.state = "done"; });
  if (v === "payment_accepted") {
    steps[4].state = "done";
    steps[4].note = t("Confirmée", "Confirmed");
  } else if (reachedBank) {
    // Not a failure of the site: only the cardholder can approve 3D Secure, and the test card has no funds.
    steps[4].state = "open";
    steps[4].note = t("Non confirmée", "Not confirmed");
  } else if (v) {
    // Where the agent stopped: on the card form itself when it was unusable, else the step after the last one passed.
    const at = v === "card_form_unusable" ? 2 : Math.min(depth, 4);
    steps.forEach((s, i) => { if (i >= at) s.state = "todo"; });
    steps[at].state = v === "inconclusive" ? "warn" : "fail";
    // The headline already names the cause: the step only says where it happened.
    steps[at].note = t("Arrêt ici", "Stopped here");
  }
  return steps;
}

function headline(pay: any, lang: Lang) {
  const t = tr(lang);
  const v: string | null = pay.payment_verdict;
  if (v === "payment_accepted") return t("Paiement accepté, commande confirmée", "Payment accepted, order confirmed");
  if (PAY_REACHED_BANK.includes(v ?? "")) return t("Paiement validé jusqu’à la banque", "Payment validated up to the bank");
  return v ? (paymentVerdicts(lang)[v] ?? v) : t("Pas de résultat", "No result");
}

function meaning(pay: any, lang: Lang) {
  const t = tr(lang);
  switch (pay.payment_verdict) {
    case "payment_accepted": return t("Un client peut payer sur ce site : la commande est passée.", "A customer can pay on this site: the order went through.");
    case "three_ds_timeout": return t("Un client peut payer. La banque a demandé le 3D Secure, que seul le porteur de la carte peut valider : aucune commande n’est passée.", "A customer can pay. The bank asked for 3D Secure, which only the cardholder can approve: no order was placed.");
    case "bank_declined": return t("Un client peut payer. La banque a refusé la carte de test (sans fonds) : aucune commande n’est passée.", "A customer can pay. The bank declined the test card (no funds): no order was placed.");
    case "card_form_unusable": return t("L’agent n’a pas pu remplir le formulaire de carte.", "The agent could not fill in the card form.");
    case "not_reached_payment": return t("L’agent n’a jamais atteint la page de paiement.", "The agent never reached the payment page.");
    case "login_required": return t("Le site exige un compte avant de payer.", "The site requires an account before paying.");
    case "bot_block": return t("Un captcha ou un anti-bot a arrêté l’agent avant le paiement.", "A captcha or anti-bot stopped the agent before payment.");
    case "technical_error": return t("Une erreur du site a arrêté le paiement.", "A site error stopped the payment.");
    case "inconclusive": return t("L’agent a manqué d’étapes avant de conclure : le test est à relancer.", "The agent ran out of steps before concluding: run the test again.");
    default: return null;
  }
}

const DOT: Record<Step["state"], React.ReactNode> = {
  done: <StatusGlyph tone="pass" className="h-5 w-5" />,
  fail: <StatusGlyph tone="fail" className="h-5 w-5" />,
  warn: <StatusGlyph tone="warn" className="h-5 w-5" />,
  // The order a test card can never confirm: neutral, not red.
  open: <StatusGlyph tone="none" className="h-5 w-5" />,
  todo: <span className="block h-5 w-5 rounded-full shadow-[inset_0_0_0_1.5px_var(--line)]" />,
};

function Tunnel({ steps, lang }: { steps: Step[]; lang: Lang }) {
  const t = tr(lang);
  const word: Record<Step["state"], string> = {
    done: t("franchie", "passed"), open: t("en attente", "pending"), fail: t("bloquée", "blocked"), warn: t("non concluante", "inconclusive"), todo: t("non atteinte", "not reached"),
  };
  return (
    <ol className="mt-5 grid gap-3 sm:grid-cols-5 sm:gap-0" aria-label={t("Étapes du paiement", "Payment steps")}>
      {steps.map((s, i) => (
        <li key={s.key} className="relative flex items-start gap-3 sm:flex-col sm:items-center sm:gap-2 sm:text-center">
          {/* Connector to the next step: horizontal on wide screens, vertical on phones. */}
          {i < steps.length - 1 && (
            <span
              aria-hidden
              className={`absolute top-6 bottom-[-12px] left-[9.5px] w-px sm:top-[9.5px] sm:bottom-auto sm:left-[calc(50%+16px)] sm:h-px sm:w-[calc(100%-32px)] ${steps[i + 1].state === "done" ? "bg-pass" : "bg-line"}`}
            />
          )}
          <span className="relative z-[1]">{DOT[s.state]}</span>
          <span className="min-w-0 sm:px-1">
            <span className={`type-small block font-semibold ${s.state === "todo" ? "text-ink-2" : ""}`}>
              {s.label}
              <span className="sr-only"> : {word[s.state]}</span>
            </span>
            {s.note && (
              <span className={`type-caption block ${s.state === "fail" ? "text-fail" : s.state === "warn" ? "text-warn" : "text-ink-2"}`}>{s.note}</span>
            )}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function PaymentResult({ pay, lang }: { pay: any; lang: Lang }) {
  const t = tr(lang);
  const v: string | null = pay.payment_verdict;
  const a = pay.agent_answer ?? {};
  const reachedBank = PAY_REACHED_BANK.includes(v ?? "");
  const provider = known(a.payment_provider);
  const methods = known(a.payment_methods);
  const judgeDiffers = !!pay.judge?.result && pay.judge.result !== v;
  // A 3D Secure run judged before 19/11 only on its last screenshot (taken after the 3D Secure page expired):
  // not a real disagreement, so it goes to the details. Any other disagreement stays visible.
  const judgeNote =
    v === "three_ds_timeout" && pay.judge?.earlier_screenshot
      ? t("Page 3D Secure vue sur une capture précédente ; la dernière montre le retour au formulaire de carte.", "3D Secure page seen on an earlier screenshot; the last one shows the card form again.")
      : v === "three_ds_timeout" && judgeDiffers
        ? `${t("Il n’a vu que la dernière capture, prise après l’expiration du 3D Secure", "It only saw the last screenshot, taken after 3D Secure expired")}${pay.judge.reason ? ` (${pay.judge.reason})` : ""}.`
        : null;
  const disagreement = judgeDiffers && v !== "three_ds_timeout";
  const hasDetails = !!(a.site_message || judgeNote || a.steps_summary);
  const sense = meaning(pay, lang);

  return (
    <>
      <p className={`type-h3 mt-3 ${reachedBank ? "text-pass" : v === "inconclusive" ? "text-warn" : "text-fail"}`}>{headline(pay, lang)}</p>
      {sense && <p className="mt-2">{sense}</p>}

      <Tunnel steps={paymentSteps(pay, lang)} lang={lang} />

      {disagreement && (
        <p className="type-small mt-4 text-warn">
          {t("Juge visuel en désaccord", "Visual judge disagrees")} : {paymentVerdicts(lang)[pay.judge.result] ?? pay.judge.result}. {pay.judge.reason}
        </p>
      )}

      {(provider || methods) && (
        <Chips className="mt-5">
          {provider && <Chip icon="shield">{t("Prestataire", "Provider")} · {provider}</Chip>}
          {methods && <Chip icon="payment" className="max-w-full whitespace-normal!">{methods}</Chip>}
        </Chips>
      )}

      {hasDetails && (
        <details className="type-small group relative z-10 mt-4 text-ink-2">
          <summary className="inline-flex min-h-[32px] cursor-pointer list-none items-center gap-1.5 text-link [&::-webkit-details-marker]:hidden">
            <Chevron className="h-2.5 w-2.5 transition-transform duration-200 group-open:rotate-90" />
            {t("Détails du test", "Test details")}
          </summary>
          <dl className="mt-2 grid gap-3 border-l border-line pl-3.5">
            {a.site_message && (
              <div>
                <dt className="font-semibold text-ink">{t("Message affiché par le site", "Message shown by the site")}</dt>
                <dd className="mt-0.5">« {a.site_message} »</dd>
              </div>
            )}
            {judgeNote && (
              <div>
                <dt className="font-semibold text-ink">{t("Juge visuel", "Visual judge")}</dt>
                <dd className="mt-0.5">{judgeNote}</dd>
              </div>
            )}
            {a.steps_summary && (
              <div>
                <dt className="font-semibold text-ink">{t("Compte rendu de l’agent", "The agent's report")}</dt>
                <dd className="mt-0.5">{a.steps_summary}</dd>
              </div>
            )}
          </dl>
        </details>
      )}
    </>
  );
}
