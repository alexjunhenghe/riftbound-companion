# Riftbound Companion — Design Document (clean-room rebuild)

A rebuild of the *features and flows* of winratetcg.com ("Winrate"), a Riftbound
TCG companion for players who play to win. This is a clean-room document:
structure, behavior, and design tokens are described in our own words.
No copy, images, logos, card art, or brand assets from the original site
are reproduced here or in this repo. The working name is deliberately not
the original's brand.

## 1. Product shape

- **Positioning:** a competitive player's utility tool, not a storefront.
  Three jobs: track a collection, build decks with live prices, log matches.
- **Mood:** tool-first, game-flavored, brisk. Short headlines, one-line
  helper text, actions that go straight to work (browse, build).
- **Game identity is carried by six domains:** Fury, Calm, Mind, Body,
  Chaos, Order — each with its own icon and accent color, reused
  consistently across grids, filters, and deck breakdowns.
- **Match logging is advertised on the original as "soon"** — no
  match-logging route exists there. In this rebuild it is a parity-plus
  feature (Phase 5), built from our own users' data only.

## 2. Route map (verified from the original's sitemap / robots / pages)

| Route | Job | Access |
|---|---|---|
| `/` | Hero pitch + two primary actions + six domain icons | Public |
| `/cards` | Searchable card grid, add copies from the grid | Public |
| `/cards?set=<CODE>` | Card browser pre-filtered by set (SGN, OGN, PR, OPP, OGS, JDG, SFD, UNL, VEN, RAD) | Public |
| `/cards/<SET>-<NUMBER>` | Card detail: image, domain, type/rarity, keywords with rules text, stats (energy, power, might), normal + foil prices, illustrator, other printings | Public |
| `/collection` | Owned copy counts, valued at stored market price per finish | Account |
| `/decks` | Deck list index; Standard and 2v2 formats; lists checked against construction rules | Account |
| `/decks/new`, `/decks/<id>/edit` | Deck builder (see §4) | Account |
| `/connect` | AI-client (MCP) connection instructions | Public |
| `/login` | Email or Google sign-in; collection/decks stay tied to the account | Public |
| `/styleguide` | The original's public design-system page — the authoritative visual reference | Public |

No pricing/paywall or purchase CTAs were found on the original; it reads
as free, account-gated only for personal data. No dedicated stats, about,
pricing, or blog routes exist.

## 3. Design system (from the original's public style guide)

- **Surfaces:** black-and-white. Light mode = white surfaces, near-black
  text. Dark mode = black surfaces, white text.
- **Primary actions:** solid black on light mode, solid white on dark mode.
- **Typography:** Geist Sans for headings/body, Geist Mono for collector
  numbers, prices, and stats. Type scale: 16px body / 14px secondary /
  12px metadata.
- **Navigation:** left sidebar, a floating layer with its own fill and a
  1px right border; 14px medium items on 32px rows, hover wash, stronger
  background for the current page; section labels instead of rules.
  Sidebar "Pages" section: Collection, Cards, Decks.
- **Focus rings:** an "Ice" accent color.
- **Domain color:** one saturated color per game domain (exact hex values
  were not exposed by text fetch — sample from a live visual pass before
  locking tokens; do not guess).
- **Rarity tiers:** Common, Uncommon, Rare, Epic, Showcase, Promo.
- **Card tiles:** 63×88 card ratio, 1px border, 8px radius, card image as
  hero; quantity steppers; price displays; explicit "unpriced" states.
- **Loading:** skeleton loaders mirroring grid / card ratio / text heights.
- **Deck visuals:** energy-curve chart + per-domain breakdown of the main
  deck.
- **Homepage layout:** centered single-column hero — headline, one-sentence
  pitch, two primary buttons, then a horizontal strip of the six domain
  icons. No sidebar marketing sections.
- **Cards page layout:** search-first — one search field (name, rules text,
  or collector number together) above an interactive grid.
- **Deck builder layout:** two-pane working surface (card pool + live deck
  list with running stats), collapsing to stacked panes on mobile.
- **Mobile note:** the original's click/right-click remove interaction is
  desktop-first; the rebuild must include a visible minus button, not
  right-click alone.

## 4. Interactions (verified behavior)

- **Card browser:** search by name / rules text / collector number; add
  copies directly from grid items; set filtering via `?set=`.
- **Card detail:** sign-in prompt gates the add-to-collection action;
  "other printings" section lists alternate printings with own prices.
- **Deck builder:** click a card to add one copy; right-click or a minus
  control to remove one; the deck saves itself automatically (no save
  button). The builder enforces a legend, a chosen champion, and
  deck-construction rules, and surfaces violations inline (never a bare
  pass/fail).
- **Collection:** owned counts per printing and finish, total value from
  latest prices.
- **AI / MCP surface (original):** hosted MCP endpoint with card search
  (name/rules/domain/type/energy/rarity/set, finishes, prices), deck
  list/open/create/edit including legend and champion, list validation,
  deck pricing vs owned copies, collection read and add/remove, and an
  approved-apps section for revoking AI apps. Card search is available
  without an AI client sign-in. The rebuild does not copy this endpoint;
  an MCP surface is a later-phase option, built from our own data.

