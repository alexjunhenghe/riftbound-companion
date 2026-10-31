# Data sources

## Catalogue + prices

- **RiftHunt public API** — bulk catalogue and price exports, free JSON,
  no key, GET only, CORS open. Docs: https://rifthunt.com/api/
  - Bulk catalogue: `https://api.rifthunt.com/bulk/cards` →
    `{ fetched, source: "riotgames.com", sets[], cards[] }`.
    Imported 2026-10-31: **1,725 printings** across 11 sets
    (OGN 352, SFD 306, UNL 306, RAD 250, VEN 243, OPP 221, OGS 24,
    PR 12, JDG 4, RWB 4, SGN 3). Bulk snapshot dated 2026-10-29.
  - Price export: `https://api.rifthunt.com/bulk/prices` →
    `{ fetched, currency: "USD", prices[] }`, 1,688 rows keyed by
    riftboundId with `finishes.normal.market` / `finishes.foil.market`
    (TCGplayer market prices, refreshed daily). Imported 2026-10-31:
    **661 printings with a normal market price, 1,623 with a foil
    market price** — many printings (alt arts, promos) only carry a
    foil price; the rest show as Unpriced.
  - Card records carry `id` (riftboundId, e.g. `ogn-007a-298`),
    `num`, `energy`, `might`, `power`, `type`, `supertype`,
    `rarity`, `domains`, `text`, `flavour`, `set`, `setName`,
    `tags`, `artist`, `imgUrl` (hosted on Riot's CMS). The import
    script (`scripts/sync-catalog.mjs`) maps these to the app shape;
    the app's keyword filter matches RiftHunt community tags, since no
    separate keyword field exists. Rate guidance from the docs: fetch
    the bulk files at most once a day; no hard rate limit, no key.
  - The import script defaults to these endpoints; `RIFTHUNT_BULK_URL`
    and `RIFTHUNT_PRICE_URL` env vars override them. `data/cards.json`
    is whatever the last successful import wrote, and the home page
    shows its snapshot date and source.
- **Riftcodex** — secondary catalogue cross-check for cards missing from
  the primary source.
- **TCGplayer / Cardmarket** — outbound purchase links only, never
  scraped price feeds.
- **Riot Developer Portal / official Riftbound API** — the legitimate
  route to official card art and canonical data; requires an application
  for an app-specific key. Until granted, community catalogue data is
  used and the app is labelled unofficial and unaffiliated.

## Not sources

The original companion site's pages, API, images, or copy. No scraping,
no hotlinking its assets, no reproducing its text.

## Prices

Prices in the app are snapshot values from the last import, labelled with
their snapshot date on the home page. They are not live/intraday prices.
Entries without a price show as "Unpriced".
