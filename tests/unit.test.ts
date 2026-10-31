import { describe, expect, it } from "vitest";
import { priceTotal } from "@/lib/pricing";
import { CARDS } from "@/lib/catalog";
import {
  baseName,
  championPrefix,
  domainsFit,
  validateDeck,
  energyCurve,
  domainBreakdown,
  type DeckEntry,
  type Violation,
} from "@/lib/legality";
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

// Fixtures from the real catalogue (Jinx, Loose Cannon: Fury + Chaos).
const LEGEND = "ogn-251-298";
const CHAMP = "ogn-030-298"; // Jinx, Demolitionist
const CHAMP_ALT = "ogn-030a-298"; // same base name, alt art
const CHAMP_REBEL = "ogn-202-298"; // Jinx, Rebel
const CHAMP_WRONG_TAG = "ogn-027-298"; // Darius, Trifarian
const FURY_RUNE = "ogn-007-298";
const CALM_RUNE = "ogn-042-298";
const BF1 = "ogn-275-298";
const BF2 = "ogn-277-298";
const BF3 = "ogn-278-298";
const BANNED_BF = "ogn-276-298"; // Aspirant's Climb
const BANNED_CARD = "ogn-183-298"; // Stacked Deck
const MASTER_YI = "tcg:680257"; // Master Yi, Wuju Bladesman (2v2-only ban)
const SIG_UNIT = "ogs-018-024"; // Tibbers (Signature unit)

/** A fully legal Constructed deck: legend + champion + 39 main (13
 *  distinct in-identity names × 3) + 12 runes + 3 battlefields. */
function legalDeck(): { entries: DeckEntry[]; opts: object } {
  const seen = new Set<string>();
  const mains: DeckEntry[] = [];
  for (const c of CARDS) {
    if (mains.length >= 13) break;
    if (c.type === "Legend" || c.type === "Battlefield" || c.type === "Rune") continue;
    if (c.supertype === "Signature" || c.supertype === "Token") continue;
    if (!c.domains.every((d) => ["Fury", "Chaos", "Colorless"].includes(d))) continue;
    const base = baseName(c.name);
    if (seen.has(base)) continue;
    seen.add(base);
    mains.push({ cardId: c.id, qty: 3, zone: "main" });
  }
  expect(mains.length).toBe(13);
  return {
    entries: [
      ...mains,
      { cardId: FURY_RUNE, qty: 12, zone: "rune" },
      { cardId: BF1, qty: 1, zone: "battlefield" },
      { cardId: BF2, qty: 1, zone: "battlefield" },
      { cardId: BF3, qty: 1, zone: "battlefield" },
    ],
    opts: { legendId: LEGEND, championId: CHAMP, format: "Standard" as const },
  };
}

const hard = (vs: Violation[]) => vs.filter((v) => !v.unverifiedRule);

