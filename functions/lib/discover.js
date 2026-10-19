import { grokText, parseJsonObject } from "./grok.js";
import { RUN_LIMIT, addCandidates, applyFinding, knownKeys } from "./review.js";

const WEB = [{ type: "web_search" }];

export const CHAPTER_61_URL = "https://www.legis.state.pa.us/WU01/LI/LI/CT/HTM/18/00.061..HTM";

export function sectionsFromChapter(html) {
  const text = String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#xA;/gi, " ")
    .replace(/&amp;/gi, "&");
  const seen = new Set();
  const sections = [];
  const pattern = /(?:^|\n)\s*(\d{4}(?:\.\d+)?)\.\s+([^\n]+)/g;
  let match;
  while ((match = pattern.exec(text))) {
    const number = match[1];
    const major = Number(number.split(".")[0]);
    if (major < 6101 || major > 6199 || seen.has(number)) continue;
    const title = match[2].replace(/\s+/g, " ").trim().replace(/\.$/, "");
    if (!title) continue;
    seen.add(number);
    sections.push({ number, title });
  }
  return sections;
}

export async function chapterCandidates() {
  const response = await fetch(CHAPTER_61_URL);
  if (!response.ok) throw new Error("The consolidated firearms chapter could not be opened.");
  const sections = sectionsFromChapter(await response.text());
  if (sections.length === 0) throw new Error("The consolidated firearms chapter did not list any sections.");
  return sections.map((section) => ({
    title: `18 Pa.C.S. § ${section.number}. ${section.title}`,
    citation: `18 Pa.C.S. § ${section.number}`,
    why: "Listed in 18 Pa.C.S. Chapter 61, Firearms and Other Dangerous Articles, on the General Assembly site.",
    sourceUrl: CHAPTER_61_URL,
  }));
}

export async function scout(apiKey, record, queue) {
  const seeded = addCandidates(queue, record, await chapterCandidates());
  if (seeded.queue.items.length >= RUN_LIMIT) return seeded;
  const known = [...knownKeys(record, seeded.queue)];
  const room = RUN_LIMIT - seeded.queue.items.length;
  const input = [
    "You are finding Pennsylvania firearms legislation that is not already in a record.",
    "The first source has already been read: the Pennsylvania Consolidated Statutes, Title 18, Chapter 61, Firearms and Other Dangerous Articles, on the General Assembly site.",
    "Do not repeat a section from that chapter. It is already on the known list.",
    "After that chapter, search for other enacted Pennsylvania firearms provisions, constitutional provisions about bearing arms, and appellate decisions that limit those statutes.",
    "Do not include a bill that never became law.",
    "Do not include 23 Pa.C.S. § 6105. That section is not the firearms disability.",
    "The LRB book Pennsylvania Laws Relating to Firearms may help you find a provision. It is not the source for text or for an effective date.",
    `Return at most ${room} items that are absent from the known list.`,
    "Reply with one JSON object and nothing else:",
    '{"items":[{"title":"","citation":"","why":""}]}',
    `Known: ${JSON.stringify(known)}`,
  ].join("\n");
  const text = await grokText(apiKey, input, WEB);
  const parsed = parseJsonObject(text);
  const items = Array.isArray(parsed.items) ? parsed.items : [];
  const more = addCandidates(seeded.queue, record, items);
  return { queue: more.queue, added: seeded.added + more.added };
}

export async function researchItem(apiKey, record, item) {
  const lanes = (record.lanes || []).map((lane) => lane.id).join(", ");
  const topics = (record.topics || []).map((topic) => topic.id).filter((id) => id !== "all").join(", ");
  const input = [
    "You are researching one Pennsylvania firearms law for a record a lawyer will review.",
    "Search the web and open an official page before you mark any field verified.",
    "Official pages are the General Assembly compiled statutes, the Laws of Pennsylvania or the slip law, the official constitution, or the court opinion. Federal text, when it changes the Pennsylvania question, comes from govinfo, the House Office of the Law Revision Counsel, Congress, or the Supreme Court.",
    "Verified means you opened that page and copied. If you did not open it, the verified flag is false and the text is empty.",
    "Do not invent a quotation. Do not treat an approval or enactment date as the effective date.",
    "The effective date is the session law's effective-date clause, or the adoption date of a constitution, or the date of a decision.",
    "If you only found an approval date, set dateKind to approval and say it is not the day the law began to bind.",
    "If you did not read the clause, set dateKind to unchecked, dateVerified to false, and leave the effective statement empty.",
    `Lanes: ${lanes}.`,
    `Walks: ${topics}.`,
    "Reply with one JSON object and nothing else:",
    '{"title":"","titleVerified":false,"citation":"","citationVerified":false,"text":"","textVerified":false,"sourceUrl":"","effectiveStatement":"","dateKind":"unchecked","dateVerified":false,"sort":"","whatChanged":"","lane":"","walks":[],"status":"not_yet_checked","notes":""}',
    "status is one of in_force, superseded, not_yet_checked, limited_by_court.",
    "sort is the four-digit year of the checked date, or empty.",
    "If the item includes a sourceUrl, open that official page first.",
    `Item: ${JSON.stringify({ title: item.title, citation: item.citation, why: item.why, sourceUrl: item.sourceUrl || "" })}`,
  ].join("\n");
  const text = await grokText(apiKey, input, WEB);
  const parsed = parseJsonObject(text);
  return applyFinding(item, parsed, record);
}
