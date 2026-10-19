import { grokText, parseJsonObject } from "./grok.js";
import { RUN_LIMIT, addCandidates, applyFinding, knownKeys } from "./review.js";

export const FURTHER_BATCH = 15;

const WEB = [{ type: "web_search" }];

export const CHAPTER_61_URL = "https://www.legis.state.pa.us/WU01/LI/LI/CT/HTM/18/00.061..HTM";

const MONTHS = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5,
  jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9,
  oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};

export function sessionLawsFromChapter(html) {
  const text = String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/&#167;|&#xA7;/gi, "§")
    .replace(/&nbsp;|&#xA;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");
  const marks = [];
  const heading = /§\s*(6\d{3}(?:\.\d+)?)(?=\.\s+[A-Z])/g;
  const act = /([A-Z][a-z]+\.?\s+\d{1,2},\s+\d{4})(?:,\s*(\d+(?:st|nd|rd|th)\s+Sp\.?\s*Sess\.?))?\s*,\s*P\.L\.\s*(\d+)\s*,\s*No\.\s*(\d+)/g;
  let match;
  while ((match = heading.exec(text))) {
    const number = match[1];
    const major = Number(number.split(".")[0]);
    if (major < 6101 || major > 6199) continue;
    marks.push({ at: match.index, section: number });
  }
  while ((match = act.exec(text))) {
    const when = actDate(match[1]);
    if (!when) continue;
    marks.push({
      at: match.index,
      ...when,
      date: match[1],
      session: match[2] ? match[2].replace(/\s+/g, " ") : "",
      pl: match[3],
      number: match[4],
    });
  }
  marks.sort((a, b) => a.at - b.at);
  let section = "";
  const acts = new Map();
  for (const mark of marks) {
    if (mark.section) {
      section = mark.section;
      continue;
    }
    const key = `${mark.year}|${mark.session.toLowerCase()}|${mark.pl}|${mark.number}`;
    const row = acts.get(key) || {
      year: mark.year,
      month: mark.month,
      day: mark.day,
      citation: actCitation(mark),
      sections: [],
    };
    if (section && !row.sections.includes(section)) row.sections.push(section);
    acts.set(key, row);
  }
  return [...acts.values()].sort((a, b) => a.year - b.year || a.month - b.month || a.day - b.day || a.citation.localeCompare(b.citation));
}

function actDate(dateText) {
  const match = dateText.match(/^([A-Za-z]+)\.?\s+(\d{1,2}),\s+(\d{4})$/);
  if (!match) return null;
  const month = MONTHS[match[1].toLowerCase()];
  if (!month) return null;
  return { year: Number(match[3]), month, day: Number(match[2]) };
}

function actCitation(act) {
  const session = act.session ? `, ${act.session}` : "";
  return `Act of ${act.date}${session}, P.L. ${act.pl}, No. ${act.number}`;
}

export async function chapterCandidates() {
  const response = await fetch(CHAPTER_61_URL);
  if (!response.ok) throw new Error("The consolidated firearms chapter could not be opened.");
  const acts = sessionLawsFromChapter(await response.text());
  if (acts.length === 0) throw new Error("The consolidated firearms chapter did not list any session laws.");
  return acts.map((act) => {
    const where = act.sections.length ? `§ ${act.sections.join(", § ")}` : "Chapter 61";
    return {
      title: act.citation,
      citation: act.citation,
      why: `Credited on 18 Pa.C.S. Chapter 61 at ${where}. Open this act in the Laws of Pennsylvania. The compiled section is not the text of the act.`,
    };
  });
}

export async function seedChapter(record, queue) {
  const seeded = addCandidates(queue, record, await chapterCandidates());
  seeded.queue.further = seeded.queue.items.length > 0 ? "pending" : "idle";
  return seeded;
}

export async function scoutFurther(apiKey, record, queue) {
  const room = Math.min(FURTHER_BATCH, RUN_LIMIT - queue.items.length);
  if (room <= 0) return { queue, added: 0 };
  const known = [...knownKeys(record, queue)];
  const input = [
    "You are finding Pennsylvania firearms legislation that is not already in a record.",
    "The session laws credited on Title 18, Chapter 61 have already been read from the General Assembly site. Each of those acts is one item, even where the act changed several sections.",
    "Do not repeat an act on the known list. Do not return a current compiled section as an item.",
    "After those acts, search the Laws of Pennsylvania for other firearms session laws that are not already known, including acts from before the 1972 codification. A constitutional provision about bearing arms, or an appellate decision that limits one of these laws, may also be an item.",
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
  const items = (Array.isArray(parsed.items) ? parsed.items : []).slice(0, room);
  return addCandidates(queue, record, items);
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
    "When the item is an act, open that act in the Laws of Pennsylvania or the slip law. Copy from the act. The current compiled section is not the text of the act.",
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
