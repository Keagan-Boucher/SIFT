export const POINT_WIDTH = 72;
/** Clear air between two labels, so neighbouring names read as separate. */
const POINT_GAP = 8;

/**
 * Left edge for every point, in input order. Points are placed by value, then
 * swept low-to-high pushing each clear of the one before it and high-to-low
 * pulling any that ran off the right edge back in. Two retailers a rand apart
 * therefore sit side by side instead of on top of each other.
 *
 * ponytail: past floor(width / (POINT_WIDTH + POINT_GAP)) points there is no
 * room left to separate them and they will touch again. Stagger onto a second
 * row if a search ever compares that many sources.
 */
export function layoutPoints(values: number[], width: number): number[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const order = values.map((_, index) => index).sort((a, b) => values[a] - values[b]);
  const lefts = new Array<number>(values.length).fill(0);

  let cursor = 0;
  for (const index of order) {
    const raw = ((values[index] - min) / (max - min || 1)) * width - POINT_WIDTH / 2;
    lefts[index] = Math.max(raw, cursor);
    cursor = lefts[index] + POINT_WIDTH + POINT_GAP;
  }

  let limit = width - POINT_WIDTH;
  for (let i = order.length - 1; i >= 0; i -= 1) {
    lefts[order[i]] = Math.max(0, Math.min(lefts[order[i]], limit));
    limit = lefts[order[i]] - POINT_WIDTH - POINT_GAP;
  }

  return lefts;
}
