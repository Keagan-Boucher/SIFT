import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { extractStructuredData } from "../structuredData";
import { extractHeuristic } from "../heuristicHtml";

function fixture(name: string): string {
  return readFileSync(join(__dirname, "..", "__fixtures__", name), "utf-8");
}

test("extractStructuredData reads a top-level JSON-LD Product", () => {
  const result = extractStructuredData(fixture("jsonld-product.html"));
  assert.deepEqual(result, {
    tier: 3,
    title: "Trail Runner Jacket",
    price: 129.99,
    currency: "USD",
    inStock: true,
  });
});

test("extractStructuredData reads a Product nested inside @graph", () => {
  const result = extractStructuredData(fixture("jsonld-graph-product.html"));
  assert.deepEqual(result, {
    tier: 3,
    title: "Ceramic Pour-Over Kettle",
    price: 34.5,
    currency: "GBP",
    inStock: true,
  });
});

test("extractStructuredData falls back to Open Graph price meta when there is no JSON-LD Product", () => {
  const result = extractStructuredData(fixture("og-price-product.html"));
  assert.deepEqual(result, {
    tier: 3,
    title: "Wireless Charging Pad",
    price: 24.0,
    currency: "EUR",
    inStock: true,
  });
});

test("extractStructuredData falls back to Product microdata", () => {
  const result = extractStructuredData(fixture("microdata-product.html"));
  assert.deepEqual(result, {
    tier: 3,
    title: "Cast Iron Skillet",
    price: 42.5,
    currency: "USD",
    inStock: true,
  });
});

test("extractStructuredData returns null for a real retailer page with no structured data", () => {
  const result = extractStructuredData(fixture("books-toscrape.html"));
  assert.equal(result, null);
});

test("extractStructuredData returns null for a client-rendered shell", () => {
  const result = extractStructuredData(fixture("client-rendered-empty.html"));
  assert.equal(result, null);
});

test("extractHeuristic finds a price via its class attribute on a real retailer page", () => {
  const result = extractHeuristic(fixture("books-toscrape.html"), ["light", "attic"]);
  assert.equal(result?.tier, 4);
  assert.equal(result?.price, 51.77);
  assert.equal(result?.currency, "GBP");
  assert.match(result?.title ?? "", /A Light in the Attic/);
});

test("extractHeuristic picks the price closest to the product's own keywords, not an unrelated one nearby", () => {
  const tokens = ["ceramic", "espresso", "cup"];
  const result = extractHeuristic(fixture("heuristic-no-price-class.html"), tokens);
  assert.equal(result?.tier, 4);
  assert.equal(result?.price, 28.0);
  assert.equal(result?.currency, "USD");
});

test("extractHeuristic returns null when there is nothing currency-shaped on the page", () => {
  const result = extractHeuristic(fixture("client-rendered-empty.html"), ["some", "product"]);
  assert.equal(result, null);
});

test("tier cascade: structured data wins over heuristic parsing when both would match", () => {
  const html = fixture("jsonld-product.html");
  const structured = extractStructuredData(html);
  assert.ok(structured);
  assert.equal(structured?.tier, 3);
});

test("tier cascade: heuristic parsing only runs once structured data returns null", () => {
  const html = fixture("heuristic-no-price-class.html");
  assert.equal(extractStructuredData(html), null);
  const heuristic = extractHeuristic(html, ["ceramic", "espresso", "cup"]);
  assert.ok(heuristic);
  assert.equal(heuristic?.tier, 4);
});
