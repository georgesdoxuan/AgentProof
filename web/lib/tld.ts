// A domain's extension: ".com", ".fr", ".co.uk"… Subdomains (www., shop.) are ignored.
// ponytail: a short list of second-level labels, not the full Public Suffix List; add a label here if a site shows ".uk" alone.
const SECOND_LEVEL = new Set(["co", "com", "net", "org", "gov", "gouv", "edu", "ac", "ne", "or", "go", "gob", "nic"]);

export function domainExt(domain: string): string {
  const labels = domain.toLowerCase().replace(/\.$/, "").split(".");
  if (labels.length < 2) return "";
  const last = labels[labels.length - 1];
  const compound = labels.length > 2 && last.length === 2 && SECOND_LEVEL.has(labels[labels.length - 2]);
  return "." + labels.slice(compound ? -2 : -1).join(".");
}
