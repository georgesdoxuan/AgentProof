"use client";
import { type RefObject, useEffect, useId, useMemo, useRef, useState } from "react";
import type { Lang } from "@/lib/i18n";
import type { PickItem } from "@/lib/missions";
import { Hint } from "@/lib/hint";
import { GLYPH, Glyph } from "@/lib/glyphs";
import { estimateMinutes, minutesLabel, type PaceRange } from "@/lib/estimate-shared";

// Mission picker of the launch form: tick defaults, edit one for this audit or for the team, add the team's own.
// Sends the pick as JSON in a hidden "missions" field; /api/audits checks every id and every text again.
const TITLE = [3, 60];
const TEXT = [20, 600];
const EDIT_ICON = "M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4";

type Pace = { desktop: PaceRange; mobile: PaceRange; queued: number };

// What the rest of the form multiplies: both devices, a competitor or the model comparison each play the missions twice.
function useLaunchShape(ref: RefObject<HTMLElement | null>) {
  const [shape, setShape] = useState({ device: "desktop", times: 1, pay: 0 });
  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    const sync = () => {
      const f = new FormData(form);
      const device = String(f.get("device") ?? "desktop");
      const linked = String(f.get("competitor") ?? "").trim() !== "" || f.get("models") === "1";
      // A real payment test costs 2 credits on top (lib/credits.ts RATES.payment).
      const pay = f.get("mode") === "payment" || f.get("payment") === "1" ? 2 : 0;
      const next = { device, times: f.get("mode") === "payment" ? 0 : (device === "both" ? 2 : 1) * (linked ? 2 : 1), pay };
      // Same shape, same state: a fresh object on every keystroke re-renders before React's onChange and undoes the typing.
      setShape((s) => (s.device === next.device && s.times === next.times && s.pay === next.pay ? s : next));
    };
    sync();
    form.addEventListener("input", sync);
    form.addEventListener("change", sync);
    return () => {
      form.removeEventListener("input", sync);
      form.removeEventListener("change", sync);
    };
  }, [ref]);
  return shape;
}

// A team's saved mission list: { key } for a listed mission, { title, text, base_id? } for one written for the list.
export type ListEntry = { key: string } | { title: string; text: string; base_id?: number };
export type SavedList = { id: number; name: string; items: ListEntry[] };

// Pop-up button look for the native <select>, as in espace/controls.tsx.
const popUp =
  "h-9 min-w-0 max-w-full cursor-pointer appearance-none truncate rounded-[8px] bg-fill bg-[length:10px] bg-[right_10px_center] bg-no-repeat pl-3 pr-8 type-small font-semibold text-ink transition-colors hover:bg-line/60 focus-visible:outline-2 focus-visible:outline-blue";
const popUpChevrons = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 14'%3E%3Cpath d='M2 5l3-3 3 3M2 9l3 3 3-3' fill='none' stroke='%2386868b' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
};

// What a list keeps of the current pick, in pick order.
const toEntries = (picked: PickItem[]): ListEntry[] =>
  picked.map((m) => (m.id && !m.once ? { key: m.key } : { title: m.title, text: m.instruction, ...(m.default ? { base_id: m.base_id ?? m.id! } : {}) }));
const sameEntries = (a: ListEntry[], b: ListEntry[]) => {
  const norm = (l: ListEntry[]) => l.map((e) => JSON.stringify("key" in e ? [e.key] : [e.title, e.text, e.base_id ?? null])).sort().join("|");
  return norm(a) === norm(b);
};

