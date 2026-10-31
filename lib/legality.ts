import { CARDS, getCard, type CardPrinting } from "./catalog";
import { bannedFor, RULES, type Format, type Zone } from "./rules";

export type DeckEntry = { cardId: string; qty: number; zone: Zone };

export type Violation = {
  code: string;
  message: string;
  /** True for advisory notes (unverifiable from available data), never
   *  a hard legality failure. */
  unverifiedRule: boolean;
};

export type ValidateOpts = {
  legendId?: string | null;
  championId?: string | null;
  format?: Format;
};

// All catalogue names, for variant-suffix stripping (see baseName).
let nameSet: Set<string> | null = null;
function allNames(): Set<string> {
  if (!nameSet) nameSet = new Set(CARDS.map((c) => c.name));
  return nameSet;
}

/**
 * Base name for copy-counting, ban-matching, and battlefield uniqueness.
 * Variant printings share a card with their base: "Jinx, Demolitionist
 * (Alternate Art)" counts as "Jinx, Demolitionist". A trailing
 * parenthetical is stripped ONLY when the stripped name exists as its
 * own card in the catalogue, so genuine parenthetical names are never
 * mangled. (CR 103.3.b: limits are per named card; names are
 * distinguished by subtitle, e.g. Yasuo, Remorseful vs Yasuo, Windrider.)
 */
export function baseName(name: string): string {
  const m = /^(.*) \([^)]+\)$/.exec(name);
  if (m && allNames().has(m[1])) return m[1];
  return name;
}

/** Champion tag proxy: the name before the first comma ("Jinx" in
 *  "Jinx, Demolitionist"). INTERPRETATION, not a verified rule: the
 *  bulk catalogue carries no explicit champion-tag field, so the tag
 *  match (CR 103.3.a.2) is checked via this prefix. The canonical
 *  RiftHunt API exposes per-card tags and would replace this heuristic. */
export function championPrefix(name: string): string {
  return name.split(",")[0].trim();
}

/**
 * Domain identity (CR 103.2.b, CR 176.1): single-domain cards need that
 * domain in the identity; multi-domain cards need ALL of their domains
 * in it; domainless cards fit anywhere. INTERPRETATION: the catalogue
 * marks domainless cards "Colorless" (battlefields, tokens, Gold/Bomb,
 * Neeko, Blending In) — Colorless is treated as domainless here,
 * since no Legend carries it and treating it as a required domain
 * would make those cards unplayable in every deck.
 */
export function domainsFit(
  cardDomains: string[],
  identity: string[],
): boolean {
  const real = cardDomains.filter((d) => d !== "Colorless");
  return real.every((d) => identity.includes(d));
}

/** Validate a decklist for Constructed (Standard / 2v2).
 *  Returns hard violations first, then advisory notes. An empty hard
 *  list means the deck passes every checkable official rule. */
