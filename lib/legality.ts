import { getCard } from "./catalog";
import { RULES, type Zone } from "./rules";

export type DeckEntry = { cardId: string; qty: number; zone: Zone };

export type Violation = {
  code: string;
  message: string;
  /** True when the underlying rule is unverified — shown as a note,
   *  never as a hard legality failure. */
  unverifiedRule: boolean;
};

/** Validate a decklist. Returns violations; an empty list means the
 *  list passes every *verified* rule. Unverified rules never fail a
 *  deck — they produce notes so the UI can be honest about them. */
export function validateDeck(entries: DeckEntry[]): Violation[] {
  const violations: Violation[] = [];
  const notes: Violation[] = [];

  const main = entries.filter((e) => e.zone === "main");
  const mainCount = main.reduce((s, e) => s + e.qty, 0);
  const legends = entries.filter((e) => e.zone === "legend");
  const champions = entries.filter((e) => e.zone === "champion");

  const push = (
    code: string,
    message: string,
    verified: boolean,
  ) => {
    const v: Violation = { code, message, unverifiedRule: !verified };
    if (verified) violations.push(v);
    else notes.push(v);
  };

  push(
    "main-size",
    `Main deck has ${mainCount} cards; expected ${RULES.mainDeckSize}.`,
    RULES.mainDeckSizeVerified,
  );
  if (RULES.legendRequired && legends.length === 0) {
    push("missing-legend", "No legend selected.", RULES.legendRequiredVerified);
  }
  if (legends.length > 1) {
    push(
      "too-many-legends",
      `Deck has ${legends.length} legends; at most 1 is allowed.`,
      true,
    );
  }
  if (RULES.championRequired && champions.length === 0) {
    push(
      "missing-champion",
      "No champion selected.",
      RULES.championRequiredVerified,
    );
  }
  if (champions.length > 1) {
    push(
      "too-many-champions",
      `Deck has ${champions.length} champions; at most 1 is allowed.`,
      true,
    );
  }

  // Per-card copy caps in the main deck.
  const byCard = new Map<string, number>();
  for (const e of main) byCard.set(e.cardId, (byCard.get(e.cardId) ?? 0) + e.qty);
  for (const [cardId, qty] of byCard) {
    const cap = RULES.restricted[cardId] ?? RULES.maxCopiesPerCard;
    if (qty > cap) {
      const card = getCard(cardId);
      push(
        "copy-cap",
        `${card?.name ?? cardId} has ${qty} copies; max ${cap}.`,
        RULES.maxCopiesVerified,
      );
    }
  }
  for (const bannedId of RULES.banned) {
    if (byCard.has(bannedId)) {
      const card = getCard(bannedId);
      push("banned", `${card?.name ?? bannedId} is banned.`, true);
    }
  }

  // Domain check: every main-deck card's domains must be within the
  // legend's domains — but only enforced when a legend with domains is
  // present, and only as a note until the rule is verified.
  const legendCard = legends.length === 1 ? getCard(legends[0].cardId) : undefined;
  if (legendCard && legendCard.domains.length > 0) {
    for (const e of main) {
      const card = getCard(e.cardId);
      if (!card) continue;
      const outside = card.domains.filter(
        (d) => !legendCard.domains.includes(d),
      );
      if (outside.length > 0) {
        push(
          "domain",
          `${card.name} uses domain(s) ${outside.join(", ")} outside the legend's domains (${legendCard.domains.join(", ")}).`,
          false,
        );
        break; // one domain note is enough; the list is per-deck
      }
    }
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
