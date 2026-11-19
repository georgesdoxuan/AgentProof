"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Lang } from "@/lib/i18n";
import type { PickItem } from "@/lib/missions";
import { Hint } from "@/lib/hint";

// Mission picker of the launch form: tick defaults, edit one for this audit or for the team, add the team's own.
// Sends the pick as JSON in a hidden "missions" field; /api/audits checks every id and every text again.
const TITLE = [3, 60];
const TEXT = [20, 600];
const PER_BATCH = 3; // missions H runs at once on our plan
const EDIT_ICON = "M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4";

export function MissionPicker({ items: initial, lang, max }: { items: PickItem[]; lang: Lang; max: number }) {
  const t = (fr: string, en: string) => (lang === "en" ? en : fr);
  const [items, setItems] = useState(initial);
  const [editing, setEditing] = useState<number | null>(null); // index in items
  const [error, setError] = useState("");
  const boxRef = useRef<HTMLDetailsElement>(null);
  const picked = items.filter((m) => m.checked);
  const n = picked.length;
  const batches = Math.ceil(n / PER_BATCH);

  // At least one mission: checked when the form is sent, so ticking and unticking never nags.
  useEffect(() => {
    const form = boxRef.current?.closest("form");
    if (!form) return;
    const onSubmit = (e: SubmitEvent) => {
      const mode = new FormData(form).get("mode");
      if (mode !== "payment" && !form.querySelector<HTMLInputElement>("[data-pick]:checked")) {
        e.preventDefault();
        boxRef.current!.open = true;
        setError(t("Choisis au moins une mission.", "Pick at least one mission."));
        boxRef.current!.querySelector<HTMLInputElement>("[data-pick]")?.focus();
      }
    };
    form.addEventListener("submit", onSubmit);
    return () => form.removeEventListener("submit", onSubmit);
  });

  const value = useMemo(
    () => JSON.stringify(picked.map((m) => (m.id && !m.once ? { id: m.id } : { title: m.title, text: m.instruction, ...(m.default ? { base_id: m.base_id ?? m.id } : {}) }))),
    [picked],
  );

  const toggle = (i: number) => {
    setError("");
    setItems((all) => all.map((m, k) => (k === i ? { ...m, checked: !m.checked } : m)));
  };
  // Fresh list after a save: keep this form's ticks and one-off changes; the mission just saved comes back ticked.
  const merge = (fresh: PickItem[], savedId?: number) =>
    setItems((cur) => {
      const old = new Map(cur.map((m) => [m.key, m]));
      return [
        ...fresh.map((s) => {
          const was = old.get(s.key);
          if (s.id === savedId || !was) return { ...s, checked: s.id === savedId || s.checked };
          return was.once ? { ...s, title: was.title, label: was.label, instruction: was.instruction, once: true, checked: was.checked } : { ...s, checked: was.checked };
        }),
        ...cur.filter((m) => m.id === null),
      ];
    });

  const add = () => {
    setItems((all) => [...all, { key: `n${Date.now()}`, id: null, base_id: null, title: "", label: "", instruction: "", default: null, icon: EDIT_ICON, team: true, once: true, checked: true }]);
    setEditing(items.length);
    if (boxRef.current) boxRef.current.open = true;
  };

  return (
    <details ref={boxRef} className="group/m rounded-[12px] bg-bg-2 dark:bg-[#2c2c2e]">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2 [&::-webkit-details-marker]:hidden">
        <Hint
          focusable={false}
          tip={t(
            `Coche les missions à jouer (${max} au plus). Le score se calcule sur les missions choisies. Un concurrent rejoue les mêmes missions, ce qui double les crédits.`,
            `Tick the missions to run (${max} at most). The score is computed on the chosen missions. A competitor replays the same missions, which doubles the credits.`,
          )}
        >
          <span className="type-small font-semibold">{t("Missions", "Missions")}</span>
        </Hint>
        <span className="type-small flex items-center gap-2 text-ink-2" aria-live="polite">
          <span className={n ? "" : "font-semibold text-fail"}>
            {n
              ? t(`${n} mission${n > 1 ? "s" : ""} · ${batches * 5} à ${batches * 10} min · ${n} crédit${n > 1 ? "s" : ""}`, `${n} mission${n > 1 ? "s" : ""} · ${batches * 5}–${batches * 10} min · ${n} credit${n > 1 ? "s" : ""}`)
              : t("Aucune mission", "No mission")}
          </span>
          <svg viewBox="0 0 12 12" className="h-3 w-3 shrink-0 transition-transform duration-200 group-open/m:rotate-180 motion-reduce:transition-none" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M1.5 4L6 8.5 10.5 4" />
          </svg>
        </span>
      </summary>
      <input type="hidden" name="missions" value={value} />
      <div className="grid gap-3 px-2 pb-3 sm:px-3">
        <ul className="overflow-hidden rounded-[12px] bg-tile">
          {items.map((m, i) => (
            <li key={m.key} className="border-b border-hairline last:border-0">
              {editing === i ? (
                <Editor
                  item={m}
                  lang={lang}
                  onCancel={() => {
                    setEditing(null);
                    if (!m.id && !m.title) setItems((all) => all.filter((_, k) => k !== i));
                  }}
                  onOnce={(title, instruction) => {
                    setItems((all) => all.map((x, k) => (k === i ? { ...x, title, label: title, instruction, once: true, checked: true } : x)));
                    setEditing(null);
                  }}
                  onSaved={(fresh, id) => {
                    if (!m.id) setItems((all) => all.filter((_, k) => k !== i));
                    merge(fresh, id);
                    setEditing(null);
                  }}
                />
              ) : (
                <Row item={m} lang={lang} disabled={!m.checked && n >= max} onToggle={() => toggle(i)} onEdit={() => setEditing(i)} />
              )}
            </li>
          ))}
        </ul>
        {error && (
          <p role="alert" className="type-small px-2 font-semibold text-fail">
            {error}
          </p>
        )}
        <button type="button" onClick={add} disabled={editing !== null} className="type-small inline-flex min-h-11 items-center gap-2 justify-self-start rounded-[10px] px-3 font-semibold text-link hover:bg-tile disabled:opacity-40">
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
            <path d="M12 5v14M5 12h14" />
          </svg>
          {t("Ajouter une mission", "Add a mission")}
        </button>
      </div>
    </details>
  );
}

