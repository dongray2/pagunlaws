import { grokText, parseJsonObject } from "./grok.js";
import { RUN_LIMIT, addCandidates, applyFinding, knownKeys } from "./review.js";

const WEB = [{ type: "web_search" }];

export async function scout(apiKey, record, queue) {
  const known = [...knownKeys(record, queue)];
  const input = [
    "You are finding Pennsylvania firearms legislation that is not already in a record.",
    "Use what you know, search the web, and open the Pennsylvania General Assembly site and the Laws of Pennsylvania.",
    "Include enacted statutes, constitutional provisions about bearing arms, and appellate decisions that limit those statutes.",
    "Do not include a bill that never became law.",
    "Do not include 23 Pa.C.S. § 6105. That section is not the firearms disability.",
    "The LRB book Pennsylvania Laws Relating to Firearms may help you find a provision. It is not the source for text or for an effective date.",
    `Return at most ${RUN_LIMIT} items that are absent from the known list.`,
    "Reply with one JSON object and nothing else:",
    '{"items":[{"title":"","citation":"","why":""}]}',
    `Known: ${JSON.stringify(known)}`,
  ].join("\n");
  const text = await grokText(apiKey, input, WEB);
  const parsed = parseJsonObject(text);
  const items = Array.isArray(parsed.items) ? parsed.items : [];
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
    "If you only found an approval date, set dateKind to approval and say it is not the day the law began to bind.",
    "If you did not read the clause, set dateKind to unchecked, dateVerified to false, and leave the effective statement empty.",
    `Lanes: ${lanes}.`,
    `Walks: ${topics}.`,
    "Reply with one JSON object and nothing else:",
    '{"title":"","titleVerified":false,"citation":"","citationVerified":false,"text":"","textVerified":false,"sourceUrl":"","effectiveStatement":"","dateKind":"unchecked","dateVerified":false,"sort":"","whatChanged":"","lane":"","walks":[],"status":"not_yet_checked","notes":""}',
    "status is one of in_force, superseded, not_yet_checked, limited_by_court.",
    "sort is the four-digit year of the checked date, or empty.",
    `Item: ${JSON.stringify({ title: item.title, citation: item.citation, why: item.why })}`,
  ].join("\n");
  const text = await grokText(apiKey, input, WEB);
  const parsed = parseJsonObject(text);
  return applyFinding(item, parsed, record);
}
