import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { setGlobalOptions } from "firebase-functions/v2";

initializeApp();

/**
 * Several document fields are genuinely optional: a source that failed before
 * resolving has no method, a listing that was never confirmed has no confirmer.
 * Without this the admin SDK rejects the whole write rather than omitting the
 * field, which is never what is wanted here.
 */
getFirestore().settings({ ignoreUndefinedProperties: true });

/**
 * Co-located with Firestore in africa-south1. A Firestore trigger has to run in
 * the database's region anyway, and putting the callables there too keeps every
 * read and write in-region rather than crossing a continent on each call.
 *
 * Johannesburg rather than Europe because the retailers being scraped are South
 * African, and the difference is not marginal: measured against geekhome.co.za
 * and evetech.co.za, africa-south1 answered in 13-200ms where europe-west1 took
 * 190-1400ms for byte-identical responses. The pipeline fetches several
 * candidate URLs per source, serially and rate-limited per host, so that gap
 * compounds across a single search.
 */
setGlobalOptions({ region: "africa-south1", maxInstances: 10 });

export { resolveListingUrl } from "./resolution";
export { extractListing } from "./extraction";
export { onSearchCreated, confirmMatch } from "./pipeline/runSearch";
export { recheckSavedSearch, scheduledRecheck } from "./pipeline/recheck";
