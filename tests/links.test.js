import assert from "node:assert/strict";
import test from "node:test";
import { actPageUrl, compiledSectionUrl, sourceLinks } from "../site/admin/links.js";

test("an act citation links to that act on the General Assembly site", () => {
  assert.equal(
    actPageUrl("Act of December 6, 1972, P.L. 1482, No. 334"),
    "https://www.palegis.us/statutes/unconsolidated/law-information?sessYr=1972&sessInd=0&actNum=334",
  );
  assert.equal(
    actPageUrl("Act of June 13, 1995, 1st Sp.Sess., P.L. 1024, No. 17"),
    "https://www.palegis.us/statutes/unconsolidated/law-information?sessYr=1995&sessInd=1&actNum=17",
  );
  assert.equal(actPageUrl("18 Pa.C.S. § 6105"), "");
});

test("a Chapter 61 section links to the compiled section, and Title 23 does not", () => {
  assert.equal(
    compiledSectionUrl("6105"),
    "https://www.legis.state.pa.us/WU01/LI/LI/CT/HTM/18/00.061.005.000..HTM",
  );
  assert.equal(
    compiledSectionUrl("6105.1"),
    "https://www.legis.state.pa.us/WU01/LI/LI/CT/HTM/18/00.061.005.001..HTM",
  );
  const domestic = sourceLinks({
    citation: "23 Pa.C.S. § 6105",
    why: "This is not the firearms disability.",
  });
  assert.equal(domestic.some((link) => link.href.includes("00.061.005")), false);
  const credited = sourceLinks({
    citation: "Act of Dec. 19, 1988, P.L. 1275, No. 158",
    why: "Credited on 18 Pa.C.S. Chapter 61 at § 6106. Open this act in the Laws of Pennsylvania.",
  });
  assert.ok(credited.some((link) => link.href.includes("actNum=158")));
  assert.ok(credited.some((link) => link.href.endsWith("00.061.006.000..HTM")));
  assert.ok(credited.some((link) => link.label === "Chapter 61 credit list"));
});
