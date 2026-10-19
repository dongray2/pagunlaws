import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { CHAPTER_61_URL, scoutFurther, seedChapter } from "../functions/lib/discover.js";
import { grokText } from "../functions/lib/grok.js";
import { emptyQueue, normalizeQueue } from "../functions/lib/review.js";

const record = { topics: [], lanes: [], moments: [] };

const chapterHtml = [
  "<p>Chapter 61 was added December 6, 1972, P.L.1482, No.334, effective in six months.</p>",
  "<p><b>&#167; 6106. Firearms not to be carried without a license.</b></p>",
  "<p>(Dec. 19, 1988, P.L.1275, No.158, eff. 180 days)</p>",
].join("");

test("a queue with waiting items can still look for other acts", () => {
  assert.equal(normalizeQueue({ items: [], rejected: [], approved: [] }).further, "idle");
  assert.equal(normalizeQueue({ items: [{ id: "act" }], rejected: [], approved: [] }).further, "pending");
  assert.equal(normalizeQueue({ items: [{ id: "act" }], further: "done", rejected: [], approved: [] }).further, "done");
  assert.equal(emptyQueue().further, "idle");
});

test("chapter acts are stored without calling the model", async () => {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return new Response(chapterHtml, { status: 200 });
  };
  try {
    const seeded = await seedChapter(record, emptyQueue());
    assert.deepEqual(calls, [CHAPTER_61_URL]);
    assert.equal(seeded.added, 2);
    assert.equal(seeded.queue.further, "pending");
    assert.equal(seeded.queue.items.length, 2);
  } finally {
    globalThis.fetch = original;
  }
});

test("the further search asks the model and does not open the chapter", async () => {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return new Response(JSON.stringify({
      output_text: '{"items":[{"title":"Uniform Firearms Act","citation":"Act of June 11, 1931, P.L. 751, No. 158","why":"Before the 1972 code."}]}',
    }), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    const queue = {
      items: [{ id: "code", title: "Act of December 6, 1972, P.L. 1482, No. 334", citation: "Act of December 6, 1972, P.L. 1482, No. 334", reviewStatus: "identified" }],
      rejected: [],
      approved: [],
      further: "pending",
    };
    const more = await scoutFurther("test-key", record, queue);
    assert.equal(calls.length, 1);
    assert.match(calls[0], /api\.x\.ai/);
    assert.equal(more.added, 1);
    assert.equal(more.queue.items.length, 2);
  } finally {
    globalThis.fetch = original;
  }
});

test("a model call that does not finish returns before the proxy closes", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener("abort", () => {
      const error = new Error("The operation was aborted.");
      error.name = "AbortError";
      reject(error);
    });
  });
  const started = Date.now();
  try {
    await assert.rejects(
      () => grokText("test-key", "find acts", [{ type: "web_search" }], { timeoutMs: 40 }),
      /The model took too long\./,
    );
    assert.ok(Date.now() - started < 2000);
  } finally {
    globalThis.fetch = original;
  }
});

test("finding legislation stores the chapter before it asks the model", () => {
  const run = readFileSync(new URL("../functions/api/admin/run.js", import.meta.url), "utf8");
  const further = readFileSync(new URL("../functions/api/admin/further.js", import.meta.url), "utf8");
  assert.match(run, /seedChapter/);
  assert.doesNotMatch(run, /scoutFurther/);
  assert.ok(run.indexOf("saveQueue") < run.indexOf("return json"));
  assert.match(further, /scoutFurther/);
  assert.match(further, /The model took too long|error\.message/);
});
