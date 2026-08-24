import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreMatch, confidenceBadge, needsConfirmation, CONFIRM_THRESHOLD } from "../score";
import { relaxedQueries } from "../relax";

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

test("relaxedQueries drops the least distinctive words, most specific first", () => {
  // The real case: dragontown.co.za lists "Teenage Mutant Ninja Turtles -
  // Prerelease Pack". WooCommerce searches literally, so asking for every word
  // of "Mtg Teenage Mutant turtles bundle" returns nothing at all.
  assert.deepEqual(relaxedQueries("Mtg Teenage Mutant turtles bundle"), [
    "Mtg Teenage Mutant turtles bundle",
    "teenage mutant turtles",
    "teenage turtles",
  ]);
});

test("relaxedQueries keeps the tokens that pin a variant", () => {
  // A digit usually identifies the exact model, so those survive relaxation.
  assert.deepEqual(relaxedQueries("Samsung Galaxy S24 Ultra 256GB"), [
    "Samsung Galaxy S24 Ultra 256GB",
    "samsung s24 256gb",
    "s24 256gb",
  ]);
});

test("relaxedQueries leaves a short query alone", () => {
  assert.deepEqual(relaxedQueries("MTG bundle"), ["MTG bundle"]);
  assert.deepEqual(relaxedQueries("Pikachu"), ["Pikachu"]);
});

test("needsConfirmation flags a match that only reaches the threshold", () => {
  // The real case: "Mtg Teenage Mutant turtles bundle" against a listing titled
  // "Teenage Mutant Ninja Turtles - Prerelease Pack" scores exactly 0.6, with
  // both "mtg" and "bundle" unmatched. That is a different product, so it has to
  // reach the confirm step rather than being compared silently.
  assert.equal(scoreMatch("Mtg Teenage Mutant turtles bundle", "Teenage Mutant Ninja Turtles - Prerelease Pack").confidence, 0.6);
  assert.equal(needsConfirmation(0.6), true);
  assert.equal(needsConfirmation(0.61), false);
  assert.equal(needsConfirmation(1), false);
});
