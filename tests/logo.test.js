import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../site/index.html", import.meta.url), "utf8");
const logo = readFileSync(new URL("../site/logo.png", import.meta.url));

test("homepage shows the Pennsylvania mark", () => {
  assert.match(page, /class="mark" src="\/logo\.png"/);
  assert.match(page, /rel="icon" href="\/logo\.png"/);
  assert.equal(logo[0], 0x89);
  assert.equal(logo[1], 0x50);
  assert.equal(logo[2], 0x4e);
  assert.equal(logo[3], 0x47);
  assert.ok(logo.length > 1000);
});
