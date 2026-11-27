/**
 * Run with: npx tsx src/lib/map-to-view.check.ts
 * Guards the resume card: a search the pipeline has settled must never stay "in progress".
 */
import { toSearchSummary } from './map-to-view';
import type { SearchDoc } from '@/types/firestore';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const search = (fields: Partial<SearchDoc>) =>
  toSearchSummary({ id: 's', userId: 'u', query: 'q', status: 'pending', sources: [], ...fields } as unknown as SearchDoc);

assert(!search({ status: 'extracting', step: 'scan' }).finished, 'a running scan is resumable');
assert(search({ status: 'extracting', step: 'confirm' }).step === 'confirm', 'a running search resumes where it was left');
assert(search({ status: 'complete', step: 'scan' }).finished, 'a completed run left on the scan screen is finished');
assert(search({ status: 'failed', step: 'scan' }).finished, 'a failed run is finished');
assert(search({ status: 'complete', step: 'scan' }).step === 'compare', 'a finished search opens on compare');
assert(search({ status: 'pending' }).step === 'scan', 'an old search with no step resumes on scan');

console.log('map-to-view: ok');
