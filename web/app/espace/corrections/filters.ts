// Shared by page.tsx (server) and board.tsx (client): plain values only, a "use client" module cannot export them.
export const CORRECTIONS_COOKIE = "ap_corrections";

export type Meta = {
  id: string;
  kind: "journey" | "payment";
  site: string; // site key
  siteLabel: string;
  device: string;
  label: string;
  impact: number;
  missions: number;
  status: "todo" | "back" | "check" | "done";
  at: string;
  text: string; // folded search text
  csv: string[]; // the row as exported, in the order of L.csvHead
};

export type Filters = {
  status: "open" | "check" | "done" | "all";
  site: string;
  kind: string;
  impact: string;
  device: string;
  period: string;
  sort: "impact" | "date" | "site";
  group: boolean;
};
export const DEFAULT_FILTERS: Filters = { status: "open", site: "all", kind: "all", impact: "all", device: "all", period: "all", sort: "impact", group: false };

export type Labels = {
  status: Record<Filters["status"], string>;
  statusLabel: string;
  site: string;
  allSites: string;
  kind: string;
  allKinds: string;
  kinds: Record<"journey" | "payment", string>;
  impact: string;
  allImpacts: string;
  impacts: Record<"3" | "2" | "1" | "0", string>;
  device: string;
  allDevices: string;
  devices: Record<"desktop" | "mobile", string>;
  period: string;
  periods: Record<"all" | "7d" | "30d", string>;
  sort: string;
  sorts: Record<Filters["sort"], string>;
  group: string;
  search: string;
  reset: string;
  export: string;
  exportDone: string;
  emptyTitle: string;
  csvHead: string[];
  countOne: string; // "{n} correction"
  countMany: string;
  filtersLabel: string;
};

