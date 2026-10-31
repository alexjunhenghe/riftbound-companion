/**
 * Deck-construction rules, encoded as data rows — not hardcoded logic.
 *
 * VERIFIED 2026-10-31 against official sources (see docs/RULES.md):
 * Riot's Rules Hub, the Riftbound Core Rules (CR, updated Oct 9, 2026),
 * and the Riftbound Tournament Rules (TR, updated Oct 9, 2026).
 * Every rule below carries its citation. Anything the official text
 * does not cover is marked as an interpretation or left out of hard
 * checks entirely — the validator must never present an unverified
 * rule as a hard legality failure.
 *
 * Default scope: Constructed (Standard / 2v2). Casual play differs
 * (CR 103.3: main deck "at least 40"); Limited (Sealed/Draft) differs
 * much more (see docs/RULES.md) and is not a format in this app.
 */
export type DeckRules = {
  version: string;
  /** Main deck size, Constructed, INCLUDING the Chosen Champion (TR 402.1). */
  mainDeckSize: number;
  /** Max copies of one named card across Main Deck (+ Sideboard) (CR 103.3.b). */
  maxCopiesPerCard: number;
  /** Max Signature cards total per deck (CR 103.3.d.1). */
  maxSignaturesTotal: number;
  /** Rune deck size, Constructed (CR 103.4). No copy limit (see docs/RULES.md). */
  runeDeckSize: number;
  /** Battlefields provided per player, each a unique name (TR 402.1, CR 103.5.c). */
  battlefieldCount: number;
  /** Sideboard max, where allowed; Main-Deck-valid cards only (TR 601.1.c). */
  sideboardMax: number;
  /** Exactly 1 Champion Legend, NOT counted in the 40 (CR 103.2, TR 402.1). */
  legendRequired: boolean;
  /** A Chosen Champion is required and counts toward the 40 (TR 402.1). */
  championRequired: boolean;
  /** The Legend does not count toward main deck size (TR 402.1). */
  legendCountsTowardMain: boolean;
  /** The Chosen Champion counts toward main deck size (TR 402.1). */
  championCountsTowardMain: boolean;
  /** Standard-legal banned card names (Rules Hub, updated Sep 18, 2026). */
  bannedStandard: string[];
  /** Additional bans for 2v2 only (Rules Hub). */
  banned2v2Extra: string[];
  /** No restricted list is published (verified absence, see docs/RULES.md). */
  restricted: Record<string, number>;
};

export const RULES: DeckRules = {
  version: "2026-10-31",
  mainDeckSize: 40,
  maxCopiesPerCard: 3,
  maxSignaturesTotal: 3,
  runeDeckSize: 12,
  battlefieldCount: 3,
  sideboardMax: 10,
  legendRequired: true,
  championRequired: true,
  legendCountsTowardMain: false,
  championCountsTowardMain: true,
  bannedStandard: [
    // Cards (Rules Hub, Standard Constructed).
    "Called Shot",
    "Ekko, Recurrent",
    "Draven, Vanquisher",
    "Fight or Flight",
    "Scrapheap",
    "Stealthy Pursuer",
    "Stacked Deck",
    // Battlefields (Rules Hub, Standard Constructed).
    "The Arena's Greatest",
    "Aspirant's Climb",
    "Dreaming Tree",
    "Obelisk of Power",
    "Reaver's Row",
  ],
  banned2v2Extra: [
    // 2v2-only ban; still legal in 1v1 Standard (Rules Hub).
    "Master Yi, Wuju Bladesman",
  ],
  restricted: {},
};

export const FORMATS = ["Standard", "2v2"] as const;
export type Format = (typeof FORMATS)[number];

export const ZONES = [
  "legend",
  "champion",
  "main",
  "battlefield",
  "rune",
  "sideboard",
] as const;
export type Zone = (typeof ZONES)[number];

/** Banned names for a format (base names; see baseName in legality.ts). */
export function bannedFor(format: Format): string[] {
  return format === "2v2"
    ? [...RULES.bannedStandard, ...RULES.banned2v2Extra]
    : RULES.bannedStandard;
}
