/** Plain BRL formatting for prompt text and action descriptions — doesn't
 *  need to match the UI's locale-aware `useMoneyFormat()`, just be readable. */
export function brl(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  return `${sign}R$ ${(Math.abs(cents) / 100).toFixed(2).replace(".", ",")}`;
}