export function MissionPicker({ items: initial, lists: initialLists, lang, max, pace }: { items: PickItem[]; lists: SavedList[]; lang: Lang; max: number; pace: Pace }) {
  const t = (fr: string, en: string) => (lang === "en" ? en : fr);
  const [items, setItems] = useState(initial);
  // The team's saved missions as listed (no one-off change), to rebuild the pick when a list is applied.
  const [catalog, setCatalog] = useState(() => initial.map((m) => ({ ...m, checked: false })));
  const defaultKeys = useMemo(() => new Set(initial.filter((m) => m.checked).map((m) => m.key)), [initial]);
  const [lists, setLists] = useState(initialLists);
  const [active, setActive] = useState<number | null>(null); // applied list, null: the default pick
  const [missing, setMissing] = useState(0); // missions of the applied list that no longer exist
  const [editing, setEditing] = useState<number | null>(null); // index in items
  const [error, setError] = useState("");
  const boxRef = useRef<HTMLDetailsElement>(null);
  const picked = items.filter((m) => m.checked);
  const n = picked.length;
  const shape = useLaunchShape(boxRef);
  const runs = n * shape.times;
  const credits = runs + shape.pay;
  // The slower device sets the pace when both play.
  const minutes = estimateMinutes(runs, shape.device === "desktop" ? pace.desktop : pace.mobile, pace.queued);

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
  const merge = (fresh: PickItem[], savedId?: number) => {
    setCatalog(fresh.map((m) => ({ ...m, checked: false })));
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
  };

  // Apply a saved list (or the default pick): its missions come ticked, the others unticked; one-offs come back.
  const apply = (id: number | null) => {
    setError("");
    setEditing(null);
    setActive(id);
    const list = lists.find((l) => l.id === id);
    if (!list) {
      setMissing(0);
      setItems(catalog.map((m) => ({ ...m, checked: defaultKeys.has(m.key) })));
      return;
    }
    const keys = new Set(list.items.flatMap((e) => ("key" in e ? [e.key] : [])));
    let next = catalog.map((m) => ({ ...m, checked: keys.has(m.key) }));
    let lost = [...keys].filter((k) => !catalog.some((m) => m.key === k)).length;
    list.items.forEach((e, i) => {
      if ("key" in e) return;
      const at = e.base_id ? next.findIndex((m) => m.key === `d${e.base_id}`) : -1;
      if (e.base_id && at < 0) return void lost++;
      const once = { title: e.title, label: e.title, instruction: e.text, once: true, checked: true };
      if (at >= 0) next = next.map((m, k) => (k === at ? { ...m, ...once } : m));
      else next = [...next, { key: `n${list.id}-${i}`, id: null, base_id: null, default: null, icon: EDIT_ICON, team: true, ...once }];
    });
    setMissing(lost);
    setItems(next);
  };

  const add = () => {
    // On top, right under the button: the editor opens where the click was.
    setItems((all) => [{ key: `n${Date.now()}`, id: null, base_id: null, title: "", label: "", instruction: "", default: null, icon: EDIT_ICON, team: true, once: true, checked: true }, ...all]);
    setEditing(0);
    if (boxRef.current) boxRef.current.open = true;
  };

  return (
    <details ref={boxRef} className="group/m rounded-[12px] bg-bg-2 dark:bg-[#2c2c2e]">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2 [&::-webkit-details-marker]:hidden">
        <Hint
          focusable={false}
          tip={t(
            `Coche les missions à jouer (${max} au plus). Le score se calcule sur les missions choisies. Un concurrent ou Ordinateur + Mobile rejoue les mêmes missions, ce qui double les crédits.`,
            `Tick the missions to run (${max} at most). The score is computed on the chosen missions. A competitor or Desktop + Mobile replays the same missions, which doubles the credits.`,
          )}
        >
          <span className="type-small font-semibold">{t("Missions", "Missions")}</span>
        </Hint>
        <span className="type-small flex items-center gap-2 text-ink-2" aria-live="polite">
          {n ? (
            <span className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 tabular-nums">
              <span>{t(`${n} mission${n > 1 ? "s" : ""}`, `${n} mission${n > 1 ? "s" : ""}`)}</span>
              <span className="inline-flex items-center gap-1" title={t("Durée estimée, d’après les derniers audits", "Estimated time, from the latest audits")}>
                <Glyph d={GLYPH.clock} className="h-[15px] w-[15px]" />
                {minutesLabel(minutes)}
              </span>
              <span
                className="inline-flex items-center gap-1"
                title={t(`${credits} crédits, jusqu’à ${credits + runs} si des missions ratées sont rejouées`, `${credits} credits, up to ${credits + runs} if failed missions are replayed`)}
              >
                <Glyph d={GLYPH.credit} className="h-[15px] w-[15px]" />
                {t(`${credits} crédit${credits > 1 ? "s" : ""}`, `${credits} credit${credits > 1 ? "s" : ""}`)}
              </span>
            </span>
          ) : (
            <span className="font-semibold text-fail">{t("Aucune mission", "No mission")}</span>
          )}
          <svg viewBox="0 0 12 12" className="h-3 w-3 shrink-0 transition-transform duration-200 group-open/m:rotate-180 motion-reduce:transition-none" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M1.5 4L6 8.5 10.5 4" />
          </svg>
        </span>
      </summary>
      <input type="hidden" name="missions" value={value} />
      <div className="grid gap-3 px-2 pb-3 sm:px-3">
        <Lists
          lang={lang}
          lists={lists}
          active={active}
          current={toEntries(picked)}
          busy={editing !== null}
          onApply={apply}
          onChange={(fresh, id) => {
            setLists(fresh);
            if (id === undefined) apply(null);
            else setActive(id);
          }}
        />
        {missing > 0 && (
          <p role="status" className="type-small px-2 text-ink-2">
            {t(
              `${missing} mission${missing > 1 ? "s" : ""} de cette liste n’existe${missing > 1 ? "nt" : ""} plus dans l’espace.`,
              `${missing} mission${missing > 1 ? "s" : ""} of this list ${missing > 1 ? "are" : "is"} no longer in the space.`,
            )}
          </p>
        )}
        <ul className="overflow-hidden rounded-[12px] bg-tile">
          {/* First row of the list: the new mission's editor opens right under it. */}
          <li className="border-b border-hairline px-1 py-1 sm:px-2">
            <button type="button" onClick={add} disabled={editing !== null} className="type-small inline-flex min-h-10 items-center gap-2 rounded-[8px] px-2 font-semibold text-link hover:bg-fill disabled:opacity-40">
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                <path d="M12 5v14M5 12h14" />
              </svg>
              {t("Ajouter une mission", "Add a mission")}
            </button>
          </li>
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
      </div>
    </details>
  );
}