## 5. Data model

One row per *printing*, not per card name. Prices are append-only
snapshots (never overwrite history); deck price, collection value, and
win rate are derived, never stored as source of truth.

- `users(id, handle, created_at)`
- `sets(id, code, name, release_date)`
- `cards(id, external_id, riftbound_id, name, rules_text, flavor_text, type, domains[], cost, might, power, keywords[], rarity, set_id, collector_number, image_url_small, image_url_large)`
- `prices(printing_id, source, market_price, low_price, currency, fetched_at)` — PK (printing_id, source, fetched_at)
- `collection_items(user_id, printing_id, qty, qty_foil)` — PK (user_id, printing_id)
- `decks(id, user_id, name, format, legend_id, champion_id, description, is_public, created_at, updated_at)`
- `deck_cards(deck_id, printing_id, zone, qty)` — zone: legend | champion | main | battlefield | rune | sideboard; PK (deck_id, printing_id, zone)
- `matches(id, user_id, deck_id, opponent_legend, opponent_archetype, format, games_won, games_lost, result, event_name, played_at, notes)` — format: BO1 | BO3

**Legality engine:** encode rules as versioned data rows with effective
dates (deck size, per-card copy caps, Legend domain restrictions,
banned/restricted list) — never hardcode values from memory. Verify every
number against the official rules before shipping.

## 6. Stack

- **Next.js (App Router) + TypeScript** — server-rendered card pages and
  shareable deck URLs; the builder as a client island.
- **Tailwind CSS** — dense card-grid UI iteration.
- **Postgres + Drizzle ORM** (Neon or Supabase) — relational data with
  typed queries.
- **Local-first first, accounts second** — browser storage (IndexedDB via
  Dexie) so the app works with zero backend; then auth (Supabase Auth or
  Clerk) and sync of the same tables to Postgres.
- **Price sync as a scheduled job** (Vercel Cron or GitHub Actions,
  daily) — prices change daily, not live; refresh a snapshot table.
- **Vitest + Playwright** — unit tests for legality/price math, smoke
  tests for the builder flow.

## 7. Clean-room data sources (no keys, no scraping of the original)

- **RiftHunt public API** — backbone for v1: free JSON, no key, with
  search, per-printing lookup, set lists, and bulk exports (full
  catalogue ~1,725 printings; daily price export). Fetch bulk files at
  most daily, modest bursts, identifying User-Agent.
- **Riftcodex** — secondary catalogue cross-check for cards missing from
  the primary source.
- **TCGplayer / Cardmarket** — outbound purchase links only (from product
  IDs in catalogue data), not scraped price feeds. Direct marketplace
  APIs need affiliate/commercial access — out of scope for v1.
- **Riot Developer Portal / official Riftbound API** — the legitimate
  route to official card art and canonical data; requires applying for an
  app-specific key. Until granted, use community catalogue data and label
  the app unofficial and unaffiliated.
- **Not sources:** the original site's pages, API, images, or copy. No
  scraping, no hotlinking its assets, no reproducing its text. Domain
  names, card names, and rules text are game facts; the site's
  presentation of them is not reused.

## 8. Build phases

0. **Scaffolding + catalogue import** — Next.js skeleton, Tailwind,
   Drizzle schema, sync scripts. Acceptance: `/cards` renders real
   imported data, not fixtures.
1. **Card browser** — grid, search (name/rules/collector number),
   filters (domain, type, set, rarity, keyword), card detail with
   printings and price badge.
2. **Collection (local-first)** — add copies from the grid, binder view,
   owned/missing per set, total value, import/export (CSV + plain text).
3. **Deck builder** — legend-first flow, click-to-add / minus-to-remove,
   autosave, zone breakdown, inline legality violations, deck price,
   test-draw and curve stats, shareable URL, import/export.
4. **Accounts + sync** — auth, migrate local storage to Postgres per
   user, public/private decks.
5. **Match logging + stats** — BO1/BO3 results per deck, per-deck and
   per-matchup win rates, simple charts.
6. **Polish + price depth** — price history charts from snapshots, price
   alerts, public decks, tournament deck imports from public lists.

## 9. What cannot be rebuilt exactly (honest gaps)

1. Any user data from the original (accounts, collections, decks, match
   histories) — private and unrecoverable; this rebuild starts empty.
2. Their price-pipeline internals or any intraday pricing — not
   observable; this rebuild uses daily public-export snapshots, labelled
   as such. The original never names its price marketplace.
3. Their exact UI, copy, and brand assets — deliberately excluded.
   Faithful here means same features and flows, not same look or words.
4. Matchup/win-rate statistics from their users' matches — the original's
   match logging is upcoming, so such a dataset may not exist at all;
   ours comes only from our own users' logged matches.
5. Official card art without a Riot API key — art is Riot IP; community
   catalogue image URLs are a stopgap.
6. Anything behind login on the original (collection sync details, social
   features, premium tiers) — unobservable from public pages; excluded
   pending a live-browser inventory.
7. Exact domain accent hex values, spacing scale, and mobile breakpoints
   — not exposed by text fetch; sample from a live visual pass before
   locking tokens.
