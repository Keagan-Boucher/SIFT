import { initializeApp } from "firebase-admin/app";
import { setGlobalOptions } from "firebase-functions/v2";

initializeApp();

/**
 * Co-located with Firestore in europe-west1. A Firestore trigger has to run in
 * the database's region anyway, and putting the callables there too keeps every
 * read and write in-region rather than crossing the Atlantic on each call.
 */
setGlobalOptions({ region: "europe-west1", maxInstances: 10 });

export { resolveListingUrl } from "./resolution";
export { extractListing } from "./extraction";
export { onSearchCreated, confirmMatch } from "./pipeline/runSearch";
export { recheckSavedSearch, scheduledRecheck } from "./pipeline/recheck";
