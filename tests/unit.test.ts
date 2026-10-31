import { describe, expect, it } from "vitest";
import { priceTotal } from "@/lib/pricing";
import { validateDeck, energyCurve, domainBreakdown } from "@/lib/legality";
import { encodeDeck, decodeDeck, parseDeckText, deckToText } from "@/lib/deck-codec";
import { winRate } from "@/lib/store";

describe("pricing", () => {
  it("sums nothing for an empty list", () => {
    expect(priceTotal([])).toEqual({ total: 0, unpriced: [] });
  });
  it("reports unknown cards as unpriced, not as a crash", () => {
    const r = priceTotal([{ cardId: "NOPE-999", qty: 2, foil: false }]);
    expect(r.total).toBe(0);
    expect(r.unpriced).toEqual(["NOPE-999"]);
  });
});

describe("legality", () => {
  it("never hard-fails on unverified rules", () => {
    const violations = validateDeck([]);
    const hard = violations.filter((v) => !v.unverifiedRule);
    expect(hard).toEqual([]);
    // Notes exist for the unverified main-size / legend rules.
    expect(violations.length).toBeGreaterThan(0);
  });
  it("flags more than one legend as a hard violation", () => {
    const violations = validateDeck([
      { cardId: "A-1", qty: 1, zone: "legend" },
      { cardId: "B-2", qty: 1, zone: "legend" },
    ]);
    expect(
      violations.some(
        (v) => v.code === "too-many-legends" && !v.unverifiedRule,
      ),
    ).toBe(true);
  });
  it("returns empty curve/breakdown for unknown cards", () => {
    expect(energyCurve([{ cardId: "NOPE-1", qty: 3, zone: "main" }])).toEqual([]);
    expect(domainBreakdown([{ cardId: "NOPE-1", qty: 3, zone: "main" }])).toEqual([]);
  });
});

describe("deck codec", () => {
  it("round-trips a deck through encode/decode", () => {
    const share = {
      v: 1 as const,
      name: "Test deck",
      format: "Standard" as const,
      legendId: "OGN-001",
      championId: null,
      cards: [
        { cardId: "OGN-002", qty: 3, zone: "main" as const },
        { cardId: "OGN-003", qty: 1, zone: "rune" as const },
      ],
    };
    const decoded = decodeDeck(encodeDeck(share));
    expect(decoded).toEqual(share);
  });
  it("rejects garbage codes", () => {
    expect(decodeDeck("not-a-deck!!!")).toBeNull();
  });
  it("parses plain-text lists", () => {
    expect(parseDeckText("3 OGN-001\n1x Jinx\nJunk line")).toEqual([
      { qty: 3, label: "OGN-001" },
      { qty: 1, label: "Jinx" },
    ]);
  });
  it("exports text grouped by zone", () => {
    const text = deckToText(
      "D",
      [
        { cardId: "X", qty: 2, zone: "main" },
        { cardId: "Y", qty: 1, zone: "rune" },
      ],
      (id) => id,
    );
    expect(text).toContain("Main:");
    expect(text).toContain("2 X");
    expect(text).toContain("Rune:");
  });
});

describe("win rate", () => {
  it("computes wins/losses/rate and null for no games", () => {
    expect(winRate([])).toEqual({ wins: 0, losses: 0, rate: null });
    expect(
      winRate([
        { gamesWon: 2, gamesLost: 1 },
        { gamesWon: 1, gamesLost: 1 },
      ]),
    ).toEqual({ wins: 3, losses: 2, rate: 0.6 });
  });
});
