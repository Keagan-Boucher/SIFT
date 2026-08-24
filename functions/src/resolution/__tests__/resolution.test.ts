import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { discoverSearchTemplate } from "../formDiscovery";
import { fingerprintPlatform } from "../platformPattern";
import { buildFromTemplate, validateTemplate } from "../template";
import { templateFromUserUrl } from "../index";

function fixture(name: string): string {
  return readFileSync(join(__dirname, "..", "__fixtures__", name), "utf-8");
}

test("discoverSearchTemplate prefers the search form over an unrelated form", () => {
  const template = discoverSearchTemplate(fixture("search-form-home.html"), "https://kloof.co.za");
  assert.equal(template, "https://kloof.co.za/catalogue/results?store=za&keywords={query}");
});

test("discoverSearchTemplate handles an empty action and a plain named input", () => {
  const template = discoverSearchTemplate(fixture("named-input-home.html"), "https://bergview.co.za");
  assert.equal(template, "https://bergview.co.za/?q={query}");
});

test("discoverSearchTemplate skips POST search forms and non-search GET forms", () => {
  assert.equal(discoverSearchTemplate(fixture("post-only-home.html"), "https://static.co.za"), null);
});

test("discoverSearchTemplate returns null when a page has no forms", () => {
  assert.equal(discoverSearchTemplate(fixture("shopify-home.html"), "https://northline.co.za"), null);
});

test("fingerprintPlatform identifies Shopify from its CDN markers", () => {
  assert.equal(fingerprintPlatform(fixture("shopify-home.html"))?.name, "Shopify");
});

test("fingerprintPlatform prefers WooCommerce over bare WordPress", () => {
  assert.equal(fingerprintPlatform(fixture("woocommerce-home.html"))?.name, "WooCommerce");
});

test("fingerprintPlatform returns null for a site with no platform markers", () => {
  assert.equal(fingerprintPlatform(fixture("search-form-home.html")), null);
});

test("buildFromTemplate percent-encodes the query", () => {
  assert.equal(buildFromTemplate("https://x.co/s?q={query}", "galaxy s24 ultra"), "https://x.co/s?q=galaxy%20s24%20ultra");
});

test("validateTemplate rejects patterns with no query slot or no scheme", () => {
  assert.equal(validateTemplate("https://x.co/search?q=fixed"), false);
  assert.equal(validateTemplate("/search?q={query}"), false);
  assert.equal(validateTemplate("https://x.co/search?q={query}"), true);
});

test("templateFromUserUrl swaps the searched term for the query token", () => {
  assert.equal(
    templateFromUserUrl("https://takealot.com/all?qsearch=galaxy+s24&sort=price", "galaxy s24"),
    "https://takealot.com/all?qsearch=%7Bquery%7D&sort=price".replace("%7Bquery%7D", "{query}"),
  );
});

test("templateFromUserUrl returns null when the query term is not in the URL", () => {
  assert.equal(templateFromUserUrl("https://takealot.com/deals", "galaxy s24"), null);
});