// "My lists": pick a saved list, save the current pick as a new list, update, rename or delete the applied one.
function Lists({
  lang,
  lists,
  active,
  current,
  busy: editing,
  onApply,
  onChange,
}: {
  lang: Lang;
  lists: SavedList[];
  active: number | null;
  current: ListEntry[];
  busy: boolean;
  onApply: (id: number | null) => void;
  onChange: (lists: SavedList[], id?: number) => void;
}) {
  const t = (fr: string, en: string) => (lang === "en" ? en : fr);
  const [mode, setMode] = useState<null | "new" | "rename" | "delete">(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const nameId = useId();
  const list = lists.find((l) => l.id === active);
  const dirty = !!list && !sameEntries(list.items, current);
  const call = async (body: object) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/mission-lists", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onChange(data.lists, data.id);
      setMode(null);
    } catch (e) {
      setError((e as Error).message || t("Enregistrement impossible.", "Could not save."));
    } finally {
      setBusy(false);
    }
  };
  const open = (m: "new" | "rename" | "delete") => {
    setError("");
    setName(m === "rename" && list ? list.name : "");
    setMode(m);
  };
  const link = "type-small inline-flex min-h-9 items-center rounded-[8px] px-2 font-semibold text-link hover:bg-tile disabled:opacity-40";
  const btn = "btn min-h-9 px-4 text-[15px] disabled:opacity-40";

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
        <div className="contents">
          <select
            aria-label={t("Liste de missions", "Mission list")}
            value={active ?? ""}
            disabled={editing || busy}
            onChange={(e) => {
              setMode(null);
              onApply(e.target.value ? Number(e.target.value) : null);
            }}
            className={`${popUp} disabled:opacity-40`}
            style={popUpChevrons}
          >
            <option value="">{t("Sélection par défaut", "Default selection")}</option>
            {lists.length > 0 && (
              <optgroup label={t("Mes listes", "My lists")}>
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          {dirty && (
            <button type="button" disabled={busy || editing || !current.length} onClick={() => call({ action: "save", id: list!.id, items: current })} className={link}>
              {busy && mode === null ? t("Enregistrement…", "Saving…") : t("Mettre à jour", "Update")}
            </button>
          )}
          <button type="button" disabled={busy || editing || !current.length} onClick={() => open("new")} className={link} aria-expanded={mode === "new"}>
            {t("Enregistrer comme liste", "Save as list")}
          </button>
          {list && (
            <>
              <button type="button" disabled={busy || editing} onClick={() => open("rename")} className={link} aria-expanded={mode === "rename"}>
                {t("Renommer", "Rename")}
              </button>
              <button type="button" disabled={busy || editing} onClick={() => open("delete")} className={`${link} !text-fail`} aria-expanded={mode === "delete"}>
                {t("Supprimer", "Delete")}
              </button>
            </>
          )}
        </div>
      </div>
      {(mode === "new" || mode === "rename") && (
        <div className="flex flex-wrap items-end gap-2 rounded-[12px] bg-tile px-3 py-3 motion-safe:animate-[ap-fade_0.2s_ease-out] sm:px-4">
          <label htmlFor={nameId} className="grid min-w-[12rem] flex-1 gap-1.5">
            <span className="type-caption font-semibold text-ink-2">{mode === "new" ? t("Nom de la liste", "List name") : t("Nouveau nom", "New name")}</span>
            <input
              id={nameId}
              autoFocus
              value={name}
              maxLength={60}
              placeholder={t("Ex. : Parcours mobile", "E.g. Mobile journey")}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (name.trim()) call(mode === "new" ? { action: "create", name, items: current } : { action: "rename", id: list!.id, name });
                } else if (e.key === "Escape") setMode(null);
              }}
              className="h-10 rounded-[10px] bg-bg-2 px-3 outline-none ring-blue focus-visible:ring-2 dark:bg-[#2c2c2e]"
            />
          </label>
          <button type="button" disabled={busy || !name.trim()} onClick={() => call(mode === "new" ? { action: "create", name, items: current } : { action: "rename", id: list!.id, name })} className={btn}>
            {busy ? t("Enregistrement…", "Saving…") : t("Enregistrer", "Save")}
          </button>
          <button type="button" onClick={() => setMode(null)} className="type-small min-h-9 rounded-[10px] px-3 text-link hover:bg-fill">
            {t("Annuler", "Cancel")}
          </button>
        </div>
      )}
      {mode === "delete" && list && (
        <div className="flex flex-wrap items-center gap-2 rounded-[12px] bg-tile px-3 py-3 motion-safe:animate-[ap-fade_0.2s_ease-out] sm:px-4">
          <span className="type-small flex-1">{t(`Supprimer la liste « ${list.name} » pour toute l’équipe ?`, `Delete the list “${list.name}” for the whole team?`)}</span>
          <button type="button" disabled={busy} onClick={() => call({ action: "delete", id: list.id })} className={`${btn} !bg-fail`}>
            {busy ? t("Suppression…", "Deleting…") : t("Supprimer", "Delete")}
          </button>
          <button type="button" onClick={() => setMode(null)} className="type-small min-h-9 rounded-[10px] px-3 text-link hover:bg-fill">
            {t("Annuler", "Cancel")}
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="type-small px-2 font-semibold text-fail">
          {error}
        </p>
      )}
    </div>
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
    ["Produit précis", "Trouve le produit « nom ou référence », choisis une option disponible s'il en propose (taille, couleur…), ajoute-le au panier, puis va jusqu'à la première page du checkout."],
    ["Code promo", "Ajoute un article au panier, ouvre le panier, saisis le code promo BIENVENUE10 dans le champ prévu et note le message affiché, puis va jusqu'à la première page du checkout."],
    ["Retours et échanges", "Trouve la politique de retour et d'échange (délai, frais) et note ce qu'elle indique, puis ajoute un article au panier et va jusqu'à la première page du checkout."],
    ["Fiche produit", "Sur une fiche produit, trouve les caractéristiques (dimensions, matière, contenance ou guide des tailles) et note-les, ajoute l'article au panier, puis va jusqu'à la première page du checkout."],
    ["Retirer du panier", "Ajoute deux articles différents au panier, ouvre le panier, retires-en un et vérifie que le total se met à jour, puis va jusqu'à la première page du checkout."],
    ["Quantité", "Ajoute un article au panier, passe sa quantité à 2 dans le panier et vérifie que le total double, puis va jusqu'à la première page du checkout."],
    ["Livraison", "Trouve les modes, frais et délais de livraison pour la France et note-les, puis ajoute un article au panier et va jusqu'à la première page du checkout."],
    ["Commande en invité", "Ajoute un article au panier, puis va au checkout en choisissant la commande en invité si le site la propose, et note si cette option existe. Ne te connecte pas."],
    ["Option épuisée", "Sur une fiche produit, repère une option indisponible (taille, couleur, modèle…) ou un produit en rupture, choisis à la place une autre option ou un article proche disponible, ajoute-le au panier, puis va jusqu'à la première page du checkout."],
    ["Prix cohérent", "Note le prix d'un article sur sa fiche, ajoute-le au panier, vérifie que le panier affiche le même prix et note tout écart, puis va jusqu'à la première page du checkout."],
  ],
  en: [
    ["Specific product", "Find the product “name or reference”, pick an available option if it has any (size, colour…), add it to the cart, then go to the first checkout page."],
    ["Promo code", "Add an item to the cart, open the cart, enter the promo code WELCOME10 in its field and note the message shown, then go to the first checkout page."],
    ["Returns and exchanges", "Find the return and exchange policy (time limit, fees) and note what it says, then add an item to the cart and go to the first checkout page."],
    ["Product details", "On a product page, find the specifications (dimensions, material, capacity or size guide) and note them, add the item to the cart, then go to the first checkout page."],
    ["Remove from cart", "Add two different items to the cart, open the cart, remove one and check that the total updates, then go to the first checkout page."],
    ["Quantity", "Add an item to the cart, set its quantity to 2 in the cart and check that the total doubles, then go to the first checkout page."],
    ["Delivery", "Find the delivery options, costs and times for France and note them, then add an item to the cart and go to the first checkout page."],
    ["Guest checkout", "Add an item to the cart, then go to checkout choosing guest checkout if the site offers it, and note whether that option exists. Do not sign in."],
    ["Option sold out", "On a product page, spot an unavailable option (size, colour, model…) or an out-of-stock product, pick another option or a similar available item instead, add it to the cart, then go to the first checkout page."],
    ["Consistent price", "Note an item's price on its product page, add it to the cart, check the cart shows the same price and note any gap, then go to the first checkout page."],
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
