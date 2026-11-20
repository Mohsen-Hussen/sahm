/** Days until a product runs out at its 30-day sales pace; null when it isn't selling. */
export function daysOfCover(stock: number, sold30d: number) {
  if (sold30d <= 0) return null;
  return Math.floor(stock / (sold30d / 30));
}
