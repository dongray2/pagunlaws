const CHAPTER_61_URL = "https://www.legis.state.pa.us/WU01/LI/LI/CT/HTM/18/00.061..HTM";

const ACT_PAGE = /^Act of [A-Za-z.]+\s+\d{1,2},\s+(\d{4})(?:,\s*(\d+)(?:st|nd|rd|th)\s+Sp\.?\s*Sess\.?)?,\s*P\.L\.\s*\d+,\s*No\.\s*(\d+)\b/;

export function sourceLinks(item) {
  const links = [];
  const seen = new Set();
  const add = (href, label, note) => {
    if (!href || seen.has(href)) return;
    seen.add(href);
    links.push({ href, label, note });
  };
  add(actPageUrl(item && item.citation), "Official act page", "General Assembly page for this act.");
  for (const section of compiledSections(item)) {
    add(
      compiledSectionUrl(section),
      `Current compiled 18 Pa.C.S. § ${section}`,
      "This is the compiled section, not the text of the act.",
    );
  }
  const stored = item && typeof item.sourceUrl === "string" ? item.sourceUrl.trim() : "";
  if (/^https:\/\//.test(stored)) add(stored, "Stored official source", "");
  const why = item && typeof item.why === "string" ? item.why : "";
  if (why.includes("18 Pa.C.S. Chapter 61")) {
    add(CHAPTER_61_URL, "Chapter 61 credit list", "This page lists the credit. It is not the text of the act.");
  }
  return links;
}

export function actPageUrl(citation) {
  const match = String(citation || "").match(ACT_PAGE);
  if (!match) return "";
  const session = match[2] ? String(Number(match[2])) : "0";
  return `https://www.palegis.us/statutes/unconsolidated/law-information?sessYr=${match[1]}&sessInd=${session}&actNum=${Number(match[3])}`;
}

export function compiledSectionUrl(section) {
  const match = String(section || "").match(/^(6\d{3})(?:\.(\d+))?$/);
  if (!match) return "";
  const major = Number(match[1]);
  if (major < 6101 || major > 6199) return "";
  const within = String(major - 6100).padStart(3, "0");
  const decimal = String(match[2] ? Number(match[2]) : 0).padStart(3, "0");
  return `https://www.legis.state.pa.us/WU01/LI/LI/CT/HTM/18/00.061.${within}.${decimal}..HTM`;
}

function compiledSections(item) {
  const found = [];
  const add = (value) => {
    if (value && !found.includes(value)) found.push(value);
  };
  const citation = item && typeof item.citation === "string" ? item.citation : "";
  const cite = citation.match(/18\s+Pa\.C\.S\.\s+§\s+(6\d{3}(?:\.\d+)?)/);
  if (cite) add(cite[1]);
  const why = item && typeof item.why === "string" ? item.why : "";
  if (why.includes("18 Pa.C.S. Chapter 61")) {
    for (const match of why.matchAll(/§\s*(6\d{3}(?:\.\d+)?)/g)) add(match[1]);
  }
  return found;
}
