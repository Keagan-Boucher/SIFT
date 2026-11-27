import { test } from "node:test";
import assert from "node:assert/strict";
import type { ScoredCandidate } from "../../types";
import { applyPick, pickMatch, sanitiseUnderstanding } from "../search";

const candidate = (title: string, matchConfidence: number) =>
  ({ title, matchConfidence, url: `https://x.co.za/${title}`, price: 1, currency: "ZAR", inStock: true, tier: 1 }) as unknown as ScoredCandidate;

const list = [candidate("PS5 controller", 0.5), candidate("PS5 Slim Disc", 0.45), candidate("PS5 skin", 0.3)];

test("applyPick promotes the model's pick and trusts it", () => {
  const [top, ...rest] = applyPick(list, 1);
  assert.equal(top.title, "PS5 Slim Disc");
  assert.equal(top.matchConfidence, 0.85);
  assert.deepEqual(rest.map((c) => c.title), ["PS5 controller", "PS5 skin"]);
});

test("applyPick on a veto caps the best match at the confirm threshold", () => {
  const vetoed = applyPick([candidate("PS5 skin", 0.8)], -1);
  assert.equal(vetoed[0].matchConfidence, 0.6);
});

test("applyPick ignores answers that are not a usable index", () => {
  for (const bad of [undefined, "1", 1.5, 3, 99]) assert.equal(applyPick(list, bad), list);
});

test("pickMatch without a key leaves candidates untouched", async () => {
  assert.equal(await pickMatch("ps5", list), list);
});

test("sanitiseUnderstanding falls back to the query and drops junk domains", () => {
  assert.deepEqual(sanitiseUnderstanding("ps5", null), { product: "ps5", sites: [] });
  const result = sanitiseUnderstanding("playstaton 5", {
    product: "PlayStation 5",
    sites: [{ domain: "https://www.takealot.com/", reason: "Big range" }, { domain: "not a domain" }, { domain: "takealot.com" }],
  });
  assert.equal(result.product, "PlayStation 5");
  assert.deepEqual(result.sites, [{ domain: "takealot.com", reason: "Big range" }]);
});
