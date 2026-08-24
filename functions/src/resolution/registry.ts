import { getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import type { ResolutionMethod, ResolutionResult } from "../types";
import { buildFromTemplate, validateTemplate } from "./template";

const COLLECTION = "retailerTemplates";

/**
 * Templates that keep failing are worse than no template, because they short
 * -circuit the rest of the cascade. Past this ratio the registry hit is skipped
 * and the domain gets re-resolved from scratch.
 */
const MAX_FAILURE_RATIO = 0.5;
const MIN_ATTEMPTS_BEFORE_DISTRUST = 4;

/**
 * The registry is the one part of the scraper that needs Firestore. Outside a
 * deployed function (a parser test, a local dry run) there is no admin app, and
 * the cascade should still work without one.
 */
function registryAvailable(): boolean {
  return getApps().length > 0;
}

interface TemplateDoc {
  searchUrlPattern?: string;
  successCount?: number;
  failureCount?: number;
}

/**
 * Looks up a previously solved search-URL template for this domain.
 * Every successful resolution elsewhere writes back here, so a site
 * solved once is solved for everyone after.
 */
export async function resolveFromRegistry(domain: string, query: string): Promise<ResolutionResult | null> {
  if (!registryAvailable()) return null;

  let template: TemplateDoc;
  try {
    const doc = await getFirestore().collection(COLLECTION).doc(domain).get();
    if (!doc.exists) return null;
    template = doc.data() as TemplateDoc;
  } catch (error) {
    // A registry that is unreachable should slow the cascade down, not break it:
    // methods B and C still resolve the domain from scratch.
    logger.warn(`registry lookup for ${domain} failed`, error);
    return null;
  }

  if (!template.searchUrlPattern || !validateTemplate(template.searchUrlPattern)) return null;

  const successes = template.successCount ?? 0;
  const failures = template.failureCount ?? 0;
  const attempts = successes + failures;
  if (attempts >= MIN_ATTEMPTS_BEFORE_DISTRUST && failures / attempts > MAX_FAILURE_RATIO) return null;

  return {
    method: "registry",
    listingUrl: buildFromTemplate(template.searchUrlPattern, query),
    confidence: 0.9,
    // Carried so the caller can rebuild the URL with a relaxed query.
    searchUrlPattern: template.searchUrlPattern,
  };
}

/**
 * Write-back. A template discovered by form discovery, platform fingerprinting
 * or pasted by the user is stored against the domain so the next search on that
 * site short-circuits straight to method A.
 */
export async function recordTemplate(domain: string, pattern: string, method: ResolutionMethod): Promise<void> {
  if (!validateTemplate(pattern) || !registryAvailable()) return;

  try {
    await getFirestore()
      .collection(COLLECTION)
      .doc(domain)
      .set(
        {
          domain,
          searchUrlPattern: pattern,
          resolutionMethod: method,
          lastValidatedAt: FieldValue.serverTimestamp(),
          successCount: FieldValue.increment(0),
          failureCount: FieldValue.increment(0),
        },
        { merge: true },
      );
  } catch (error) {
    // Write-back is an optimisation for the next search, never a reason to fail this one.
    logger.warn(`registry write-back for ${domain} failed`, error);
  }
}

/**
 * Records whether the stored template actually produced a listing. This is the
 * deterministic learning in the system: counted outcomes, not inference.
 */
export async function recordOutcome(domain: string, succeeded: boolean): Promise<void> {
  if (!registryAvailable()) return;

  try {
    const doc = getFirestore().collection(COLLECTION).doc(domain);
    const snapshot = await doc.get();
    if (!snapshot.exists) return;

    await doc.set(
      succeeded
        ? { successCount: FieldValue.increment(1), lastValidatedAt: FieldValue.serverTimestamp() }
        : { failureCount: FieldValue.increment(1) },
      { merge: true },
    );
  } catch (error) {
    logger.warn(`registry outcome for ${domain} failed`, error);
  }
}
