import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { extractHeadless, extractCandidatesHeadless } from "../headless";

/**
 * The browser itself is not exercised here: there is no Chromium binary to
 * launch in this environment (@sparticuz/chromium's binary is Linux-only, and
 * this suite also runs on Windows dev machines). What's under test is the
 * wiring around it instead: that a render failure means no result, and that a
 * render that produces ordinary HTML is handed to the same parsers tiers 3-4
 * use, tagged as tier 5.
 */

function fixture(name: string): string {
  return readFileSync(join(__dirname, "..", "__fixtures__", name), "utf-8");
}

test("extractHeadless returns null when the render fails", async () => {
  const result = await extractHeadless("https://x.example/p/1", ["anything"], async () => ({
    html: null,
    error: "robots.txt disallows this page",
  }));
  assert.equal(result, null);
});

test("extractHeadless reads a rendered page the same way structured-data extraction would", async () => {
  const result = await extractHeadless("https://x.example/p/1", [], async () => ({
    html: fixture("jsonld-product.html"),
  }));
  assert.deepEqual(result, {
    tier: 5,
    title: "Trail Runner Jacket",
    price: 129.99,
    currency: "USD",
    inStock: true,
  });
});

test("extractHeadless falls back to heuristic parsing once rendered, same as the static cascade", async () => {
  const tokens = ["ceramic", "espresso", "cup"];
  const result = await extractHeadless("https://x.example/p/1", tokens, async () => ({
    html: fixture("heuristic-no-price-class.html"),
  }));
  assert.equal(result?.tier, 5);
  assert.equal(result?.price, 28.0);
});

test("extractHeadless returns null when even the rendered HTML has nothing currency-shaped", async () => {
  const result = await extractHeadless("https://x.example/p/1", ["some", "product"], async () => ({
    html: fixture("client-rendered-empty.html"),
  }));
  assert.equal(result, null);
});

test("extractCandidatesHeadless returns nothing when the render fails", async () => {
  const result = await extractCandidatesHeadless("https://x.example/search?q=jacket", "jacket", async () => ({
    html: null,
    error: "timed out",
  }));
  assert.deepEqual(result, []);
});

test("extractCandidatesHeadless scores a rendered results page and tags every candidate tier 5", async () => {
  const candidates = await extractCandidatesHeadless(
    "https://outfit.example/search?q=jacket",
    "trail runner jacket",
    async () => ({ html: fixture("results-itemlist.html") }),
  );
  assert.equal(candidates.length, 2);
  assert.equal(candidates[0].tier, 5);
  assert.equal(candidates[0].title, "Trail Runner Jacket Mens Large");
  assert.equal(candidates[1].tier, 5);
});
