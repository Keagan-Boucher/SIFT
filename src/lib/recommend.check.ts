/**
 * Run with: npx tsx src/lib/recommend.check.ts
 * Guards the ranking order and the reason shown for each suggested site.
 */
import { guessCategory, recommend } from './recommend';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const NOW = Date.UTC(2026, 10, 11);
const DAY = 86_400_000;

assert(guessCategory('Logitech MX Master 3S mouse')?.id === 'tech', 'a mouse is tech');
assert(guessCategory('Pokemon booster box')?.id === 'trading-cards', 'boosters are trading cards');
assert(guessCategory('garden hose') === null, 'nothing matches a garden hose');
assert(recommend('   ', [], {}).length === 0, 'empty query suggests nothing');
assert(recommend('garden hose', [], {}).length === 0, 'unknown category with no history suggests nothing');

const past = [{ query: 'Logitech G502', sources: ['wootware.co.za', 'takealot.com'], at: NOW - 2 * DAY }];
const ranked = recommend('Logitech MX Master 3S', past, { 'evetech.co.za': true }, NOW);
const order = ranked.map((s) => s.domain);

// evetech: preset + known (5). takealot: preset + history (3). wootware: history only (1).
assert(order.join(',') === 'evetech.co.za,takealot.com,wootware.co.za', `order was ${order.join(',')}`);
assert(ranked[0].reason === 'Page layout already known', 'known layout outranks the preset reason');
assert(ranked[1].reason === 'In the tech preset', 'preset reason outranks history');
assert(ranked[2].reason === 'You priced Logitech G502 here 2 days ago', `history reason was "${ranked[2].reason}"`);

console.log('recommend: ok');
