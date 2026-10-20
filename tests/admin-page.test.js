import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../site/index.html", import.meta.url), "utf8");
const app = readFileSync(new URL("../site/app.js", import.meta.url), "utf8");
const admin = readFileSync(new URL("../site/admin/admin.js", import.meta.url), "utf8");
const review = readFileSync(new URL("../functions/lib/review.js", import.meta.url), "utf8");

test("the public page points at review and loads only the approved merge", () => {
  assert.match(page, /class="review-link" href="\/admin"/);
  const apiAt = app.indexOf('fetch("/api/record")');
  const fileAt = app.indexOf('fetch("/record.json")');
  assert.ok(apiAt > -1 && fileAt > apiAt);
  assert.doesNotMatch(app, /innerHTML/);
});

test("the review screen cannot publish or skip a waiting item", () => {
  assert.match(admin, /pagunlaws-review/);
  assert.match(admin, /A new run cannot be completed while legislation is still waiting/);
  assert.match(admin, /Unapproved legislation is not on the public record/);
  assert.match(admin, /\/api\/admin\/run/);
  assert.match(admin, /\/api\/admin\/further/);
  assert.match(admin, /\/api\/admin\/research/);
  assert.match(admin, /\/api\/admin\/decision/);
  assert.match(admin, /The review request failed \(\$\{response\.status\}\)/);
  const runAt = admin.indexOf('"/api/admin/run"');
  const furtherAt = admin.indexOf('"/api/admin/further"');
  assert.ok(runAt > -1 && furtherAt > runAt);
  assert.match(admin, /Show all/);
  assert.match(admin, /button\("Accept"/);
  assert.doesNotMatch(admin, /reviewStatus !== "pending"/);
  assert.match(admin, /Verified against the official source/);
  assert.doesNotMatch(admin, /innerHTML/);
  assert.match(review, /export function canStartRun/);
  assert.match(review, /approved/);
});
