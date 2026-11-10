import { useEffect, useState } from 'react';
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

/** The answer is the same for everyone, so one read per domain per app run is enough. */
const knownCache: Record<string, boolean> = {};

/** Registry lookups for a set of domains, filling in as each answers. Missing means not answered yet. */
export function useKnownDomains(domains: string[]): Record<string, boolean> {
  const [known, setKnown] = useState<Record<string, boolean>>(() => ({ ...knownCache }));
  const key = domains.join(',');

  useEffect(() => {
    let live = true;
    key
      .split(',')
      .filter((domain) => domain && knownCache[domain] === undefined)
      .forEach((domain) => {
        isDomainKnown(domain)
          .then((result) => {
            knownCache[domain] = result;
            if (live) setKnown((current) => ({ ...current, [domain]: result }));
          })
          .catch(() => {});
      });
    return () => {
      live = false;
    };
  }, [key]);

  return known;
}