export function validateDeck(
  entries: DeckEntry[],
  opts: ValidateOpts = {},
): Violation[] {
  const format: Format = opts.format ?? "Standard";
  const violations: Violation[] = [];
  const notes: Violation[] = [];

  const legendZone = entries.filter((e) => e.zone === "legend");
  const championZone = entries.filter((e) => e.zone === "champion");
  const legendCard = opts.legendId
    ? getCard(opts.legendId)
    : legendZone.length > 0
      ? getCard(legendZone[0].cardId)
      : undefined;
  const championCard = opts.championId
    ? getCard(opts.championId)
    : championZone.length > 0
      ? getCard(championZone[0].cardId)
      : undefined;
  const legendCount = (opts.legendId ? 1 : 0) + legendZone.length;
  const championCount = (opts.championId ? 1 : 0) + championZone.length;

  const main = entries.filter((e) => e.zone === "main");
  const runes = entries.filter((e) => e.zone === "rune");
  const battlefields = entries.filter((e) => e.zone === "battlefield");
  const sideboard = entries.filter((e) => e.zone === "sideboard");

  // Main deck size: main zone + Chosen Champion (TR 402.1). The Legend
  // is never counted (TR 402.1 lists it as a separate component).
  const mainCount =
    main.reduce((s, e) => s + e.qty, 0) +
    (RULES.championCountsTowardMain && championCard ? 1 : 0);

  if (legendCount === 0) {
    violations.push({
      code: "missing-legend",
      message: "No legend selected. Constructed requires exactly 1.",
      unverifiedRule: false,
    });
  } else if (legendCount > 1) {
    violations.push({
      code: "too-many-legends",
      message: `Deck has ${legendCount} legends; exactly 1 is allowed.`,
      unverifiedRule: false,
    });
  }

  if (championCount === 0) {
    violations.push({
      code: "missing-champion",
      message: "No Chosen Champion selected. Constructed requires exactly 1.",
      unverifiedRule: false,
    });
  } else if (championCount > 1) {
    violations.push({
      code: "too-many-champions",
      message: `Deck has ${championCount} champions; exactly 1 is allowed.`,
      unverifiedRule: false,
    });
  }

  if (mainCount !== RULES.mainDeckSize) {
    violations.push({
      code: "main-size",
      message: `Main deck has ${mainCount} cards (including Chosen Champion); Constructed requires exactly ${RULES.mainDeckSize}.`,
      unverifiedRule: false,
    });
  }

  // Copy caps: per base name across Main + Sideboard (TR 601.1.c:
  // sideboard holds Main-Deck-valid cards; swaps are 1-for-1), plus the
  // Chosen Champion counting toward its own name's limit (CR 103.3.b.1).
  const byName = new Map<string, number>();
  const addCopies = (card: CardPrinting | undefined, qty: number) => {
    if (!card) return;
    const key = baseName(card.name);
    byName.set(key, (byName.get(key) ?? 0) + qty);
  };
  for (const e of main) addCopies(getCard(e.cardId), e.qty);
  for (const e of sideboard) addCopies(getCard(e.cardId), e.qty);
  if (championCard) addCopies(championCard, 1);
  for (const [name, qty] of byName) {
    const cap = RULES.restricted[name] ?? RULES.maxCopiesPerCard;
    if (qty > cap) {
      violations.push({
        code: "copy-cap",
        message: `${name} has ${qty} copies (Main + Sideboard + Champion); max ${cap}.`,
        unverifiedRule: false,
      });
    }
  }

  // Signatures: max 3 total, all bearing the Legend's champion tag
  // (CR 103.3.d). The total is checkable; the tag match is NOT
  // checkable from bulk data (no champion-tag field) — see the note.
  const signatureCount =
    main
      .filter((e) => getCard(e.cardId)?.supertype === "Signature")
      .reduce((s, e) => s + e.qty, 0) +
    sideboard
      .filter((e) => getCard(e.cardId)?.supertype === "Signature")
      .reduce((s, e) => s + e.qty, 0);
  if (signatureCount > RULES.maxSignaturesTotal) {
    violations.push({
      code: "signature-cap",
      message: `Deck has ${signatureCount} Signature cards; max ${RULES.maxSignaturesTotal}.`,
      unverifiedRule: false,
    });
  }
  if (signatureCount > 0) {
    notes.push({
      code: "signature-tag-unverifiable",
      message:
        "Signature tag-match (every Signature must bear the Legend's champion tag) cannot be checked from catalogue data — verify it manually.",
      unverifiedRule: true,
    });
  }

  // Rune deck: exactly 12, no copy limit (CR 103.4 imposes only size +
  // domain identity; the 3-copy rule sits under the Main Deck section).
  const runeCount = runes.reduce((s, e) => s + e.qty, 0);
  if (runeCount !== RULES.runeDeckSize) {
    violations.push({
      code: "rune-size",
      message: `Rune deck has ${runeCount} cards; Constructed requires exactly ${RULES.runeDeckSize}.`,
      unverifiedRule: false,
    });
  }

  // Battlefields: exactly 3, each a unique name (TR 402.1, CR 103.5.c).
  const battlefieldCount = battlefields.reduce((s, e) => s + e.qty, 0);
  if (battlefieldCount !== RULES.battlefieldCount) {
    violations.push({
      code: "battlefield-size",
      message: `Deck provides ${battlefieldCount} battlefields; Constructed requires exactly ${RULES.battlefieldCount}.`,
      unverifiedRule: false,
    });
  }
  const battlefieldNames = new Map<string, number>();
  for (const e of battlefields) {
    const card = getCard(e.cardId);
    if (!card) continue;
    const key = baseName(card.name);
    battlefieldNames.set(key, (battlefieldNames.get(key) ?? 0) + e.qty);
  }
  for (const [name, qty] of battlefieldNames) {
    if (qty > 1) {
      violations.push({
        code: "battlefield-duplicate",
        message: `Battlefield ${name} appears ${qty} times; each battlefield name may appear once.`,
        unverifiedRule: false,
      });
    }
  }

  // Sideboard: 10 or fewer (TR 601.1.c).
  const sideboardCount = sideboard.reduce((s, e) => s + e.qty, 0);
  if (sideboardCount > RULES.sideboardMax) {
    violations.push({
      code: "sideboard-size",
      message: `Sideboard has ${sideboardCount} cards; max ${RULES.sideboardMax}.`,
      unverifiedRule: false,
    });
  }

  // Banned list (Rules Hub, Sep 18, 2026; 2v2 adds Master Yi).
  // Checked by base name across every zone + legend/champion slots.
  const banned = new Set(bannedFor(format));
  const checkBanned = (card: CardPrinting | undefined, where: string) => {
    if (!card) return;
    if (banned.has(baseName(card.name))) {
      violations.push({
        code: "banned",
        message: `${card.name} is banned in ${format} Constructed (${where}).`,
        unverifiedRule: false,
      });
    }
  };
  for (const e of [...main, ...runes, ...battlefields, ...sideboard]) {
    checkBanned(getCard(e.cardId), e.zone);
  }
  checkBanned(legendCard, "legend");
  checkBanned(championCard, "champion");

  // Chosen Champion constraints (CR 103.3.a.2): champion unit, not a
  // signature unit, tag matching the Legend (via the prefix heuristic).
  if (championCard) {
    if (championCard.supertype === "Signature") {
      violations.push({
        code: "champion-signature",
        message: `${championCard.name} is a Signature unit and can never be the Chosen Champion.`,
        unverifiedRule: false,
      });
    } else if (
      championCard.type !== "Unit" ||
      championCard.supertype !== "Champion"
    ) {
      violations.push({
        code: "champion-not-unit",
        message: `${championCard.name} is not a champion unit and cannot be the Chosen Champion.`,
        unverifiedRule: false,
      });
    } else if (
      legendCard &&
      championPrefix(championCard.name) !== championPrefix(legendCard.name)
    ) {
      violations.push({
        code: "champion-tag",
        message: `${championCard.name} does not match the Legend's champion tag (${championPrefix(legendCard.name)}). Tag checked via name prefix — bulk data has no explicit tag field.`,
        unverifiedRule: false,
      });
    }
  }

  // Domain identity (CR 103.2.b): applies to Main, Champion (as a Main
  // member, CR 103.3.c), Runes (CR 103.4.a.1), and Sideboard (valid
  // Main-Deck cards only). Uses the Legend's ACTUAL domains (CR 176:
  // "one or more Domains" — never assume exactly two).
  if (legendCard && legendCard.domains.length > 0) {
    const identity = legendCard.domains;
    const checkDomain = (card: CardPrinting | undefined) => {
      if (!card) return;
      if (!domainsFit(card.domains, identity)) {
        violations.push({
          code: "domain",
          message: `${card.name} uses domain(s) outside the legend's identity (${identity.join(", ")}).`,
          unverifiedRule: false,
        });
      }
    };
    for (const e of [...main, ...runes, ...sideboard]) {
      checkDomain(getCard(e.cardId));
    }
    checkDomain(championCard);
  }

  return [...violations, ...notes];
}

/** Energy curve: cost -> count across the main deck. */
export function energyCurve(
  entries: DeckEntry[],
): { cost: number; count: number }[] {
  const buckets = new Map<number, number>();
  for (const e of entries) {
    if (e.zone !== "main") continue;
    const card = getCard(e.cardId);
    if (!card || card.cost === null) continue;
    buckets.set(card.cost, (buckets.get(card.cost) ?? 0) + e.qty);
  }
  return [...buckets.entries()]
    .map(([cost, count]) => ({ cost, count }))
    .sort((a, b) => a.cost - b.cost);
}

/** Domain breakdown of the main deck: domain -> count. */
export function domainBreakdown(
  entries: DeckEntry[],
): { domain: string; count: number }[] {
  const buckets = new Map<string, number>();
  for (const e of entries) {
    if (e.zone !== "main") continue;
    const card = getCard(e.cardId);
    if (!card) continue;
    for (const d of card.domains) {
      buckets.set(d, (buckets.get(d) ?? 0) + e.qty);
    }
  }
  return [...buckets.entries()]
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count);
}