function Row({ item: m, lang, disabled, onToggle, onEdit }: { item: PickItem; lang: Lang; disabled: boolean; onToggle: () => void; onEdit: () => void }) {
  const t = (fr: string, en: string) => (lang === "en" ? en : fr);
  const id = useId();
  const tag = m.once ? t("Pour cet audit", "This audit only") : m.team ? t("De l’espace", "Team mission") : m.base_id ? t("Modifiée", "Edited") : "";
  return (
    <div className="flex items-start gap-3 px-3 py-3 sm:px-4">
      <input id={id} aria-describedby={`${id}-d`} data-pick type="checkbox" checked={m.checked} disabled={disabled} onChange={onToggle} className="mt-1 h-[18px] w-[18px] shrink-0 accent-blue disabled:opacity-40" />
      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
        <span className="flex items-start gap-2">
          <svg viewBox="0 0 24 24" className={`mt-[3px] h-[18px] w-[18px] shrink-0 ${m.checked ? "text-blue" : "text-ink-2"}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d={m.icon} />
          </svg>
          <span className="min-w-0">
            <Hint focusable={false} tip={m.instruction}>
              <span className="font-semibold">{m.label}</span>
            </Hint>
            {tag && <span className="type-caption ml-2 inline-block rounded-full bg-fill px-2 py-0.5 align-[1px] font-semibold text-ink-2">{tag}</span>}
          </span>
        </span>
        {/* The instruction shows on hover of the name; screen readers get it with the checkbox. */}
        <span id={`${id}-d`} className="sr-only">{m.instruction}</span>
      </label>
      <button type="button" onClick={onEdit} className="type-small min-h-9 shrink-0 rounded-[8px] px-2 text-link hover:bg-fill" aria-label={`${t("Modifier", "Edit")} : ${m.label}`}>
        {t("Modifier", "Edit")}
      </button>
    </div>
  );
}

// Ideas for a team mission: each ends at the first checkout page, like the defaults, so the score rule holds.
const TEMPLATES: Record<Lang, [string, string][]> = {
  fr: [
    ["Produit précis", "Trouve le produit « nom ou référence », choisis une taille disponible, ajoute-le au panier, puis va jusqu'à la première page du checkout."],
    ["Code promo", "Ajoute un article au panier, ouvre le panier, saisis le code promo BIENVENUE10 dans le champ prévu et note le message affiché, puis va jusqu'à la première page du checkout."],
    ["Retours et échanges", "Trouve la politique de retour et d'échange (délai, frais) et note ce qu'elle indique, puis ajoute un article au panier et va jusqu'à la première page du checkout."],
    ["Guide des tailles", "Sur une fiche produit, ouvre le guide des tailles, choisis la taille conseillée pour 1,75 m et 70 kg, ajoute l'article au panier, puis va jusqu'à la première page du checkout."],
  ],
  en: [
    ["Specific product", "Find the product “name or reference”, pick an available size, add it to the cart, then go to the first checkout page."],
    ["Promo code", "Add an item to the cart, open the cart, enter the promo code WELCOME10 in its field and note the message shown, then go to the first checkout page."],
    ["Returns and exchanges", "Find the return and exchange policy (time limit, fees) and note what it says, then add an item to the cart and go to the first checkout page."],
    ["Size guide", "On a product page, open the size guide, pick the size advised for 1.75 m and 70 kg, add the item to the cart, then go to the first checkout page."],
  ],
};

function Editor({ item: m, lang, onCancel, onOnce, onSaved }: { item: PickItem; lang: Lang; onCancel: () => void; onOnce: (title: string, text: string) => void; onSaved: (fresh: PickItem[], id?: number) => void }) {
  const t = (fr: string, en: string) => (lang === "en" ? en : fr);
  const [title, setTitle] = useState(m.title);
  const [text, setText] = useState(m.instruction);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const titleId = useId();
  const textId = useId();
  const first = useRef<HTMLInputElement>(null);
  useEffect(() => first.current?.focus(), []);
  const ok = title.trim().length >= TITLE[0] && title.trim().length <= TITLE[1] && text.trim().length >= TEXT[0] && text.trim().length <= TEXT[1];
  const call = async (body: object) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/missions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onSaved(data.items, data.id);
    } catch (e) {
      setError((e as Error).message || t("Enregistrement impossible.", "Could not save."));
    } finally {
      setBusy(false);
    }
  };
  // The live row behind this mission: a saved edit or team mission (retire it), or the default itself (nothing to retire).
  const savedRow = m.id && (m.base_id || m.team) ? m.id : null;
  const btn = "btn min-h-10 px-4 text-[15px] disabled:opacity-40";

  return (
    <div className="grid gap-4 px-3 py-4 sm:px-4 motion-safe:animate-[ap-fade_0.2s_ease-out]">
      {!m.id && !m.title && (
        <div className="flex flex-wrap gap-2" role="group" aria-label={t("Idées de missions", "Mission ideas")}>
          {TEMPLATES[lang].map(([name, body]) => (
            <button key={name} type="button" onClick={() => (setTitle(name), setText(body))} className="type-caption min-h-8 rounded-full bg-fill px-3 font-semibold text-ink hover:bg-line/60">
              {name}
            </button>
          ))}
        </div>
      )}
      <label htmlFor={titleId} className="grid gap-1.5">
        <span className="type-caption font-semibold text-ink-2">{t("Nom", "Name")}</span>
        <input ref={first} id={titleId} value={title} maxLength={TITLE[1]} onChange={(e) => setTitle(e.target.value)} className="h-11 rounded-[10px] bg-bg-2 px-3 outline-none ring-blue focus-visible:ring-2 dark:bg-[#2c2c2e]" />
      </label>
      <label htmlFor={textId} className="grid gap-1.5">
        <span className="type-caption flex justify-between font-semibold text-ink-2">
          <Hint
            focusable={false}
            tip={t(
              "En langage courant. L’agent s’arrête toujours à la première page du checkout : il ne paie pas, ne crée pas de compte et ne saisit aucune donnée personnelle.",
              "In plain words. The agent always stops at the first checkout page: it does not pay, create an account or enter personal data.",
            )}
          >
            {t("Consigne pour l’agent", "Instruction for the agent")}
          </Hint>
          <span className="font-normal tabular-nums">
            {text.trim().length} / {TEXT[1]}
          </span>
        </span>
        <textarea id={textId} value={text} rows={4} maxLength={TEXT[1]} onChange={(e) => setText(e.target.value)} className="resize-y rounded-[10px] bg-bg-2 px-3 py-2.5 leading-snug outline-none ring-blue focus-visible:ring-2 dark:bg-[#2c2c2e]" />
      </label>
      {error && (
        <p role="alert" className="type-small font-semibold text-fail">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={!ok || busy} onClick={() => onOnce(title.trim(), text.trim())} className={`${btn} btn-secondary`}>
          {t("Pour cet audit", "This audit only")}
        </button>
        <button type="button" disabled={!ok || busy} onClick={() => call({ action: "save", id: m.team ? m.id : undefined, base_id: m.default ? (m.base_id ?? m.id) : undefined, title, text })} className={btn}>
          {busy ? t("Enregistrement…", "Saving…") : t("Enregistrer pour mon espace", "Save for my space")}
        </button>
        <button type="button" onClick={onCancel} className="type-small min-h-10 rounded-[10px] px-3 text-link hover:bg-fill">
          {t("Annuler", "Cancel")}
        </button>
        {savedRow && (
          <button type="button" disabled={busy} onClick={() => call({ action: "retire", id: savedRow })} className="type-small ml-auto min-h-10 rounded-[10px] px-3 text-fail hover:bg-fill">
            {m.default ? t("Revenir à la version par défaut", "Back to default") : t("Retirer de mon espace", "Remove from my space")}
          </button>
        )}
        {!savedRow && m.default && m.once && (
          <button type="button" onClick={() => (setTitle(m.default!.title), setText(m.default!.instruction))} className="type-small ml-auto min-h-10 rounded-[10px] px-3 text-link hover:bg-fill">
            {t("Reprendre la version par défaut", "Use the default text")}
          </button>
        )}
      </div>
    </div>
  );
}
