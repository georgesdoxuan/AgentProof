"use client";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Hint } from "@/lib/hint";
import { GLYPH } from "@/lib/glyphs";
import type { Lang } from "@/lib/i18n";

export type PayCard = { id: string; label: string; last4: string };
// A saved test account, as the launch form may show it: its name and masked login, never a password.
export type PayAccount = { id: number; label: string | null; hint: string; domain: string };

function KeyGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-[15px] w-[15px] shrink-0 text-ink-2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={GLYPH.key} />
    </svg>
  );
}

const Chevron = ({ open }: { open: boolean }) => (
  <svg viewBox="0 0 12 12" className={`h-2.5 w-2.5 text-ink-2 transition-transform duration-200 ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M1.5 4L6 8.5 10.5 4" />
  </svg>
);

// A chip that opens a small pop-up list to pick one item (a card, a test account), plus a link to manage them.
// align "right": the chip sits at the end of its row, so the list opens leftwards and stays inside the card.
function ChipMenu<I extends { id: string | number }>({ items, value, onPick, glyph, main, side, label, listLabel, manage, align = "left" }: {
  items: I[]; value: I; onPick: (id: I["id"]) => void; glyph: React.ReactNode; main: (i: I) => string; side: (i: I) => string;
  label: string; listLabel: string; manage: { href: string; text: string }; align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLSpanElement>(null);
  const listId = useId();
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
  return (
    <span ref={box} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={label}
        className="type-caption inline-flex h-8 max-w-full items-center gap-2 rounded-full bg-tile px-3 font-semibold shadow-[inset_0_0_0_0.5px_var(--line)] transition-colors hover:bg-fill motion-safe:animate-[ap-fade_0.2s_ease-out] dark:bg-[#3a3a3c]"
      >
        {glyph}
        <span className="min-w-0 truncate">{main(value)}</span>
        {side(value) && <span className="shrink-0 font-normal text-ink-2 tnum">{side(value)}</span>}
        <Chevron open={open} />
      </button>
      {open && (
        <div className={`absolute ${align === "right" ? "right-0" : "left-0"} top-[calc(100%+6px)] z-50 w-[min(300px,calc(100vw-48px))] overflow-hidden rounded-[14px] bg-pop p-1.5 shadow-[0_10px_32px_rgb(0_0_0/0.18),inset_0_0_0_0.5px_var(--line)] motion-safe:animate-[ap-fade_0.15s_ease-out]`}>
          <ul id={listId} role="listbox" aria-label={listLabel}>
            {items.map((c) => (
              <li key={c.id} role="option" aria-selected={c.id === value.id}>
                <button
                  type="button"
                  onClick={() => (onPick(c.id), setOpen(false))}
                  className="type-small flex min-h-10 w-full items-center gap-2.5 rounded-[9px] px-2.5 text-left hover:bg-fill"
                >
                  {glyph}
                  <span className="min-w-0 flex-1 truncate font-semibold">{main(c)}</span>
                  <span className="shrink-0 text-ink-2 tnum">{side(c)}</span>
                  <svg viewBox="0 0 12 12" className={`h-3 w-3 shrink-0 text-blue ${c.id === value.id ? "" : "invisible"}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M2 6.5l2.5 2.5L10 3.5" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-1 border-t border-hairline pt-1">
            <Link href={manage.href} className="type-small flex min-h-10 items-center rounded-[9px] px-2.5 text-link hover:bg-fill">
              {manage.text}
            </Link>
          </div>
        </div>
      )}
    </span>
  );
}

