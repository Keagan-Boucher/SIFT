import { getFirestore, FieldValue } from "firebase-admin/firestore";
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
  const doc = await getFirestore().collection(COLLECTION).doc(domain).get();
  if (!doc.exists) return null;

  const template = doc.data() as TemplateDoc;
  if (!template.searchUrlPattern || !validateTemplate(template.searchUrlPattern)) return null;

  const successes = template.successCount ?? 0;
  const failures = template.failureCount ?? 0;
  const attempts = successes + failures;
  if (attempts >= MIN_ATTEMPTS_BEFORE_DISTRUST && failures / attempts > MAX_FAILURE_RATIO) return null;

  return {
    method: "registry",
    listingUrl: buildFromTemplate(template.searchUrlPattern, query),
    confidence: 0.9,
  };
}

/**
 * Write-back. A template discovered by form discovery, platform fingerprinting
 * or pasted by the user is stored against the domain so the next search on that
 * site short-circuits straight to method A.
 */
export async function recordTemplate(domain: string, pattern: string, method: ResolutionMethod): Promise<void> {
  if (!validateTemplate(pattern)) return;

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
}

/**
 * Records whether the stored template actually produced a listing. This is the
 * deterministic learning in the system: counted outcomes, not inference.
 */
export async function recordOutcome(domain: string, succeeded: boolean): Promise<void> {
  const doc = getFirestore().collection(COLLECTION).doc(domain);
  const snapshot = await doc.get();
  if (!snapshot.exists) return;

  await doc.set(
    succeeded
      ? { successCount: FieldValue.increment(1), lastValidatedAt: FieldValue.serverTimestamp() }
      : { failureCount: FieldValue.increment(1) },
    { merge: true },
  );
}
