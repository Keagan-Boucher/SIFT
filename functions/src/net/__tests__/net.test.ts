import { test } from "node:test";
import assert from "node:assert/strict";
import { describeFetchFailure, normaliseDomain, originFor, wwwOriginFor } from "../fetchPage";

test("describeFetchFailure separates the network failures that need different responses", () => {
  // A mistyped domain, a host refusing us and a slow host are three different
  // problems, and collapsing them into "did not respond in time" sends the user
  // looking in the wrong place.
  assert.match(describeFetchFailure({ html: null, status: null, networkError: true, failure: "dns" }), /does not resolve/);
  assert.match(describeFetchFailure({ html: null, status: null, networkError: true, failure: "refused" }), /refused the connection/);
  assert.match(describeFetchFailure({ html: null, status: null, networkError: true, failure: "tls" }), /certificate/);
  assert.match(describeFetchFailure({ html: null, status: null, networkError: true, failure: "timeout" }), /did not respond in time/);
});

test("describeFetchFailure names the HTTP status when there was a response", () => {
  assert.match(describeFetchFailure({ html: null, status: 403, networkError: false }), /HTTP 403/);
  assert.match(describeFetchFailure({ html: null, status: 429, networkError: false }), /HTTP 429/);
  assert.match(describeFetchFailure({ html: null, status: 500, networkError: false }), /HTTP 500/);
});

test("normaliseDomain reduces a pasted url to a bare host", () => {
  assert.equal(normaliseDomain("https://WWW.Takealot.com/all?q=x"), "takealot.com");
  assert.equal(normaliseDomain("  geekhome.co.za/  "), "geekhome.co.za");
});

test("originFor keeps loopback on http, since localhost has no TLS", () => {
  assert.equal(originFor("geekhome.co.za"), "https://geekhome.co.za");
  assert.equal(originFor("127.0.0.1:8080"), "http://127.0.0.1:8080");
});

test("wwwOriginFor offers the other name for a three-label ccTLD domain", () => {
  // Counting labels to spot a subdomain would reject every .co.za domain.
  assert.equal(wwwOriginFor("geekhome.co.za"), "https://www.geekhome.co.za");
  assert.equal(wwwOriginFor("www.geekhome.co.za"), "https://www.geekhome.co.za");
  assert.equal(wwwOriginFor("127.0.0.1:8080"), null);
});
