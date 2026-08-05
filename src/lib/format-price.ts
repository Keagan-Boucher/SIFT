/** Formats a ZAR amount with thousands-space grouping, e.g. 2899 -> "R2 899". */
export function fmtPrice(value: number): string {
  return 'R' + String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
