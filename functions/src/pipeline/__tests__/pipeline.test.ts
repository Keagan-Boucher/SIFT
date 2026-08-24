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
}

let server: Server;
let requestedPaths: string[] = [];
let userAgents: string[] = [];
const routes: Record<string, Route> = {};

before(async () => {
  server = createServer((request, response) => {
    requestedPaths.push(request.url ?? "");
    userAgents.push(request.headers["user-agent"] ?? "");

    const host = (request.headers.host ?? "").split(":")[0];
    const site = routes[host] ?? routes["127.0.0.1"];
    const path = (request.url ?? "/").split("?")[0];

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
    if (path === "/catalogue/results") {
      response.writeHead(200, { "content-type": "text/html" });
      response.end(site.results);
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

function serve(route: Partial<Route>): void {
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

  // The Shopify search path is /search, which this server does not serve, so
  // resolution succeeds and the fetch is what fails.
  const outcome = await scrapeSource("anything", origin());

  assert.equal(outcome.ok, false);
  if (outcome.ok) return;
  assert.equal(outcome.method, "platform-pattern");
  assert.match(outcome.reason, /could not be fetched/);
});

test("scrapeSource reports the client-rendered limitation rather than failing silently", async () => {
  serve({ results: fixture("extraction", "client-rendered-empty.html") });

  const outcome = await scrapeSource("Samsung Galaxy S24 Ultra 256GB", origin());

  assert.equal(outcome.ok, false);
  if (outcome.ok) return;
  assert.equal(outcome.status, "FAILED");
  assert.match(outcome.reason, /No prices in the page HTML/);
});

test("scrapeSource reports failure when no page can be resolved at all", async () => {
  serve({ home: "<!doctype html><html><body><p>Nothing here</p></body></html>" });

  const outcome = await scrapeSource("anything", origin());

  assert.equal(outcome.ok, false);
  if (outcome.ok) return;
  assert.match(outcome.reason, /No search page could be resolved/);
});