// The domain typed in the form's address field, as the server stores it (no scheme, no www, no path).
function domainOf(input: string) {
  const v = input.trim().toLowerCase().replace(/^https?:\/\//, "").split(/[/?#]/)[0].replace(/^www\./, "");
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(v) ? v : "";
}

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

// Payment test of the launch form: a checkbox; once ticked (or "Payment only" picked), the card it will use as a small
// chip, and whether the agent tests as a stranger or signed in with one of the team's test accounts for this site.
export function PaymentPicker({ cards, accounts = [], lang, tip, max }: { cards: PayCard[]; accounts?: PayAccount[]; lang: Lang; tip: string; max: number }) {
  const t = (fr: string, en: string) => (lang === "en" ? en : fr);
  const [on, setOn] = useState(false);
  const [paymentOnly, setPaymentOnly] = useState(false);
  const [card, setCard] = useState(cards[0]?.id ?? "");
  const [domain, setDomain] = useState("");
  const [mode, setMode] = useState<"none" | "login">("none");
  const [login, setLogin] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const current = cards.find((c) => c.id === card) ?? cards[0];
  const mine = accounts.filter((a) => a.domain === domain);
  const account = mine.find((a) => a.id === login) ?? mine[0];

  // "Test type" and the site's address live in the same form: follow them ("Payment only" shows the card too,
  // and the accounts offered are the ones saved for the site being typed).
  useEffect(() => {
    const form = box.current?.closest("form");
    if (!form) return;
    const sync = () => {
      const data = new FormData(form);
      setPaymentOnly(data.get("mode") === "payment");
      setDomain(domainOf(String(data.get("url") ?? "")));
    };
    sync();
    form.addEventListener("change", sync);
    form.addEventListener("input", sync);
    return () => {
      form.removeEventListener("change", sync);
      form.removeEventListener("input", sync);
    };
  }, []);

  if (!current) return null;
  const shown = on || paymentOnly;
  const addHref = `/espace/reglages/comptes${domain ? `?site=${encodeURIComponent(domain)}` : ""}`;
  const accountName = (a: PayAccount) => a.label || a.hint;
  const accountSide = (a: PayAccount) => (a.label ? a.hint : "");

  return (
    <div ref={box} className="grid gap-3">
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
        <>
          <input type="hidden" name="card" value={current.id} />
          <ChipMenu
            items={cards}
            value={current}
            onPick={(id) => setCard(id)}
            glyph={<CardGlyph />}
            main={(c) => c.label}
            side={(c) => `•• ${c.last4}`}
            label={t(`Carte : ${current.label} se terminant par ${current.last4}. Changer de carte`, `Card: ${current.label} ending in ${current.last4}. Change card`)}
            listLabel={t("Cartes de l'équipe", "Team cards")}
            manage={{ href: "/espace/reglages/paiement", text: cards.length > 1 ? t("Gérer les cartes", "Manage cards") : t("Changer ou ajouter une carte", "Change or add a card") }}
          />
        </>
      )}
    </div>
    {shown && (
      <div className="grid gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Hint
            tip={t(
              "Sans compte : l’agent achète en invité, comme un inconnu. Avec un compte de test : il se connecte d’abord avec le compte choisi, sans jamais voir le mot de passe (coffre H Company).",
              "Without an account: the agent buys as a guest, like a stranger. With a test account: it signs in first with the chosen account, never seeing the password (H Company vault).",
            )}
          >
            <span className="type-small text-ink-2">{t("Compte", "Account")}</span>
          </Hint>
          <fieldset className="inline-grid auto-cols-fr grid-flow-col rounded-[10px] bg-fill p-[3px] max-sm:w-full">
            <legend className="sr-only">{t("Compte utilisé pour le test de paiement", "Account used for the payment test")}</legend>
            {(
              [
                ["none", t("Sans compte", "No account")],
                [
                  "login",
                  <>
                    <span className="max-sm:hidden">{t("Avec un compte de test", "With a test account")}</span>
                    <span className="sm:hidden">{t("Compte de test", "Test account")}</span>
                  </>,
                ],
              ] as const
            ).map(([v, l]) => (
              <label key={v} className="relative min-w-0 cursor-pointer">
                <input type="radio" name="account" value={v} checked={mode === v} onChange={() => setMode(v)} className="peer sr-only" />
                <span className="type-small flex h-9 items-center justify-center whitespace-nowrap rounded-[8px] px-4 font-semibold text-ink-2 transition-colors duration-200 max-sm:px-3 peer-checked:bg-tile peer-checked:text-ink peer-checked:shadow-[0_1px_3px_rgb(0_0_0/0.12)] peer-focus-visible:outline-2 peer-focus-visible:outline-blue dark:peer-checked:bg-[#636366]">
                  {l}
                </span>
              </label>
            ))}
          </fieldset>
        </div>
        {mode === "login" && (
          <div className="flex min-h-8 flex-wrap items-center justify-end gap-x-3 gap-y-1 motion-safe:animate-[ap-fade_0.2s_ease-out]">
            {account ? (
              <>
                <input type="hidden" name="login" value={account.id} />
                {mine.length > 1 ? (
                  <ChipMenu
                    items={mine}
                    value={account}
                    onPick={(id) => setLogin(id)}
                    glyph={<KeyGlyph />}
                    main={accountName}
                    side={accountSide}
                    label={t(`Compte de test : ${accountName(account)}. Changer de compte`, `Test account: ${accountName(account)}. Change account`)}
                    listLabel={t(`Comptes de test pour ${domain}`, `Test accounts for ${domain}`)}
                    manage={{ href: addHref, text: t("Gérer les comptes de test", "Manage test accounts") }}
                    align="right"
                  />
                ) : (
                  <span className="type-caption inline-flex h-8 min-w-0 items-center gap-2 rounded-full bg-tile px-3 font-semibold shadow-[inset_0_0_0_0.5px_var(--line)] dark:bg-[#3a3a3c]">
                    <KeyGlyph />
                    <span className="min-w-0 truncate">{accountName(account)}</span>
                    {accountSide(account) && <span className="shrink-0 font-normal text-ink-2">{accountSide(account)}</span>}
                  </span>
                )}
              </>
            ) : (
              <span className="type-small text-ink-2" role="status">
                {domain ? t(`Aucun compte de test pour ${domain}`, `No test account for ${domain}`) : t("Saisis d’abord l’adresse du site", "Enter the site’s address first")}
              </span>
            )}
            {(!account || mine.length === 1) && (
              <Link href={addHref} className="type-small text-link hover:underline">
                {account ? t("Ajouter un autre compte", "Add another account") : t("Ajouter un compte", "Add an account")}
              </Link>
            )}
          </div>
        )}
      </div>
    )}
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
