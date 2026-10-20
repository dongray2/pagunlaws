import assert from "node:assert/strict";
import test from "node:test";
import { actBody, actTextUrl, clipActText } from "../functions/lib/act-text.js";
import { researchItem } from "../functions/lib/discover.js";

const record = {
  topics: [{ id: "all", label: "All Laws" }, { id: "rights", label: "Loss and restoration of gun rights" }],
  lanes: [{ id: "possess", label: "Who may possess" }],
  moments: [],
};

function item(citation) {
  return {
    id: "act",
    title: citation,
    citation,
    why: "Credited on 18 Pa.C.S. Chapter 61.",
    reviewStatus: "researching",
    titleVerified: false,
    text: "",
    textVerified: false,
    citationVerified: false,
    sourceUrl: "",
    effectiveStatement: "The effective date has not been read. Do not quote a date.",
    dateKind: "unchecked",
    dateVerified: false,
    sort: "",
    whatChanged: "",
    lane: "",
    walks: [],
    status: "not_yet_checked",
    notes: "",
    researchError: "",
  };
}

test("an act citation points at the General Assembly text page", () => {
  assert.equal(
    actTextUrl("Act of December 6, 1972, P.L. 1482, No. 334"),
    "https://www.palegis.us/statutes/unconsolidated/law-information/view-statute?iFrame=true&txtType=HTM&SessYr=1972&SessInd=0&ActNum=334",
  );
  assert.equal(
    actTextUrl("Act of June 13, 1995, 1st Sp.Sess., P.L. 1024, No. 17"),
    "https://www.palegis.us/statutes/unconsolidated/law-information/view-statute?iFrame=true&txtType=HTM&SessYr=1995&SessInd=1&ActNum=17",
  );
  assert.equal(actTextUrl("18 Pa.C.S. § 6105"), "");
});

test("a navigation shell is not act text", () => {
  assert.equal(actBody("<html><title>1972 Act 334</title><nav>Members of the Senate</nav>No Act found for the selected year.</html>"), "");
  const body = actBody("<p>The General Assembly hereby enacts as follows:</p><p>&#167; 6105. Persons not to possess firearms.</p><p>This act shall take effect in 60 days.</p>");
  assert.match(body, /hereby enacts/);
  assert.match(body, /§ 6105/);
  assert.match(body, /60 days/);
});

test("a long act keeps the opening and the effective-date clause", () => {
  const head = "The General Assembly hereby enacts as follows: firearms at the start. ";
  const tail = " Section 20. This act shall take effect immediately.";
  const clipped = clipActText(head + "x".repeat(40000) + tail);
  assert.match(clipped, /hereby enacts/);
  assert.match(clipped, /take effect immediately/);
  assert.ok(clipped.length < 40000);
});

test("research reads the act page and does not ask the model to search", async () => {
  const calls = [];
  const original = globalThis.fetch;
  const actUrl = actTextUrl("Act of July 2, 2019, P.L. 375, No. 58");
  globalThis.fetch = async (url, options) => {
    const address = String(url);
    calls.push(address);
    if (address.includes("api.x.ai")) {
      const body = JSON.parse(options.body);
      assert.equal(body.tools, undefined);
      assert.match(body.input, /take effect in 60 days/);
      assert.match(body.input, /does not ask|only the act text|Use only the act text/);
      return new Response(JSON.stringify({
        output_text: JSON.stringify({
          title: "Act of July 2, 2019, P.L. 375, No. 58",
          titleVerified: true,
          citation: "Act of July 2, 2019, P.L. 375, No. 58",
          citationVerified: true,
          text: "Section 6105. Persons not to possess firearms.",
          textVerified: true,
          sourceUrl: "https://example.com/wrong",
          effectiveStatement: "The remainder of this act shall take effect immediately.",
          dateKind: "effective",
          dateVerified: true,
          sort: "2019",
          whatChanged: "The act added a firearms jurisdiction rule.",
          lane: "possess",
          walks: ["rights"],
          status: "in_force",
          notes: "",
        }),
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    assert.equal(address, actUrl);
    return new Response("<p>The General Assembly hereby enacts as follows: Section 6105. This act shall take effect in 60 days.</p>", { status: 200 });
  };
  try {
    const filled = await researchItem("test-key", record, item("Act of July 2, 2019, P.L. 375, No. 58"));
    assert.deepEqual(calls, [actUrl, "https://api.x.ai/v1/responses"]);
    assert.equal(filled.text, "Section 6105. Persons not to possess firearms.");
    assert.equal(filled.textVerified, true);
    assert.equal(filled.sourceUrl, actUrl);
    assert.equal(filled.effectiveStatement, "The remainder of this act shall take effect immediately.");
    assert.equal(filled.dateVerified, true);
    assert.equal(filled.sort, "2019");
    assert.equal(filled.reviewStatus, "pending");
    assert.equal(filled.researchError, "");
  } finally {
    globalThis.fetch = original;
  }
});

test("an act page with no text does not call the model", async () => {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return new Response("<html>Members of the Senate</html>", { status: 200 });
  };
  try {
    await assert.rejects(
      () => researchItem("test-key", record, item("Act of December 6, 1972, P.L. 1482, No. 334")),
      /The General Assembly page did not include the text of this act\./,
    );
    assert.equal(calls.length, 1);
    assert.doesNotMatch(calls[0], /api\.x\.ai/);
  } finally {
    globalThis.fetch = original;
  }
});

test("an item that is not a session law is not sent to the model", async () => {
  const original = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    return new Response("", { status: 200 });
  };
  try {
    await assert.rejects(
      () => researchItem("test-key", record, item("18 Pa.C.S. § 6105")),
      /This item has no session-law citation to open\./,
    );
    assert.equal(called, false);
  } finally {
    globalThis.fetch = original;
  }
});
