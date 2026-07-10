/** Money lives everywhere else as integer cents; these two helpers are the
 *  only place that crosses the boundary with a human typing into an input. */

/** Parses "1234,56", "1234.56", "R$ 1.234,56" or a bare "1234" into integer
 *  cents. Accepts either separator as the decimal point — whichever is the
 *  LAST punctuation mark in the string wins, the other is treated as a
 *  thousands separator and stripped. Returns null for empty/unparseable input. */
export function parseMoneyInput(raw: string): number | null {
  const trimmed = raw.trim().replace(/[^\d.,-]/g, "");
  if (!trimmed) return null;

  const lastComma = trimmed.lastIndexOf(",");
  const lastDot = trimmed.lastIndexOf(".");
  const decimalIndex = Math.max(lastComma, lastDot);

  let normalized: string;
  if (decimalIndex === -1) {
    normalized = trimmed;
  } else {
    const whole = trimmed.slice(0, decimalIndex).replace(/[.,]/g, "");
    const frac = trimmed.slice(decimalIndex + 1).replace(/[.,]/g, "");
    normalized = `${whole}.${frac}`;
  }

  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100);
}
