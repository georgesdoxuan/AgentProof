// Finished audits whose card the user already opened: a cookie (no table, no migration) listing their ids, newest
// first. The sidebar (lib/sidebar.ts) skips them, so a green « Terminé » card never comes back once clicked, even
// after a reload. It follows the browser, not the account: enough, since a card only lives half an hour.
export const SEEN_COOKIE = "ap_seen";
const KEEP = 40; // ids kept (36 characters each): far more than the cards a half hour can show

export const parseSeen = (raw: string | undefined) => new Set((raw ?? "").split(".").filter(Boolean));

// Client side: add one audit to the list (a click on its card, or its report opened once finished).
export function markSeen(id: string) {
  if (typeof document === "undefined") return;
  const raw = document.cookie.split("; ").find((c) => c.startsWith(`${SEEN_COOKIE}=`))?.slice(SEEN_COOKIE.length + 1);
  const ids = [id, ...[...parseSeen(raw)].filter((x) => x !== id)].slice(0, KEEP);
  document.cookie = `${SEEN_COOKIE}=${ids.join(".")}; path=/; max-age=2592000; samesite=lax`;
}
