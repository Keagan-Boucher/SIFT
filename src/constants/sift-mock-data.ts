/**
 * Placeholder data mirroring the SIFT prototype's embedded mock dataset
 * (SIFT App.dc.html, Claude Design project 8d3377b4-2d47-4f71-a286-de0ccb7919bb).
 * No live scraping/backend — this is the same static seed the prototype ships with.
 */

import type {
  CandidateView,
  NoteView,
  RecentView,
  SavedItemView,
  SourceView,
  TileView,
} from '@/types/view';

/**
 * Aliases kept so the seeded dataset reads as itself while sharing the view
 * model with the live Firestore stream.
 */
export type MockSource = SourceView;
export type MockTile = TileView;
export type MockCandidate = CandidateView;
export type MockSavedItem = SavedItemView;
export type MockNote = NoteView;
export type MockRecent = RecentView;

export const DEFAULT_QUERY = 'Samsung Galaxy S24 Ultra 256GB';

export const SOURCES: MockSource[] = [
  { domain: 'takealot.com', status: 'RESOLVED' },
  { domain: 'loot.co.za', status: 'PENDING' },
  { domain: 'evetech.co.za', status: 'PENDING' },
  { domain: 'incredible.co.za', status: 'BLOCKED' },
  { domain: 'makro.co.za', status: 'PENDING' },
];

export const TILES: MockTile[] = [
  {
    retailer: 'Takealot',
    domain: 'takealot.com',
    tier: 3,
    confidence: 4,
    price: 'R2 899',
    value: 2899,
    lowest: true,
    title: 'Samsung Galaxy S24 Ultra 256GB, Titanium Black',
    url: 'takealot.com/samsung-galaxy-s24-ultra-256gb/PLID94422018',
    method: 'T3 · JSON-LD',
    stock: 'IN STOCK',
  },
  {
    retailer: 'Loot',
    domain: 'loot.co.za',
    tier: 3,
    confidence: 3,
    price: 'R3 150',
    value: 3150,
    title: 'Samsung Galaxy S24 Ultra 256GB Dual SIM',
    url: 'loot.co.za/product/samsung-galaxy-s24-ultra-256gb/hgtr-1099-g090',
    method: 'T3 · OPEN GRAPH',
    stock: 'IN STOCK',
  },
  {
    retailer: 'Evetech',
    domain: 'evetech.co.za',
    tier: 4,
    confidence: 2,
    price: 'R3 240',
    value: 3240,
    count: 2,
    issue: true,
    title: 'Samsung Galaxy S24 Ultra (unconfirmed match)',
    url: 'evetech.co.za/search?q=galaxy+s24+ultra+256gb',
    method: 'T4 · HEURISTIC HTML',
    stock: 'UNKNOWN',
  },
  {
    retailer: 'Makro',
    domain: 'makro.co.za',
    tier: 4,
    confidence: 1,
    price: 'R3 890',
    value: 3890,
    title: 'Samsung Galaxy S24 Ultra 256GB',
    url: 'makro.co.za/electronics/cellphones/p/000000000000559211',
    method: 'T4 · HEURISTIC HTML',
    stock: 'LOW STOCK',
  },
];

export const CANDIDATES: MockCandidate[] = [
  { title: 'Samsung Galaxy S24 Ultra 256GB, Titanium Black', price: 'R3 480', value: 3480, confidence: 0.42 },
  { title: 'Samsung Galaxy S24 Ultra 512GB, Titanium Grey', price: 'R3 620', value: 3620, confidence: 0.55 },
];

export const HISTORY: number[] = [
  3320, 3290, 3300, 3410, 3380, 3350, 3210, 3180, 3240, 3160, 3120, 3050, 2960, 2780, 2840, 3010, 3090, 3040, 2980,
  2899,
];

export const INITIAL_SAVED: MockSavedItem[] = [
  { id: 's1', name: 'Samsung Galaxy S24 Ultra 256GB', value: 2899, sources: 4, dropTo: 2780, checked: false, justDropped: false, lastChecked: null },
  { id: 's2', name: 'LG C4 42" OLED', value: 14299, sources: 3, dropTo: null, checked: false, justDropped: false, lastChecked: null },
  { id: 's3', name: 'Logitech MX Master 3S', value: 1549, sources: 3, dropTo: null, checked: false, justDropped: false, lastChecked: null },
];

export const INITIAL_NOTES: MockNote[] = [
  {
    id: 'robots-init',
    kind: 'block',
    domain: 'incredible.co.za',
    heading: 'ROBOTS_BLOCKED',
    body: 'incredible.co.za asks not to be scraped. Remove this source to continue.',
  },
];

export const INITIAL_RECENTS: MockRecent[] = [
  { name: 'LG C4 42" OLED', meta: 'R14 299 LOW · 3D AGO' },
  { name: 'Logitech MX Master 3S', meta: 'R1 549 LOW · 6D AGO' },
  { name: 'Ryzen 5 7600X', meta: 'R4 199 LOW · 11D AGO' },
];

export const STREAM_SPEED_MS = 700;
export const TEACHING_MODE = true;
export const SHOW_NOTES = true;
