import catalogData from "@/data/cards.json";

export type CardPrinting = {
  id: string; // slug, e.g. "OGN-001"
  name: string;
  rulesText: string;
  flavorText?: string;
  type: string;
  supertype: string | null; // e.g. Champion, Basic, Signature, Token
  domains: string[];
  cost: number | null;
  might: number | null;
  power: number | null;
  keywords: string[];
  rarity: string;
  setCode: string;
  setName: string;
  collectorNumber: string;
  imageSmall: string | null;
  imageLarge: string | null;
  price: number | null; // market price, normal finish, USD
  priceFoil: number | null; // market price, foil finish, USD
  priceSource: string | null;
};

export type CatalogMeta = {
  source: string;
  fetchedAt: string;
  count: number;
  note: string;
};

const raw = catalogData as unknown as {
  meta: CatalogMeta;
  cards: CardPrinting[];
};

export const CATALOG_META: CatalogMeta = raw.meta;
export const CARDS: CardPrinting[] = raw.cards;

export function getCard(id: string): CardPrinting | undefined {
  return CARDS.find((c) => c.id === id);
}

export function otherPrintings(card: CardPrinting): CardPrinting[] {
  return CARDS.filter((c) => c.name === card.name && c.id !== card.id);
}

export type CardFilters = {
  domain?: string;
  type?: string;
  setCode?: string;
  rarity?: string;
  keyword?: string;
};

export function searchCards(
  query: string,
  filters: CardFilters = {},
): CardPrinting[] {
  const q = query.trim().toLowerCase();
  return CARDS.filter((c) => {
    if (q) {
      const hay = `${c.name} ${c.rulesText} ${c.collectorNumber} ${c.id}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filters.domain && !c.domains.includes(filters.domain)) return false;
    if (filters.type && c.type !== filters.type) return false;
    if (filters.setCode && c.setCode !== filters.setCode) return false;
    if (filters.rarity && c.rarity !== filters.rarity) return false;
    if (
      filters.keyword &&
      !c.keywords.some((k) => k.toLowerCase() === filters.keyword!.toLowerCase())
    )
      return false;
    return true;
  });
}

export function distinctValues(
  pick: (c: CardPrinting) => string | string[],
): string[] {
  const set = new Set<string>();
  for (const c of CARDS) {
    const v = pick(c);
    if (Array.isArray(v)) v.forEach((x) => set.add(x));
    else if (v) set.add(v);
  }
  return [...set].sort();
}

export function formatPrice(price: number | null): string {
  if (price === null || price === undefined) return "Unpriced";
  return `$${price.toFixed(2)}`;
}
