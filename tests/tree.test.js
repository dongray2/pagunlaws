import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  DISCLAIMER,
  SCOPE_MESSAGE,
  isChecked,
  laneIsDim,
  present,
  quoteableDate,
  sanitizeModelResult,
  storedText,
} from "../site/tree.js";

const record = JSON.parse(readFileSync(new URL("../data/record.json", import.meta.url), "utf8"));

test("topics start with All Laws and include loss and restoration after transfer", () => {
  assert.equal(record.topics[0].label, "All Laws");
  assert.deepEqual(
    record.topics.map((topic) => topic.label),
    [
      "All Laws",
      "Concealed carry",
      "Open carry",
      "Defensive gun use",
      "Hunting gun use",
      "Buying, selling, gifting, inheriting",
      "Loss and restoration of gun rights",
      "Owning NFA items",
      "Transportation",
      "Philadelphia",
      "Preemption and supremacy",
    ],
  );
});

test("Article I, Section 21 is on every curated walk", () => {
  const right = record.moments.find((moment) => moment.id === "pa-article-i-21");
  const curated = record.topics.filter((topic) => topic.id !== "all").map((topic) => topic.id);
  assert.deepEqual(right.walks, curated);
});

test("loss and restoration holds the disability and the restoration proceeding", () => {
  const ids = record.moments
    .filter((moment) => moment.walks.includes("rights"))
    .map((moment) => moment.id);
  assert.ok(ids.includes("pa-article-i-21"));
  assert.ok(ids.includes("persons-not-to-possess"));
  assert.ok(ids.includes("restoration-prior-laws"));
  assert.ok(ids.includes("federal-firearms-disability"));
});

test("an unchecked moment is not quoteable and a topic walk with none checked is not loaded", () => {
  for (const moment of record.moments) {
    assert.equal(isChecked(moment), false);
    assert.equal(quoteableDate(moment), null);
    assert.equal(storedText(moment), null);
  }
  const view = present(record, { kind: "topic", id: "rights" });
  assert.equal(view.unloaded, true);
  assert.equal(view.moments.length, 0);
  assert.equal(laneIsDim(record, view.activeIds, "possess"), true);
});

test("All Laws lists every moment and does not dim a lane that has one", () => {
  const view = present(record, { kind: "topic", id: "all" });
  assert.equal(view.moments.length, record.moments.length);
  assert.equal(view.unloaded, false);
  assert.equal(laneIsDim(record, view.activeIds, "possess"), false);
});

test("the model cannot add a law to the pane or keep an unknown id", () => {
  const before = record.moments.map((moment) => moment.text);
  const clean = sanitizeModelResult(record, {
    momentIds: ["persons-not-to-possess", "no-such-law", "persons-not-to-possess"],
    outside: [{ name: "A city ordinance", why: "The paste regulates storage." }],
    guide: [
      {
        heading: "Runs into",
        momentIds: ["persons-not-to-possess", "no-such-law"],
        prose: "The paste runs into the possession disability.",
      },
      { heading: "Verdict", momentIds: ["persons-not-to-possess"], prose: "Guilty." },
    ],
  });
  assert.deepEqual(clean.momentIds, ["persons-not-to-possess"]);
  assert.equal(clean.outside[0].name, "A city ordinance");
  assert.equal(clean.guide.length, 1);
  assert.equal(clean.guide[0].heading, "Runs into");
  const view = present(record, { kind: "ai", ...clean });
  assert.equal(view.moments[0].id, "persons-not-to-possess");
  assert.equal(storedText(view.moments[0]), null);
  assert.deepEqual(
    record.moments.map((moment) => moment.text),
    before,
  );
  assert.match(SCOPE_MESSAGE, /outside the scope of this site/);
  assert.match(DISCLAIMER, /not legal advice/);
});
