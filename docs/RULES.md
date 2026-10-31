# Deck-construction rules — verification log

Rules are encoded as data in `lib/rules.ts`. A rule is only marked
`verified: true` once it has been checked against an official Riftbound
source (rulebook, official site, or tournament rules document).

## Status

| Rule | Value in code | Verified? | Source |
|---|---|---|---|
| Main deck size | 40 | NO — pending official-source check | — |
| Max copies per card | 3 | NO — pending official-source check | — |
| Legend required | yes | NO — pending official-source check | — |
| Champion required | no | NO — pending official-source check | — |
| Leaders count toward main deck | no | NO — pending official-source check | — |
| Banned / restricted list | empty | NO — no public list confirmed yet | — |
| Legend domain restriction | noted only | NO — pending official-source check | — |

## How the app handles unverified rules

The validator in `lib/legality.ts` never hard-fails a deck on an
unverified rule. Unverified rules produce notes in the UI, clearly
labelled as such, so users are never told a deck is illegal on the basis
of an unconfirmed number.

## To verify

1. Find the official Riftbound comprehensive rules / deck-construction
   section and record its URL and the exact wording here.
2. Flip each `verified` flag in `lib/rules.ts` and fill in the Source
   column above.
3. Re-run `npm test` and the smoke suite.
