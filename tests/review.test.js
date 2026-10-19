import assert from "node:assert/strict";
import test from "node:test";
import { isChecked, quoteableDate } from "../site/tree.js";
import { sectionsFromChapter } from "../functions/lib/discover.js";
import {
  REVIEW_FIRST,
  RUN_LIMIT,
  addCandidates,
  applyEdits,
  applyFinding,
  canStartRun,
  decide,
  emptyQueue,
  publicMoments,
  sanitizeFinding,
} from "../functions/lib/review.js";

const record = {
  topics: [
    { id: "all", label: "All Laws" },
    { id: "concealed", label: "Concealed carry" },
    { id: "rights", label: "Loss and restoration of gun rights" },
  ],
  lanes: [
    { id: "right", label: "The right" },
    { id: "possess", label: "Who may possess" },
  ],
  moments: [
    {
      id: "persons-not-to-possess",
      title: "Persons not to possess firearms",
      citation: "18 Pa.C.S. § 6105",
    },
  ],
};

const official = "https://www.legis.state.pa.us/WU01/LI/LI/CT/HTM/18/00.061.006.000..HTM";

function verifiedFinding() {
  return {
    title: "Firearms not to be carried without a license",
    titleVerified: true,
    citation: "18 Pa.C.S. § 6106",
    citationVerified: true,
    text: "Except as provided, no person shall carry a firearm concealed.",
    textVerified: true,
    sourceUrl: official,
    effectiveStatement: "This act shall take effect in 60 days.",
    dateKind: "effective",
    dateVerified: true,
    sort: "1995",
    whatChanged: "The license offense.",
    lane: "possess",
    walks: ["concealed"],
    status: "in_force",
    notes: "Read on the General Assembly site.",
  };
}

test("a new run cannot start while anything is waiting", () => {
  const empty = emptyQueue();
  assert.equal(canStartRun(empty), true);
  const waiting = addCandidates(empty, record, [{ title: "A new act", citation: "Act 1" }]).queue;
  assert.equal(canStartRun(waiting), false);
  assert.match(REVIEW_FIRST, /cannot be completed/);
  assert.match(REVIEW_FIRST, /not on the public record/);
});

test("the consolidated chapter list is the first source", () => {
  const html = [
    "<p><b>Sec.</b></p>",
    "<p>6106. &nbsp;Firearms not to be carried without a license.</p>",
    "<p>1972. &nbsp;Not a section.</p>",
    "<p>6106. &nbsp;A later mention is not a second section.</p>",
    "<p>6105.1. &nbsp;Restoration of firearm rights for offenses under prior laws of this Commonwealth.</p>",
  ].join("\n");
  const sections = sectionsFromChapter(html);
  assert.deepEqual(sections, [
    { number: "6106", title: "Firearms not to be carried without a license" },
    { number: "6105.1", title: "Restoration of firearm rights for offenses under prior laws of this Commonwealth" },
  ]);
  const { queue } = addCandidates(emptyQueue(), record, [
    {
      title: "18 Pa.C.S. § 6106. Firearms not to be carried without a license",
      citation: "18 Pa.C.S. § 6106",
      sourceUrl: "https://www.legis.state.pa.us/WU01/LI/LI/CT/HTM/18/00.061..HTM",
    },
    {
      title: "A blog",
      citation: "18 Pa.C.S. § 6107",
      sourceUrl: "https://example.com/notes",
    },
  ]);
  assert.equal(queue.items[0].sourceUrl, "https://www.legis.state.pa.us/WU01/LI/LI/CT/HTM/18/00.061..HTM");
  assert.equal(queue.items[1].sourceUrl, "");
  assert.equal(queue.items[0].citation, "18 Pa.C.S. § 6106");
});

test("the scout stops at 100 and skips laws already in the record", () => {
  const candidates = [{ title: "Persons not to possess firearms", citation: "18 Pa.C.S. § 6105" }];
  for (let i = 0; i < 120; i += 1) candidates.push({ title: `Act ${i}`, citation: `Act ${i} of 2024` });
  const { queue, added } = addCandidates(emptyQueue(), record, candidates);
  assert.equal(added, RUN_LIMIT);
  assert.equal(queue.items.length, RUN_LIMIT);
  assert.equal(queue.items.some((item) => item.citation === "18 Pa.C.S. § 6105"), false);
});

test("unofficial text is not treated as verified", () => {
  const clean = sanitizeFinding({
    ...verifiedFinding(),
    sourceUrl: "https://example.com/gun-blog",
    textVerified: true,
    dateVerified: true,
  }, record);
  assert.equal(clean.text, "");
  assert.equal(clean.textVerified, false);
  assert.equal(clean.dateVerified, false);
  assert.equal(clean.dateKind, "unchecked");
});

test("a verified field cannot be edited", () => {
  const item = applyFinding({ id: "license", title: "old", reviewStatus: "identified" }, verifiedFinding(), record);
  assert.throws(
    () => applyEdits(item, { title: "A different title" }),
    /cannot be edited/,
  );
  const edited = applyEdits(item, { whatChanged: "The license standard changed." });
  assert.equal(edited.whatChanged, "The license standard changed.");
  assert.equal(edited.title, item.title);
});

test("approval puts a checked moment on the record and leaves a rejected one off", () => {
  let queue = addCandidates(emptyQueue(), record, [
    { title: "Firearms not to be carried without a license", citation: "18 Pa.C.S. § 6106" },
    { title: "Some other bill", citation: "House Bill 1" },
  ]).queue;
  queue.items[0] = applyFinding(queue.items[0], verifiedFinding(), record);
  const approved = decide(queue, record, { id: queue.items[0].id, type: "approve" });
  const rejected = decide(approved.queue, record, { id: approved.queue.items[0].id, type: "reject" });
  const moments = publicMoments(record, rejected.queue);
  assert.equal(moments.some((moment) => moment.id === approved.moment.id), true);
  assert.equal(moments.some((moment) => moment.title === "Some other bill"), false);
  assert.equal(rejected.queue.items.length, 0);
  assert.equal(canStartRun(rejected.queue), true);
  assert.equal(isChecked(approved.moment), true);
  assert.equal(quoteableDate(approved.moment).kind, "effective");
});

test("an approved law with an unread date is not quoted", () => {
  let queue = addCandidates(emptyQueue(), record, [{ title: "An uncited change", citation: "" }]).queue;
  queue.items[0] = applyFinding(queue.items[0], {
    title: "An uncited change",
    sourceUrl: official,
    dateVerified: false,
    textVerified: false,
  }, record);
  const result = decide(queue, record, { id: queue.items[0].id, type: "approve" });
  assert.equal(isChecked(result.moment), false);
  assert.equal(quoteableDate(result.moment), null);
  assert.equal(result.moment.effectiveStatement.includes("Do not quote a date"), true);
  assert.equal(publicMoments(record, { items: queue.items, rejected: [], approved: [] }).some((moment) => moment.title === "An uncited change"), false);
});
