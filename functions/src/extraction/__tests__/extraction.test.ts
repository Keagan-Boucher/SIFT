import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { extractStructuredData } from "../structuredData";
import { extractHeuristic } from "../heuristicHtml";
import { extractCandidates } from "../candidates";

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

test("extractCandidates reads every product out of a JSON-LD ItemList and resolves relative urls", () => {
  const candidates = extractCandidates(fixture("results-itemlist.html"), "https://outfit.example/search?q=jacket", "trail runner jacket");
  assert.equal(candidates.length, 2);
  assert.deepEqual(candidates[0], {
    tier: 3,
    title: "Trail Runner Jacket Mens Large",
    price: 129.99,
    currency: "USD",
    inStock: true,
    url: "https://outfit.example/p/trail-runner-jacket",
    matchConfidence: 1,
  });
  assert.equal(candidates[1].url, "https://outfit.example/p/trail-runner-vest");
  assert.equal(candidates[1].inStock, false);
});

test("extractCandidates falls back to card parsing and ranks the right variant first", () => {
  const candidates = extractCandidates(fixture("results-cards.html"), "https://kloof.co.za/search", "Samsung Galaxy S24 Ultra 256GB");
  // The unrelated kettle on the same results page scores zero and is dropped.
  assert.equal(candidates.length, 3);
  assert.equal(candidates[0].title, "Samsung Galaxy S24 Ultra 256GB Titanium Black");
  assert.equal(candidates[0].price, 2899);
  assert.equal(candidates[0].currency, "ZAR");
  assert.equal(candidates[0].url, "https://kloof.co.za/p/galaxy-s24-ultra-256");
  assert.equal(candidates[0].tier, 4);
});

test("extractCandidates ranks the clear case below the phone it matches word for word", () => {
  const candidates = extractCandidates(fixture("results-cards.html"), "https://kloof.co.za/search", "Samsung Galaxy S24 Ultra 256GB");
  const caseIndex = candidates.findIndex((c) => c.title.includes("Clear Case"));
  assert.ok(caseIndex > 0, "the case should not rank first");
  assert.equal(candidates.find((c) => c.title.includes("Kettle")), undefined);
});

test("extractCandidates reads out-of-stock wording off the card", () => {
  const candidates = extractCandidates(fixture("results-cards.html"), "https://kloof.co.za/search", "Ceramic Pour-Over Kettle");
  assert.equal(candidates[0].title, "Ceramic Pour-Over Kettle");
  assert.equal(candidates[0].inStock, false);
});

test("extractCandidates returns nothing for a client-rendered page with no prices", () => {
  assert.deepEqual(extractCandidates(fixture("client-rendered-empty.html"), "https://x.co/search", "anything"), []);
});

test("extractCandidates does not read a model number or shorthand as a price", () => {
  // Both patterns come off real retailer pages: "DDR4-3600" was being read as
  // R4, and a "Headsets Under R1k" filter link as a product priced R1.
  const html = `<!doctype html><html><body><ul>
      <li><a href="/p/ram">G.Skill Ripjaws V 32GB DDR4-3600MHz CL16</a><span>R2 199</span></li>
      <li><a href="/c/headsets">Headsets Under R1k</a></li>
    </ul></body></html>`;

  const candidates = extractCandidates(html, "https://x.co/search", "G.Skill Ripjaws 32GB DDR4-3600");

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].price, 2199);
});

test("extractCandidates reads a price split across elements, ignoring the struck-out old price", () => {
  // WooCommerce, Shopify and Magento all render the currency symbol in its own
  // element, so the symbol and the number are never in one text node. A sale
  // also renders the former price in <del>, which must not be the one reported.
  const html = `<!doctype html><html><body><ul class="products">
      <li class="product">
        <a href="/shop/Charjabug/">Charjabug</a>
        <span class="price">
          <del><span class="amount"><bdi><span class="sym">&#163;</span>99.00</bdi></span></del>
          <ins><span class="amount"><bdi><span class="sym">&#163;</span>76.00</bdi></span></ins>
        </span>
      </li>
    </ul></body></html>`;

  const candidates = extractCandidates(html, "https://scrapeme.live/?s=char", "Charjabug");

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].price, 76);
  assert.equal(candidates[0].currency, "GBP");
  assert.equal(candidates[0].url, "https://scrapeme.live/shop/Charjabug/");
});

test("extractCandidates ignores price-bracket category links", () => {
  // Real evetech.co.za navigation. These look like products with prices until
  // you notice the price is part of the name rather than attached to it.
  const html = `<!doctype html><html><body><nav>
      <a href="/buy-gaming-chair-under-r4000/x/1568">Gaming Chair Under R4000</a>
      <a href="/office-chairs-above-r4000/x/1931">Office Chairs Above R4000</a>
    </nav>
    <ul><li><a href="/p/ram-kit">Corsair Vengeance 32GB DDR4 Kit</a><span class="price">R2 450</span></li></ul>
    </body></html>`;

  const candidates = extractCandidates(html, "https://www.evetech.co.za/search?q=ddr4", "Corsair Vengeance 32GB DDR4");

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].title, "Corsair Vengeance 32GB DDR4 Kit");
  assert.equal(candidates[0].price, 2450);
});
