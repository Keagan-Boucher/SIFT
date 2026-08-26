import { doc, getDoc } from 'firebase/firestore';

import { db } from '@/lib/firebase';

/**
 * The scraper distrusts a stored template once it has failed more than half of
 * at least this many attempts, and re-resolves from scratch instead. Mirrored
 * here so a chip never promises a resolution the pipeline will discard.
 * Keep in step with functions/src/resolution/registry.ts.
 */
const MAX_FAILURE_RATIO = 0.5;
const MIN_ATTEMPTS_BEFORE_DISTRUST = 4;

/**
 * True when this domain is already solved for everyone: the registry holds a
 * search-URL template the pipeline still trusts. A site someone else resolved
 * needs no resolving again, so the user sees that before they run anything.
 */
export async function isDomainKnown(domain: string): Promise<boolean> {
  const snapshot = await getDoc(doc(db, 'retailerTemplates', domain));
  const template = snapshot.data();
  if (!template?.searchUrlPattern) return false;

  const successes = (template.successCount as number) ?? 0;
  const failures = (template.failureCount as number) ?? 0;
  const attempts = successes + failures;
  return !(attempts >= MIN_ATTEMPTS_BEFORE_DISTRUST && failures / attempts > MAX_FAILURE_RATIO);
}
