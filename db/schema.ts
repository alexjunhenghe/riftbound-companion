/**
 * Drizzle schema for the future Postgres-backed phase (accounts + sync).
 * The shipped app is local-first and does NOT require a database: the
 * browser store in lib/store.tsx mirrors these tables in localStorage.
 * This schema exists so the sync phase has a typed target to migrate to.
 *
 * Requires drizzle-orm + a Postgres driver when that phase starts; it is
 * not imported by any shipped page, so no database is needed to run the
 * app today.
 */
export type UserRow = {
  id: string;
  handle: string;
  createdAt: string;
};

export type SetRow = {
  id: string;
  code: string;
  name: string;
  releaseDate: string | null;
};

export type CardRow = {
  id: string;
  externalId: string;
  riftboundId: string;
  name: string;
  rulesText: string;
  flavorText: string | null;
  type: string;
  domains: string[];
  cost: number | null;
  might: number | null;
  power: number | null;
  keywords: string[];
  rarity: string;
  setId: string;
  collectorNumber: string;
  imageUrlSmall: string | null;
  imageUrlLarge: string | null;
};

export type PriceRow = {
  printingId: string;
  source: string;
  marketPrice: number | null;
  lowPrice: number | null;
  currency: string;
  fetchedAt: string;
};

export type CollectionItemRow = {
  userId: string;
  printingId: string;
  qty: number;
  qtyFoil: number;
};

export type DeckRow = {
  id: string;
  userId: string;
  name: string;
  format: string;
  legendId: string | null;
  championId: string | null;
  description: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DeckCardRow = {
  deckId: string;
  printingId: string;
  zone: string;
  qty: number;
};

export type MatchRow = {
  id: string;
  userId: string;
  deckId: string;
  opponentLegend: string;
  opponentArchetype: string | null;
  format: string;
  gamesWon: number;
  gamesLost: number;
  eventName: string | null;
  playedAt: string;
  notes: string;
};
