import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore, FieldValue, type DocumentSnapshot, type Firestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import pLimit from "p-limit";

import { normaliseDomain } from "../net/fetchPage";
import { CONFIRM_THRESHOLD } from "../matching/score";
import { scrapeSource } from "./scrapeSource";

const SOURCE_CONCURRENCY = 4;
const SAVED_SEARCH_CONCURRENCY = 3;
/** One sweep is capped so a runaway user cannot drain the budget. */
const MAX_SAVED_SEARCHES_PER_SWEEP = 200;

interface SavedSearchData {
  userId: string;
  query: string;
  sources?: string[];
  lowestPrice?: number;
  userSearchUrls?: Record<string, string>;
}

export interface RecheckResult {
  lowestPrice: number | null;
  previousLowestPrice: number | null;
  checkedSources: number;
}

/**
 * Rescrapes every source of a watched search and records the lowest price it
 * can still find. Only matches above the confirm threshold count, so a bad
 * heuristic hit cannot fake a price drop.
 */
export async function recheck(db: Firestore, snapshot: DocumentSnapshot): Promise<RecheckResult> {
  const data = snapshot.data() as SavedSearchData;
  const domains = [...new Set((data.sources ?? []).map(normaliseDomain).filter(Boolean))];
  const previousLowestPrice = typeof data.lowestPrice === "number" ? data.lowestPrice : null;

  const limit = pLimit(SOURCE_CONCURRENCY);
  const prices = await Promise.all(
    domains.map((domain) =>
      limit(async () => {
        const outcome = await scrapeSource(data.query, domain, data.userSearchUrls?.[domain]);
        if (!outcome.ok) return null;
        const best = outcome.candidates.find((candidate) => candidate.matchConfidence >= CONFIRM_THRESHOLD);
        return best?.price ?? null;
      }),
    ),
  );

  const found = prices.filter((price): price is number => typeof price === "number" && price > 0);
  const lowestPrice = found.length > 0 ? Math.min(...found) : null;

  await snapshot.ref.set(
    {
      ...(lowestPrice !== null ? { lowestPrice, previousLowestPrice } : {}),
      sourceCount: found.length,
      lastCheckedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  // Every check becomes a history point, which is what the dashboard bars read
  // back. Teaching what a good price is needs a record of what the price was.
  if (lowestPrice !== null) {
    await snapshot.ref.collection("pricePoints").add({
      savedSearchId: snapshot.id,
      price: lowestPrice,
      observedAt: FieldValue.serverTimestamp(),
    });
  }

  return { lowestPrice, previousLowestPrice, checkedSources: found.length };
}

/** Re-runs one watched search now instead of waiting for the nightly sweep. */
export const recheckSavedSearch = onCall<{ savedSearchId: string }, Promise<RecheckResult>>(
  { timeoutSeconds: 300, memory: "512MiB" },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "sign in to check a saved search");

    const { savedSearchId } = request.data;
    if (!savedSearchId) throw new HttpsError("invalid-argument", "savedSearchId is required");

    const db = getFirestore();
    const snapshot = await db.collection("savedSearches").doc(savedSearchId).get();
    if (!snapshot.exists) throw new HttpsError("not-found", "that saved search does not exist");
    if ((snapshot.data() as SavedSearchData).userId !== request.auth.uid) {
      throw new HttpsError("permission-denied", "that saved search belongs to someone else");
    }

    return recheck(db, snapshot);
  },
);

/**
 * Nightly sweep over every watched search. Prices move on their own schedule,
 * so a watch that only updates when the user opens the app is not a watch.
 */
export const scheduledRecheck = onSchedule(
  { schedule: "0 3 * * *", timeZone: "Africa/Johannesburg", timeoutSeconds: 540, memory: "512MiB" },
  async () => {
    const db = getFirestore();
    const snapshot = await db.collection("savedSearches").limit(MAX_SAVED_SEARCHES_PER_SWEEP).get();

    const limit = pLimit(SAVED_SEARCH_CONCURRENCY);
    const results = await Promise.all(
      snapshot.docs.map((saved) =>
        limit(async () => {
          try {
            return await recheck(db, saved);
          } catch (error) {
            logger.error(`recheck of ${saved.id} failed`, error);
            return null;
          }
        }),
      ),
    );

    const drops = results.filter(
      (result) =>
        result?.lowestPrice != null &&
        result.previousLowestPrice != null &&
        result.lowestPrice < result.previousLowestPrice,
    ).length;

    logger.info(`rechecked ${snapshot.size} saved searches, ${drops} price drops`);
  },
);
