import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AddressInfo } from "node:net";

import { scrapeSource } from "../scrapeSource";
import { USER_AGENT, clearRobotsCache } from "../../net/fetchPage";

/**
 * The whole scrape, end to end, against a real HTTP server: robots.txt, form
 * discovery on the homepage, a fetch of the derived search URL, and scoring
 * every product on the results page. Firestore is never initialised here, which
 * also proves the registry layer degrades rather than throwing.
 */

function fixture(dir: string, name: string): string {
  return readFileSync(join(__dirname, "..", "..", dir, "__fixtures__", name), "utf-8");
}

interface Route {
  robots: string;
  home: string;
  results: string;
  /**
   * Overrides `results` based on the query string, for tests where the strict
   * and relaxed searches have to return genuinely different pages.
   */
  resultsFor?: (query: string) => string | null;
}

let server: Server;
let requestedPaths: string[] = [];
let userAgents: string[] = [];
let redirectToLocalhost = false;
const routes: Record<string, Route> = {};

before(async () => {
  server = createServer((request, response) => {
    requestedPaths.push(request.url ?? "");
    userAgents.push(request.headers["user-agent"] ?? "");

    const host = (request.headers.host ?? "").split(":")[0];
    const path = (request.url ?? "/").split("?")[0];

    // Mirrors apex-to-www: 127.0.0.1 redirects to localhost, which has its own
    // stricter robots.txt.
    if (host === "127.0.0.1" && redirectToLocalhost && path !== "/robots.txt") {
      const port = (server.address() as AddressInfo).port;
      response.writeHead(301, { location: `http://localhost:${port}${request.url}` });
      response.end();
      return;
    }

    const site = routes[host] ?? routes["127.0.0.1"];

    if (path === "/robots.txt") {
      response.writeHead(200, { "content-type": "text/plain" });
      response.end(site.robots);
      return;
    }
    if (path === "/") {
      response.writeHead(200, { "content-type": "text/html" });
      response.end(site.home);
      return;
    }
    // Both the form-derived path and the conventional /search path serve results.
    if (path === "/catalogue/results" || path === "/search") {
      const params = new URL(request.url ?? "/", `http://${host}`).searchParams;
      // Covers every synthetic param name the resolution methods under test can
      // produce: the form-discovery fixture's "keywords", and commonPaths.ts's
      // "q"/"query"/"keyword"/"s". Missing one here silently reads as an empty
      // query, which vacuously matches any resultsFor predicate.
      const query =
        params.get("keywords") ??
        params.get("q") ??
        params.get("query") ??
        params.get("keyword") ??
        params.get("s") ??
        "";
      const body = site.resultsFor?.(query) ?? site.results;
      response.writeHead(200, { "content-type": "text/html" });
      response.end(body);
      return;
    }
    response.writeHead(404).end();
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
});

after(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});

function origin(): string {
  return `127.0.0.1:${(server.address() as AddressInfo).port}`;
}

function serve(route: Partial<Route>, localhostRoute?: Partial<Route>): void {
  redirectToLocalhost = !!localhostRoute;
  if (localhostRoute) {
    routes["localhost"] = {
      robots: "User-agent: *\nAllow: /\n",
      home: fixture("resolution", "search-form-home.html"),
      results: fixture("extraction", "results-cards.html"),
      ...localhostRoute,
    };
  }
  routes["127.0.0.1"] = {
    robots: "User-agent: *\nAllow: /\n",
    home: fixture("resolution", "search-form-home.html"),
    results: fixture("extraction", "results-cards.html"),
    ...route,
  };
  requestedPaths = [];
  userAgents = [];
  // Every test reuses one port, and robots.txt is cached per origin for an hour.
  clearRobotsCache();
}

test("scrapeSource resolves a search form, fetches the results and ranks the right variant first", async () => {
  serve({});

  const outcome = await scrapeSource("Samsung Galaxy S24 Ultra 256GB", origin());

  assert.equal(outcome.ok, true);
  if (!outcome.ok) return;

  assert.equal(outcome.method, "form-discovery");
  assert.equal(outcome.candidates[0].title, "Samsung Galaxy S24 Ultra 256GB Titanium Black");
  assert.equal(outcome.candidates[0].price, 2899);
  assert.equal(outcome.candidates[0].matchConfidence, 1);

  // robots.txt first, then the homepage, then the URL derived from its form.
  assert.equal(requestedPaths[0], "/robots.txt");
  assert.equal(requestedPaths[1], "/");
  assert.match(requestedPaths[2], /^\/catalogue\/results\?store=za&keywords=/);
});

test("scrapeSource identifies itself rather than spoofing a browser", async () => {
  serve({});
  await scrapeSource("Samsung Galaxy S24 Ultra 256GB", origin());
  assert.ok(userAgents.every((agent) => agent === USER_AGENT));
});

test("scrapeSource reports a source as BLOCKED when robots.txt refuses", async () => {
  serve({ robots: "User-agent: *\nDisallow: /\n" });

  const outcome = await scrapeSource("anything", origin());

  assert.equal(outcome.ok, false);
  if (outcome.ok) return;
  assert.equal(outcome.status, "BLOCKED");
  assert.match(outcome.reason, /robots\.txt/);
  // Nothing beyond robots.txt should have been requested.
  assert.deepEqual(requestedPaths, ["/robots.txt"]);
});

test("scrapeSource falls back to the platform pattern when there is no search form", async () => {
  serve({ home: fixture("resolution", "shopify-home.html") });

  const outcome = await scrapeSource("Samsung Galaxy S24 Ultra 256GB", origin());

  assert.equal(outcome.ok, true);
  if (!outcome.ok) return;
  assert.equal(outcome.method, "platform-pattern");
  // Shopify's standard search path, taken from the fingerprint rather than a form.
  assert.match(outcome.listingUrl, /^http:\/\/127\.0\.0\.1:\d+\/search\?q=/);
});

test("scrapeSource skips a search URL that just returns the homepage again", async () => {
  // A JavaScript-driven search form with no action attribute derives a URL that
  // resolves back to the homepage. Accepting it would mean scraping the wrong page.
  const home = `<!doctype html><html><body>
      <form><input name="desktop-search" placeholder="Search All Departments" /></form>
      <p>${"filler ".repeat(200)}</p>
    </body></html>`;
  serve({ home });

  const outcome = await scrapeSource("Samsung Galaxy S24 Ultra 256GB", origin());

  assert.equal(outcome.ok, true);
  if (!outcome.ok) return;
  // The form template pointed at "/", which was rejected, so the cascade
  // carried on to a conventional path that does serve results.
  assert.match(outcome.listingUrl, /\/search\?q=/);
  assert.equal(outcome.candidates[0].price, 2899);
});

test("scrapeSource reports the client-rendered limitation rather than failing silently", async () => {
  const shell = '<!doctype html><html><body><div id="root"></div><script src="/app.js"></script></body></html>';
  serve({ home: shell, results: fixture("extraction", "client-rendered-empty.html") });

  const outcome = await scrapeSource("Samsung Galaxy S24 Ultra 256GB", origin());

  assert.equal(outcome.ok, false);
  if (outcome.ok) return;
  assert.equal(outcome.status, "FAILED");
  assert.match(outcome.reason, /builds its pages in the browser/);
});

test("scrapeSource reports failure when every candidate url is a dead end", async () => {
  serve({ home: "<!doctype html><html><body><p>Nothing here</p></body></html>", results: "" });

  const outcome = await scrapeSource("anything", origin());

  assert.equal(outcome.ok, false);
  if (outcome.ok) return;
  // The reason now carries the actual cause of the last attempt.
  assert.match(outcome.reason, /no readable prices|could not be read|HTTP 404/);
});

test("scrapeSource obeys the robots.txt of the host it is redirected to", async () => {
  // Real case: an apex domain allows everything, redirects to www, and www
  // refuses. The policy that binds is the one on the host serving the content.
  serve({}, { robots: "User-agent: *\nDisallow: /\n" });

  const outcome = await scrapeSource("Samsung Galaxy S24 Ultra 256GB", origin());

  assert.equal(outcome.ok, false);
  if (outcome.ok) return;
  assert.equal(outcome.status, "BLOCKED");
  // The apex robots.txt was read and allowed; nothing beyond it was scraped.
  assert.ok(!requestedPaths.some((p) => p.startsWith("/catalogue/results")), requestedPaths.join(","));
});

test("scrapeSource retries with a relaxed query when the site's literal AND search finds nothing", async () => {
  // Real case: dragontown.co.za lists "Teenage Mutant Ninja Turtles -
  // Prerelease Pack". Its WooCommerce search is a literal AND across every
  // word, so "Mtg Teenage Mutant turtles bundle" returns nothing at all.
  // Dropping the least distinctive words finds the product.
  const noResultsPage = `<!doctype html><html><body><p>No products were found matching your selection.</p></body></html>`;
  // Card markup shaped like the rest of the fixtures: a product link plus a
  // nearby price. The title is real TMNT stock, so it scores against the
  // user's original query rather than the relaxed one used to find it.
  const productTitle = "Teenage Mutant Ninja Turtles - Prerelease Pack";
  const turtlesPage = `<!doctype html><html><body><ul class="products">
      <li class="product">
        <a href="/product/teenage-mutant-ninja-turtles-prerelease-pack/">${productTitle}</a>
        <span class="price">R995.00</span>
      </li>
    </ul></body></html>`;

  // WooCommerce's own search is a literal AND across every word of the query,
  // which is exactly the behaviour that sends "mtg ... bundle" to nothing while
  // the relaxed "teenage mutant turtles" finds the product.
  serve({
    resultsFor: (query) => {
      const words = decodeURIComponent(query.replace(/\+/g, " ")).toLowerCase().split(/\s+/).filter(Boolean);
      const titleWords = productTitle.toLowerCase();
      return words.every((word) => titleWords.includes(word)) ? turtlesPage : noResultsPage;
    },
  });

  const outcome = await scrapeSource("Mtg Teenage Mutant turtles bundle", origin());

  assert.equal(outcome.ok, true);
  if (!outcome.ok) return;
  // The relaxed retry landed on the same route, just with fewer words.
  assert.match(outcome.listingUrl, /keywords=teenage/);
  assert.ok(outcome.candidates.length > 0);

  // Both requests went through the one search route that actually works, not a
  // different candidate URL entirely.
  const searchRequests = requestedPaths.filter((p) => p.startsWith("/catalogue/results"));
  assert.equal(searchRequests.length, 2, requestedPaths.join(","));
});
