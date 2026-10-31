/**
 * Deck-construction rules, encoded as data rows — not hardcoded logic.
 *
 * VERIFICATION STATUS: every numeric rule below is marked with
 * `verified`. Rules marked verified:false are NOT confirmed against an
 * official source and must not be presented to users as fact; the
 * validator surfaces them as "unverified rule" notes instead of hard
 * violations. Update this file (and flip verified:true with a source
 * citation) only after checking the official Riftbound rules.
 *
 * Sources are recorded in docs/RULES.md.
 */
export type DeckRules = {
  version: string;
  effectiveDate: string;
  /** Cards in the main deck, excluding legend/champion/battlefield/rune zones. */
  mainDeckSize: number;
  mainDeckSizeVerified: boolean;
  /** Max copies of one card in the main deck. */
  maxCopiesPerCard: number;
  maxCopiesVerified: boolean;
  /** Whether a legend is required. */
  legendRequired: boolean;
  legendRequiredVerified: boolean;
  /** Whether a champion is required. */
  championRequired: boolean;
  championRequiredVerified: boolean;
  /** Whether legend/champion count toward main deck size. */
  leadersCountTowardMain: boolean;
  leadersCountVerified: boolean;
  banned: string[]; // card ids
  restricted: Record<string, number>; // card id -> max copies
};

export const RULES: DeckRules = {
  version: "2026-10-30",
  effectiveDate: "2026-10-30",
  mainDeckSize: 40,
  mainDeckSizeVerified: false,
  maxCopiesPerCard: 3,
  maxCopiesVerified: false,
  legendRequired: true,
  legendRequiredVerified: false,
  championRequired: false,
  championRequiredVerified: false,
  leadersCountTowardMain: false,
  leadersCountVerified: false,
  banned: [],
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
