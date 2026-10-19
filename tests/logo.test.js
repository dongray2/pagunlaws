import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const logo = readFileSync(new URL("../site/logo.svg", import.meta.url), "utf8");
const page = readFileSync(new URL("../site/index.html", import.meta.url), "utf8");

test("homepage shows the Pennsylvania mark", () => {
  assert.match(page, /class="mark" src="\/logo\.svg"/);
  assert.match(page, /rel="icon" href="\/logo\.svg"/);
  assert.match(logo, /M73\.52 27\.28/);
  assert.match(logo, /stroke="#ffffff"/);
  assert.match(logo, /stroke="#e23b32"/);
  assert.match(logo, /stroke="#3d82e6"/);
  assert.match(logo, /Copyright \(c\) 2017 Cory Etzkorn/);

  const pistol = logo.match(/stroke="#e23b32"[^>]*transform="translate\(([0-9.]+) [^"]*rotate\(-45\)/);
  assert.ok(pistol, "pistol is rotated muzzle-up at 45 degrees");
  assert.ok(Number(pistol[1]) < 40, "pistol sits on the left half");

  const scales = logo.match(/stroke="#3d82e6"[^>]*transform="translate\(([0-9.]+)/);
  assert.ok(scales, "scales are placed");
  assert.ok(Number(scales[1]) > 45, "scales sit on the right half");
});
