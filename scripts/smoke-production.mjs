/**
 * End-to-end smoke test against the deployed backend.
 *
 *   node scripts/smoke-production.mjs [domain] [query]
 *   node scripts/smoke-production.mjs evetech.co.za "ddr4 ram"
 *
 * Signs in anonymously, writes a real search document, and waits for the
 * onSearchCreated trigger to resolve, scrape and score it, exactly as the app
 * does. Deliberately talks to production regardless of the emulator flag in
 * .env, since the point is to check what is deployed.
 *
 * Reads the same EXPO_PUBLIC_* config the app uses, so there is nothing extra
 * to configure. The search and listing it creates belong to a throwaway
 * anonymous account and can be left alone.
 */

import { readFileSync } from "node:fs";

const POLL_MS = 5_000;
const MAX_POLLS = 60;

function loadEnv() {
  const raw = readFileSync(new URL("../.env", import.meta.url), "utf8");
  return Object.fromEntries(
    raw
      .split(/\r?\n/)
      .filter((line) => line.includes("=") && !line.trim().startsWith("#"))
      .map((line) => {
        const at = line.indexOf("=");
        // Values may or may not be quoted, and a stray quote breaks the API key.
        return [line.slice(0, at).trim(), line.slice(at + 1).trim().replace(/^["']|["']$/g, "")];
      }),
  );
}

const env = loadEnv();
const apiKey = env.EXPO_PUBLIC_FIREBASE_API_KEY;
const projectId = env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
if (!apiKey || !projectId) {
  console.error("Missing EXPO_PUBLIC_FIREBASE_API_KEY or EXPO_PUBLIC_FIREBASE_PROJECT_ID in .env");
  process.exit(1);
}

const domain = process.argv[2] ?? "evetech.co.za";
const query = process.argv[3] ?? "ddr4 ram";
const documents = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

const auth = await (
  await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ returnSecureToken: true }),
  })
).json();

if (!auth.idToken) {
  console.error("Anonymous sign-in failed:", auth.error?.message ?? JSON.stringify(auth).slice(0, 200));
  console.error("Check that Anonymous auth is enabled in the Firebase console.");
  process.exit(1);
}

const headers = { "Content-Type": "application/json", Authorization: `Bearer ${auth.idToken}` };

const created = await (
  await fetch(`${documents}/searches`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      fields: {
        userId: { stringValue: auth.localId },
        query: { stringValue: query },
        sources: { arrayValue: { values: [{ stringValue: domain }] } },
        status: { stringValue: "pending" },
        resolvedCount: { integerValue: "0" },
      },
    }),
  })
).json();

if (!created.name) {
  console.error("Could not create the search:", JSON.stringify(created).slice(0, 300));
  process.exit(1);
}

const searchId = created.name.split("/").pop();
console.log(`searching "${query}" on ${domain}`);
console.log(`  project ${projectId}, search ${searchId}\n`);

const startedAt = Date.now();
for (let poll = 0; poll < MAX_POLLS; poll++) {
  await new Promise((resolve) => setTimeout(resolve, POLL_MS));

  const search = await (await fetch(`${documents}/searches/${searchId}`, { headers })).json();
  const status = search.fields?.status?.stringValue;
  const source = search.fields?.sources?.arrayValue?.values?.[0]?.mapValue?.fields;
  const elapsed = `${Math.round((Date.now() - startedAt) / 1000)}s`;

  if (status !== "complete" && status !== "failed") {
    console.log(`  ${elapsed.padStart(5)}  ${status} · ${source?.status?.stringValue ?? "queued"}`);
    continue;
  }

  console.log(`  ${elapsed.padStart(5)}  ${status} · ${source?.status?.stringValue}`);
  if (source?.reason?.stringValue) console.log(`         ${source.reason.stringValue}`);

  // Fetched by id rather than by query: the rules scope listings to the owner
  // of their parent search, which a collection-wide read cannot prove.
  const listing = await (await fetch(`${documents}/listings/${searchId}__${domain}`, { headers })).json();
  if (listing.fields) {
    const f = listing.fields;
    // Firestore types a whole number as integerValue and anything else as
    // doubleValue, so a perfect 1.0 match arrives in a different field to 0.67.
    const num = (field) => Number(field?.doubleValue ?? field?.integerValue ?? NaN);
    console.log(`\n  tier ${num(f.extractionTier)} · ${f.currency.stringValue} ${num(f.price)} · confidence ${num(f.matchConfidence)}`);
    console.log(`  ${f.title.stringValue}`);
    console.log(`  ${f.url.stringValue}`);
    console.log(`  ${f.candidates?.arrayValue?.values?.length ?? 0} runners-up, method ${source?.method?.stringValue ?? "?"}`);
  }

  process.exit(status === "complete" ? 0 : 1);
}

console.error(`\nStill running after ${Math.round((MAX_POLLS * POLL_MS) / 1000)}s. Check the Firebase console logs.`);
process.exit(1);
