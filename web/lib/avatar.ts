// Avatar colors: spaces (square icon) and accounts (round initial) each draw from their own half of one palette,
// so an account never wears its space's color. The pick comes from a hash of a stable key (team id, e-mail):
// it looks random, never changes between visits, and needs no column in the database.
// Every color keeps white text at 4.5:1 or more, so the letter reads in light and dark mode alike.
const SPACE = ["#0071e3", "#0f7b6c", "#c2410c", "#7e3fd1", "#b4235a", "#3d6b1f"]; // brand blue first
const ACCOUNT = ["#5452d6", "#0a7aa0", "#cf2e2e", "#a35a00", "#b8329f", "#14805a"];

// FNV-1a: cheap and spreads close keys (two UUIDs, two e-mails) over the whole palette.
function hash(key: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

export const spaceColor = (teamId: string) => SPACE[hash(teamId) % SPACE.length];
export const accountColor = (email: string) => ACCOUNT[hash(email.trim().toLowerCase()) % ACCOUNT.length];
