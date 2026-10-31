# Deck-construction rules — verification log

Verified 2026-10-31 against official sources ONLY (no fan wikis, no
reference-site scraping):

- Rules Hub: https://playriftbound.com/en-us/rules-hub/
- Riftbound Core Rules (CR), last updated Oct 9, 2026
- Riftbound Tournament Rules (TR), last updated Oct 9, 2026

## VERIFIED — enforced as hard violations (Constructed default)

| Rule | Value | Source |
|---|---|---|
| Main deck size | Exactly 40, INCLUDING the Chosen Champion | TR 402.1 |
| Legend | Exactly 1, NOT counted in the 40, starts in Legend Zone | CR 103.2, TR 402.1 |
| Rune deck | Exactly 12 rune cards, separate from Main | CR 103.4 |
| Battlefields | Exactly 3 provided, each a unique name | TR 402.1, CR 103.5.c |
| Sideboard (where allowed) | 10 or fewer, Main-Deck-valid cards only | TR 601.1.c |
| Copy limit | Max 3 per named card in Main (names distinguished by subtitle: 3× Yasuo, Remorseful AND 3× Yasuo, Windrider is legal) | CR 103.3.b |
| Champion counts toward copy limit | Chosen Champion + up to 2 more of the same name | CR 103.3.b.1 |
| Signatures | Max 3 total per deck, all bearing the Legend's champion tag | CR 103.3.d.1–2 |
| Rune copy limit | NONE — the 3-copy rule sits under the Main Deck section; CR 103.4 imposes only size + domain identity | CR 103.3.b vs CR 103.4 (rule scoping) |
| Domain identity | From the Legend's ACTUAL domains: single-domain cards need that domain in it; multi-domain cards need ALL of theirs in it; domainless cards fit anywhere; runes must match too | CR 103.2.b, CR 103.4.a.1, CR 176.1 |
| Chosen Champion required | Required in Constructed; must be a champion unit whose tag matches the Legend's tag; signature units can never be it; subject to domain identity as a Main member | TR 402.1, CR 103.3.a.2, CR 103.3.c |
| Banned, Standard (7 cards) | Called Shot; Ekko, Recurrent; Draven, Vanquisher; Fight or Flight; Scrapheap; Stealthy Pursuer; Stacked Deck | Rules Hub (updated Sep 18, 2026) |
| Banned, Standard (5 battlefields) | The Arena's Greatest; Aspirant's Climb; Dreaming Tree; Obelisk of Power; Reaver's Row | Rules Hub (updated Sep 18, 2026) |
| Banned, 2v2 extra (1 Legend) | Master Yi, Wuju Bladesman (2v2-only; still legal in 1v1 Standard) | Rules Hub |
| Restricted list | NONE published (verified absence) | Rules Hub, TR 601.2.d |

Notes on the verified set:

- **Casual vs Constructed:** CR 103.3 says a Main Deck of "at least
  40" — that is the casual floor. The app defaults to the
  Constructed rule (exactly 40, TR 402.1 / TR 601.1.b).
- **"Every Legend has exactly two domains" is FALSE as a universal:**
  CR 176 says "one or more Domains." All 210 Legends in the current
  catalogue happen to have two, but the checker reads the Legend
  card's actual domains and never assumes two.
- **Dreaming Tree has no printing in the current catalogue snapshot**
  (verified 2026-10-31: 0 matches). It stays on the ban list — the
  ban is official; the catalogue gap just means the check can't fire
  until the card exists in data.
- **Per-card ban effective dates (Mar 31 / Jul 24 / Sep 18, 2026
  waves) are UNVERIFIED from official sources** — the Rules Hub page
  states only "last updated: September 18, 2026." Dates are not
  shown in the app.

## INTERPRETATIONS (documented, flagged in code)

- **Colorless = domainless.** The catalogue marks domainless cards
  "Colorless" (battlefields, tokens, Gold/Bomb, Neeko, Blending In);
  no Legend carries Colorless, so treating it as a required domain
  would make those cards unplayable in every deck. The checker treats
  Colorless as fitting any identity.
- **Champion tag-match via name prefix.** The bulk catalogue has no
  explicit champion-tag field, so the checker compares the name
  before the first comma ("Jinx" in "Jinx, Demolitionist") between
  Champion and Legend. The canonical RiftHunt API exposes per-card
  tags and would replace this heuristic.
- **Copy counting by base name.** Variant printings ("(Alternate
  Art)", "(Metal)", "(Overnumbered)", …) count as their base card:
  a trailing parenthetical is stripped only when the stripped name
  exists as its own card in the catalogue. Same normalization for
  bans and battlefield uniqueness.
- **Copy limits counted across Main + Sideboard.** TR 601.1.c
  restricts the sideboard to Main-Deck-valid cards and TR 403.4
  swaps 1-for-1, so the checker combines the two zones for the
  3-copy cap.
- **Signature tag-match is NOT checkable from bulk data** (no
  champion-tag field; signature names like "Tibbers" don't share the
  champion's name prefix). The checker enforces the ≤3 total and
  emits an advisory note telling the user to verify tags manually.

## NOT enforced (documented limitations)

- **Standard set legality** (TR 601.3: most recent 5–8 sets — OGS,
  OGN, SFD, UNL, VEN, RAD). Not enforced by printing set code:
  promo printings of Standard-legal cards would false-flag. Proper
  enforcement needs oracle-level (card, not printing) legality.
- **2v2 teammate rules** (CR 491.8: teammates may not share a
  Champion Legend or Battlefields) — not checkable for a single deck.
- **Low-OPL preconstructed exception** (TR 601.2.d.2: an unmodified
  preconstructed deck may keep banned cards) — edge case, not modeled.
- **Limited formats** (Sealed ≥25, Draft ≥20, relaxed domain/copy
  rules, Legend/Champion optional, TR 602.4) — not formats in this app.
- **2v2 vs Standard construction is otherwise identical per player**
  (TR 603 adds only the teammate prohibitions + the Master Yi ban).

## History

- 2026-10-30: all numbers UNVERIFIED placeholders; validator never
  hard-failed on them.
- 2026-10-31: verified against CR/TR/Rules Hub per the table above;
  hard checks enabled; interpretations and gaps documented here.
