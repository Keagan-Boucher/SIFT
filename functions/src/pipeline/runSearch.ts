import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue, type Firestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import pLimit from "p-limit";

import type { ScoredCandidate, SearchStatus, SourceState } from "../types";
import { normaliseDomain } from "../net/fetchPage";
import { CONFIRM_THRESHOLD, confidenceBadge } from "../matching/score";
import { scrapeSource } from "./scrapeSource";

/** How many sources are worked at once. Each host is separately limited to one. */
const SOURCE_CONCURRENCY = 4;
const MAX_SOURCES_PER_SEARCH = 12;
const MAX_STORED_CANDIDATES = 5;

interface SearchData {
  userId: string;
  query: string;
  sources?: (string | SourceState)[];
  /** Search URLs the user pasted for domains resolution could not work out. */
  userSearchUrls?: Record<string, string>;
}

function domainOf(source: string | SourceState): string {
  return normaliseDomain(typeof source === "string" ? source : source.domain);
}

/**
 * Streams the per-source state back to the search doc after every change. The
 * app subscribes to this document, so each write is what makes a tile appear on
 * the live screen while the rest of the sources are still working.
 */
async function publishProgress(
  db: Firestore,
  searchId: string,
  states: SourceState[],
  status: SearchStatus,
): Promise<void> {
  await db
    .collection("searches")
    .doc(searchId)
    .set(
      {
        sources: states,
        status,
        resolvedCount: states.filter((state) => state.status === "RESOLVED").length,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
}

/**
 * Writes one listing per source. The document id is deterministic
 * (searchId + domain) so a re-run overwrites rather than duplicating, and the
 * confirm step can address a listing without a lookup.
 */
async function writeListing(
  db: Firestore,
  searchId: string,
  domain: string,
  best: ScoredCandidate,
  rest: ScoredCandidate[],
): Promise<void> {
  await db
    .collection("listings")
    .doc(`${searchId}__${domain}`)
    .set({
      searchId,
      retailerDomain: domain,
      url: best.url,
      title: best.title,
      price: best.price,
      currency: best.currency,
      inStock: best.inStock,
      matchConfidence: best.matchConfidence,
      confidenceBadge: confidenceBadge(best.matchConfidence),
      extractionTier: best.tier,
      needsConfirmation: best.matchConfidence < CONFIRM_THRESHOLD,
      candidates: rest.slice(0, MAX_STORED_CANDIDATES),
      scrapedAt: FieldValue.serverTimestamp(),
    });
}

/**
 * Runs one source and writes its best listing. Failures are per-source, so one
 * dead retailer never sinks a search.
 */
async function processSource(
  db: Firestore,
  searchId: string,
  query: string,
  domain: string,
  userSearchUrl: string | undefined,
): Promise<SourceState> {
  const outcome = await scrapeSource(query, domain, userSearchUrl);
  if (!outcome.ok) {
    return { domain, status: outcome.status, method: outcome.method, reason: outcome.reason };
  }

  const [best, ...rest] = outcome.candidates;
  await writeListing(db, searchId, domain, best, rest);
  return { domain, status: "RESOLVED", method: outcome.method };
}

/**
 * Runs every source of a search, publishing progress as each one lands.
 * Exported separately from the trigger so it can be driven directly from the
 * emulator shell and from tests.
 */
export async function runSearchPipeline(searchId: string, data: SearchData): Promise<void> {
  const db = getFirestore();
  const domains = [...new Set((data.sources ?? []).map(domainOf).filter(Boolean))].slice(0, MAX_SOURCES_PER_SEARCH);

  if (domains.length === 0) {
    await publishProgress(db, searchId, [], "failed");
    return;
  }

  const states: SourceState[] = domains.map((domain) => ({ domain, status: "PENDING" }));
  await publishProgress(db, searchId, states, "resolving");

  const limit = pLimit(SOURCE_CONCURRENCY);
  await Promise.all(
    domains.map((domain, index) =>
      limit(async () => {
        states[index] = { domain, status: "RESOLVING" };
        await publishProgress(db, searchId, states, "extracting");

        states[index] = await processSource(db, searchId, data.query, domain, data.userSearchUrls?.[domain]);
        await publishProgress(db, searchId, states, "extracting");
      }),
    ),
  );

  const anyResolved = states.some((state) => state.status === "RESOLVED");
  await publishProgress(db, searchId, states, anyResolved ? "complete" : "failed");
}

/**
 * The app creates a search document and subscribes to it. This trigger does the
 * rest, which keeps the scraping server-side where it has to be and gives the
 * client a real-time stream rather than a request it has to sit and wait on.
 */
export const onSearchCreated = onDocumentCreated(
  { document: "searches/{searchId}", timeoutSeconds: 300, memory: "512MiB" },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const data = snapshot.data() as SearchData;
    if (!data.userId || !data.query) {
      await snapshot.ref.set({ status: "failed" }, { merge: true });
      return;
    }

    try {
      await runSearchPipeline(event.params.searchId, data);
    } catch (error) {
      logger.error(`search ${event.params.searchId} failed`, error);
      await snapshot.ref.set({ status: "failed", updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    }
  },
);

interface ConfirmRequest {
  searchId: string;
  domain: string;
  candidateUrl: string;
}

interface StoredListing {
  candidates?: ScoredCandidate[];
  url: string;
  title: string;
  price: number;
  currency: string;
  inStock: boolean;
  matchConfidence: number;
  extractionTier: ScoredCandidate["tier"];
}

/**
 * The confirm-matches step. The user picks the right listing out of the stored
 * candidates and it is promoted into the listing itself. The pick is counted
 * against the domain, which is the deterministic learning in the system.
 */
export const confirmMatch = onCall<ConfirmRequest, Promise<{ ok: true }>>(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "sign in to confirm a match");

  const { searchId, domain, candidateUrl } = request.data;
  if (!searchId || !domain || !candidateUrl) {
    throw new HttpsError("invalid-argument", "searchId, domain and candidateUrl are required");
  }

  const db = getFirestore();
  const normalised = normaliseDomain(domain);

  const search = await db.collection("searches").doc(searchId).get();
  if (!search.exists) throw new HttpsError("not-found", "search does not exist");
  if ((search.data() as SearchData).userId !== request.auth.uid) {
    throw new HttpsError("permission-denied", "that search belongs to someone else");
  }

  const ref = db.collection("listings").doc(`${searchId}__${normalised}`);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new HttpsError("not-found", "listing does not exist");

  const current = snapshot.data() as StoredListing;
  const chosen = current.candidates?.find((candidate) => candidate.url === candidateUrl);
  if (!chosen) throw new HttpsError("not-found", "that candidate is not on this listing");

  // The rejected match keeps its place in the list so the user can change their mind.
  const demoted = (current.candidates ?? [])
    .filter((candidate) => candidate.url !== candidateUrl)
    .concat({
      url: current.url,
      title: current.title,
      price: current.price,
      currency: current.currency,
      inStock: current.inStock,
      matchConfidence: current.matchConfidence,
      tier: current.extractionTier,
    })
    .slice(0, MAX_STORED_CANDIDATES);

  await ref.set(
    {
      url: chosen.url,
      title: chosen.title,
      price: chosen.price,
      currency: chosen.currency,
      inStock: chosen.inStock,
      extractionTier: chosen.tier,
      // A human confirmed it, so the badge reflects that rather than the score.
      matchConfidence: 1,
      confidenceBadge: 4,
      needsConfirmation: false,
      confirmedByUser: true,
      candidates: demoted,
    },
    { merge: true },
  );

  await db
    .collection("retailerTemplates")
    .doc(normalised)
    .set({ confirmedMatchCount: FieldValue.increment(1) }, { merge: true });

  return { ok: true };
});
