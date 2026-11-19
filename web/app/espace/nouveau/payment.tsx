"use client";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Hint } from "@/lib/hint";
import type { Lang } from "@/lib/i18n";

export type PayCard = { id: string; label: string; last4: string };

// A card the size of a word: the brand blue with a chip, like the wallet thumbnails on iPhone.
function CardGlyph({ className = "h-[15px] w-[22px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 22 15" className={`shrink-0 ${className}`} aria-hidden>
      <rect width="22" height="15" rx="2.5" fill="var(--blue)" />
      <rect x="3" y="4.5" width="4.5" height="3.5" rx="0.8" fill="#fff" opacity="0.85" />
      <rect x="3" y="10.5" width="9" height="1.4" rx="0.7" fill="#fff" opacity="0.6" />
    </svg>
  );
}

// Payment test of the launch form: a checkbox; once ticked (or "Payment only" picked), the card it will use,
// as a small chip. Tapping the chip opens the team's cards to pick another, and a link to manage them.
export function PaymentPicker({ cards, lang, tip, max }: { cards: PayCard[]; lang: Lang; tip: string; max: number }) {
  const t = (fr: string, en: string) => (lang === "en" ? en : fr);
  const [on, setOn] = useState(false);
  const [paymentOnly, setPaymentOnly] = useState(false);
  const [card, setCard] = useState(cards[0]?.id ?? "");
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const listId = useId();
  const current = cards.find((c) => c.id === card) ?? cards[0];

  // The "Test type" control lives in the same form: follow it so "Payment only" shows the card too.
  useEffect(() => {
    const form = box.current?.closest("form");
    if (!form) return;
    const sync = () => setPaymentOnly(new FormData(form).get("mode") === "payment");
    sync();
    form.addEventListener("change", sync);
    return () => form.removeEventListener("change", sync);
  }, []);

  // Close on a click outside or Escape, like a pop-up menu.
  useEffect(() => {
    if (!open) return;
    const away = (e: Event) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  if (!current) return null;
  const shown = on || paymentOnly;

  return (
    <div ref={box} className="grid gap-2">
    <div className="flex min-h-9 flex-wrap items-center gap-x-3 gap-y-2">
      {!paymentOnly && (
        <label className="type-small inline-flex cursor-pointer items-center gap-3">
          <input type="checkbox" name="payment" value="1" checked={on} onChange={(e) => setOn(e.target.checked)} className="h-4 w-4 shrink-0 accent-blue" />
          <Hint tip={tip} focusable={false}>
            <span className="font-semibold">{t("Tester le paiement", "Test the payment")}</span>
          </Hint>
        </label>
      )}
      {paymentOnly && <span className="type-small font-semibold">{t("Carte utilisée", "Card used")}</span>}
      {shown && (
        <span className="relative">
          <input type="hidden" name="card" value={current.id} />
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={listId}
            aria-label={t(`Carte : ${current.label} se terminant par ${current.last4}. Changer de carte`, `Card: ${current.label} ending in ${current.last4}. Change card`)}
            className="type-caption inline-flex h-8 items-center gap-2 rounded-full bg-tile px-3 font-semibold shadow-[inset_0_0_0_0.5px_var(--line)] transition-colors hover:bg-fill motion-safe:animate-[ap-fade_0.2s_ease-out] dark:bg-[#3a3a3c]"
          >
            <CardGlyph />
            {current.label}
            <span className="font-normal text-ink-2 tnum">•• {current.last4}</span>
            <svg viewBox="0 0 12 12" className={`h-2.5 w-2.5 text-ink-2 transition-transform duration-200 ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M1.5 4L6 8.5 10.5 4" />
            </svg>
          </button>
          {open && (
            <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-[min(280px,calc(100vw-48px))] overflow-hidden rounded-[14px] bg-pop p-1.5 shadow-[0_10px_32px_rgb(0_0_0/0.18),inset_0_0_0_0.5px_var(--line)] motion-safe:animate-[ap-fade_0.15s_ease-out]">
              <ul id={listId} role="listbox" aria-label={t("Cartes de l'équipe", "Team cards")}>
                {cards.map((c) => (
                  <li key={c.id} role="option" aria-selected={c.id === current.id}>
                    <button
                      type="button"
                      onClick={() => (setCard(c.id), setOpen(false))}
                      className="type-small flex min-h-10 w-full items-center gap-2.5 rounded-[9px] px-2.5 text-left hover:bg-fill"
                    >
                      <CardGlyph />
                      <span className="min-w-0 flex-1 truncate font-semibold">{c.label}</span>
                      <span className="text-ink-2 tnum">•• {c.last4}</span>
                      <svg viewBox="0 0 12 12" className={`h-3 w-3 text-blue ${c.id === current.id ? "" : "invisible"}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M2 6.5l2.5 2.5L10 3.5" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-1 border-t border-hairline pt-1">
                <Link href="/espace/reglages/paiement" className="type-small flex min-h-10 items-center rounded-[9px] px-2.5 text-link hover:bg-fill">
                  {cards.length > 1 ? t("Gérer les cartes", "Manage cards") : t("Changer ou ajouter une carte", "Change or add a card")}
                </Link>
              </div>
            </div>
          )}
        </span>
      )}
    </div>
    {shown && (
      // A real payment, every time: the team ticks this box, the server refuses the test without it.
      <label className="type-small inline-flex cursor-pointer items-start gap-3 text-ink-2">
        <input type="checkbox" name="pay_confirm" value="1" required className="mt-[3px] h-4 w-4 shrink-0 accent-blue" />
        <span>
          {t(
            `Je confirme un paiement réel avec cette carte, au plus ${max} € livraison comprise. Avec une carte approvisionnée, la commande est réelle.`,
            `I confirm a real payment with this card, at most €${max} shipping included. With a funded card, the order is real.`,
          )}
        </span>
      </label>
    )}
    </div>
  );
}