describe("legality (verified CR/TR rules)", () => {
  it("passes a fully legal deck with zero violations", () => {
    const { entries, opts } = legalDeck();
    expect(validateDeck(entries, opts)).toEqual([]);
  });
  it("counts the champion toward the 40, never the legend", () => {
    const { entries, opts } = legalDeck();
    // Drop one main copy -> 39 total -> main-size fires.
    const short = entries.map((e) =>
      e.zone === "main" ? { ...e, qty: e.qty } : e,
    );
    short[0] = { ...short[0], qty: 2 };
    expect(
      validateDeck(short, opts).some((v) => v.code === "main-size"),
    ).toBe(true);
  });
  it("requires legend and champion", () => {
    const { entries } = legalDeck();
    const codes = validateDeck(entries, {}).map((v) => v.code);
    expect(codes).toContain("missing-legend");
    expect(codes).toContain("missing-champion");
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
  it("caps copies per base name across printings and champion", () => {
    const { entries, opts } = legalDeck();
    // 2 base + 2 alt-art of Demolitionist in main, champion is Rebel.
    const v1 = validateDeck(
      [
        ...entries,
        { cardId: CHAMP, qty: 2, zone: "main" },
        { cardId: CHAMP_ALT, qty: 2, zone: "main" },
      ],
      { legendId: LEGEND, championId: CHAMP_REBEL, format: "Standard" },
    );
    expect(v1.some((v) => v.code === "copy-cap")).toBe(true);
    // Champion counts toward its own name: 3 in main + champion = 4.
    const v2 = validateDeck(
      [...entries, { cardId: CHAMP, qty: 3, zone: "main" }],
      opts,
    );
    expect(v2.some((v) => v.code === "copy-cap")).toBe(true);
  });
  it("enforces rune size 12 with no copy limit, and rune domain identity", () => {
    const { entries, opts } = legalDeck();
    const shortRunes = entries.map((e) =>
      e.zone === "rune" ? { ...e, qty: 11 } : e,
    );
    expect(
      validateDeck(shortRunes, opts).some((v) => v.code === "rune-size"),
    ).toBe(true);
    const calmRunes = entries.map((e) =>
      e.zone === "rune" ? { ...e, cardId: CALM_RUNE } : e,
    );
    expect(
      validateDeck(calmRunes, opts).some((v) => v.code === "domain"),
    ).toBe(true);
  });
  it("enforces battlefield count and unique names", () => {
    const { entries, opts } = legalDeck();
    const two = entries.filter((e) => e.zone !== "battlefield").concat([
      { cardId: BF1, qty: 1, zone: "battlefield" },
      { cardId: BF2, qty: 1, zone: "battlefield" },
    ]);
    expect(validateDeck(two, opts).some((v) => v.code === "battlefield-size")).toBe(true);
    const dup = entries.map((e) =>
      e.cardId === BF3 ? { ...e, cardId: BF1 } : e,
    );
    expect(
      validateDeck(dup, opts).some((v) => v.code === "battlefield-duplicate"),
    ).toBe(true);
  });
  it("enforces the sideboard cap", () => {
    const { entries, opts } = legalDeck();
    const wide = [
      ...entries,
      { cardId: "ogn-001-298", qty: 11, zone: "sideboard" as const },
    ];
    expect(
      validateDeck(wide, opts).some((v) => v.code === "sideboard-size"),
    ).toBe(true);
  });
  it("enforces the banned list, including the 2v2-only Master Yi ban", () => {
    const { entries, opts } = legalDeck();
    const withBanned = [
      ...entries,
      { cardId: BANNED_CARD, qty: 1, zone: "main" as const },
    ];
    expect(validateDeck(withBanned, opts).some((v) => v.code === "banned")).toBe(true);
    const withBannedBf = entries.map((e) =>
      e.cardId === BF3 ? { ...e, cardId: BANNED_BF } : e,
    );
    expect(
      validateDeck(withBannedBf, opts).some((v) => v.code === "banned"),
    ).toBe(true);
    const yi2v2 = validateDeck(entries, {
      legendId: MASTER_YI,
      championId: CHAMP,
      format: "2v2",
    });
    expect(yi2v2.some((v) => v.code === "banned")).toBe(true);
    const yi1v1 = validateDeck(entries, {
      legendId: MASTER_YI,
      championId: CHAMP,
      format: "Standard",
    });
    expect(yi1v1.some((v) => v.code === "banned")).toBe(false);
  });
  it("enforces champion tag match and signature exclusion", () => {
    const { entries } = legalDeck();
    const wrongTag = validateDeck(entries, {
      legendId: LEGEND,
      championId: CHAMP_WRONG_TAG,
      format: "Standard",
    });
    expect(wrongTag.some((v) => v.code === "champion-tag")).toBe(true);
    const sigChamp = validateDeck(entries, {
      legendId: LEGEND,
      championId: SIG_UNIT,
      format: "Standard",
    });
    expect(sigChamp.some((v) => v.code === "champion-signature")).toBe(true);
  });
  it("caps signatures at 3 and notes the unverifiable tag match", () => {
    const { entries, opts } = legalDeck();
    const sigs = [
      "ogn-252-298",
      "rad-142-167",
      "sfd-186-221",
      "unl-186-219",
    ].map((id) => ({ cardId: id, qty: 1, zone: "main" as const }));
    const v = validateDeck([...entries, ...sigs], opts);
    expect(v.some((x) => x.code === "signature-cap" && !x.unverifiedRule)).toBe(true);
    const oneSig = validateDeck(
      [...entries, { cardId: "ogn-252-298", qty: 1, zone: "main" as const }],
      opts,
    );
    expect(
      oneSig.some(
        (x) => x.code === "signature-tag-unverifiable" && x.unverifiedRule,
      ),
    ).toBe(true);
  });
  it("never hard-fails on the signature-tag note alone", () => {
    const { entries, opts } = legalDeck();
    const v = validateDeck(
      [...entries, { cardId: "ogn-252-298", qty: 1, zone: "main" as const }],
      opts,
    );
    // Main-size fires (41 cards) but the signature note is not hard.
    expect(
      v.filter((x) => x.code === "signature-tag-unverifiable" && !x.unverifiedRule),
    ).toEqual([]);
    expect(hard(v).some((x) => x.code === "main-size")).toBe(true);
  });
  it("returns empty curve/breakdown for unknown cards", () => {
    expect(energyCurve([{ cardId: "NOPE-1", qty: 3, zone: "main" }])).toEqual([]);
    expect(domainBreakdown([{ cardId: "NOPE-1", qty: 3, zone: "main" }])).toEqual([]);
  });
});

describe("legality helpers", () => {
  it("strips variant suffixes only when the base name exists", () => {
    expect(baseName("Jinx, Demolitionist (Alternate Art)")).toBe("Jinx, Demolitionist");
    expect(baseName("Yasuo, Remorseful")).toBe("Yasuo, Remorseful");
  });
  it("computes champion prefixes", () => {
    expect(championPrefix("Jinx, Demolitionist")).toBe("Jinx");
    expect(championPrefix("Master Yi, Wuju Bladesman")).toBe("Master Yi");
  });
  it("checks domain identity: single, multi, domainless", () => {
    expect(domainsFit(["Fury"], ["Fury", "Chaos"])).toBe(true);
    expect(domainsFit(["Calm"], ["Fury", "Chaos"])).toBe(false);
    expect(domainsFit(["Fury", "Chaos"], ["Fury", "Chaos"])).toBe(true);
    expect(domainsFit(["Fury", "Mind"], ["Fury", "Chaos"])).toBe(false);
    expect(domainsFit(["Colorless"], ["Fury", "Chaos"])).toBe(true);
    expect(domainsFit([], ["Fury", "Chaos"])).toBe(true);
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
