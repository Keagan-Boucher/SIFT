import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreMatch, confidenceBadge, CONFIRM_THRESHOLD } from "../score";

test("scoreMatch gives an exact title full confidence", () => {
  assert.equal(scoreMatch("Samsung Galaxy S24 Ultra 256GB", "Samsung Galaxy S24 Ultra 256GB Titanium Black").confidence, 1);
});

test("scoreMatch penalises a wrong storage variant through the digit weighting", () => {
  const { confidence, missing } = scoreMatch("Samsung Galaxy S24 Ultra 256GB", "Samsung Galaxy S24 Ultra 512GB");
  assert.deepEqual(missing, ["256gb"]);
  assert.ok(confidence < CONFIRM_THRESHOLD, `expected below threshold, got ${confidence}`);
});

test("scoreMatch pushes an accessory below the confirm threshold despite matching every word", () => {
  const { confidence } = scoreMatch("Samsung Galaxy S24 Ultra 256GB", "Samsung Galaxy S24 Ultra 256GB Clear Case");
  assert.ok(confidence < CONFIRM_THRESHOLD, `expected below threshold, got ${confidence}`);
});

test("scoreMatch does not penalise an accessory the user actually searched for", () => {
  assert.equal(scoreMatch("Galaxy S24 Ultra case", "Samsung Galaxy S24 Ultra Clear Case").confidence, 1);
});

test("scoreMatch scores an unrelated product near zero", () => {
  assert.ok(scoreMatch("Samsung Galaxy S24 Ultra 256GB", "Ceramic Pour-Over Kettle").confidence < 0.1);
});

test("confidenceBadge maps confidence onto the 1-4 badge", () => {
  assert.equal(confidenceBadge(0.95), 4);
  assert.equal(confidenceBadge(0.7), 3);
  assert.equal(confidenceBadge(0.4), 2);
  assert.equal(confidenceBadge(0.1), 1);
});
