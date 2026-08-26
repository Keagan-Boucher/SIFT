/**
 * Run with: npx tsx src/lib/spread-layout.check.ts
 * Guards the one rule the spread axis exists to keep: no two point labels overlap.
 */
import { POINT_WIDTH, layoutPoints } from './spread-layout';

const WIDTH = 520;
const MIN_CLEARANCE = POINT_WIDTH;

function assertNoOverlap(values: number[], label: string) {
  const lefts = layoutPoints(values, WIDTH);
  const sorted = [...lefts].sort((a, b) => a - b);
  sorted.forEach((left, i) => {
    if (i > 0 && left - sorted[i - 1] < MIN_CLEARANCE) {
      throw new Error(`${label}: points ${sorted[i - 1]} and ${left} overlap`);
    }
    if (left < 0 || left > WIDTH - MIN_CLEARANCE) throw new Error(`${label}: ${left} is off the track`);
  });
}

// The screenshot that started this: two of three prices bunched at the top.
assertNoOverlap([199, 5990, 6000], 'bunched at the high end');
assertNoOverlap([199, 205, 210], 'bunched at the low end');
assertNoOverlap([500, 500, 500], 'identical prices');
assertNoOverlap([100, 5000], 'two points');

// Order is preserved: cheaper never lands right of dearer.
const lefts = layoutPoints([6000, 199, 5990], WIDTH);
if (!(lefts[1] < lefts[2] && lefts[2] < lefts[0])) throw new Error('value order not preserved');

console.log('TheSpread layout OK');
