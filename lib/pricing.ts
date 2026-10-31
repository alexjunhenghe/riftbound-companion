import { getCard } from "./catalog";

export type PricedLine = { cardId: string; qty: number; foil: boolean };

/** Sum of qty × latest price per line. Lines with unknown cards or
 *  unpriced printings contribute 0 and are reported via `unpriced`. */
export function priceTotal(lines: PricedLine[]): {
  total: number;
  unpriced: string[];
} {
  let total = 0;
  const unpriced: string[] = [];
  for (const line of lines) {
    const card = getCard(line.cardId);
    if (!card) {
      unpriced.push(line.cardId);
      continue;
    }
    const price = line.foil ? card.priceFoil : card.price;
    if (price === null || price === undefined) {
      unpriced.push(line.cardId);
      continue;
    }
    total += line.qty * price;
  }
  return { total: Math.round(total * 100) / 100, unpriced };
}

export function collectionValue(
  items: Record<string, { qty: number; qtyFoil: number }>,
): { total: number; unpriced: string[] } {
  const lines: PricedLine[] = [];
  for (const [cardId, v] of Object.entries(items)) {
    if (v.qty > 0) lines.push({ cardId, qty: v.qty, foil: false });
    if (v.qtyFoil > 0) lines.push({ cardId, qty: v.qtyFoil, foil: true });
  }
  return priceTotal(lines);
}
