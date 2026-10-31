# Riftbound Companion

A clean-room Riftbound TCG companion: track a collection, build decks with
prices, and log matches.

This repo rebuilds the **features and flows** of a TCG companion site —
it does not copy that site's text, images, logos, card art, or brand.
Card names and game rules are game facts; all presentation here is
original. Card data and prices come from public community sources (see
`DESIGN.md` §7), and the app is unofficial and unaffiliated with Riot
or any existing companion site.

## Status

Phases 0–3 and 5 are built and verified (see below). Accounts + cloud
sync (Phase 4) is intentionally not built: it needs the user to create a
Supabase or Clerk project and provide its credentials, and this build
does not fake auth. The app is fully usable without an account — all
data lives in the browser's local storage. The Drizzle schema in
`db/schema.ts` is the typed target for the future sync phase.

See [DESIGN.md](DESIGN.md) for the full design document: route map,
design system, interactions, data model, stack, clean-room data sources,
and phased build plan.

## Running it

```bash
npm install
npm run sync-catalog   # imports the RiftHunt public bulk catalogue
npm run build
npm start
```

Tests and smoke checks:

```bash
npm test    # Vitest unit tests (legality, pricing, deck codec, win rate)
npm run smoke  # Playwright checks against the production build
```

## Planned stack

Next.js (App Router) + TypeScript, Tailwind CSS, Postgres + Drizzle,
local-first storage with account sync later. See `DESIGN.md` §6.

## Build phases

0. Scaffolding + catalogue import
1. Card browser
2. Collection (local-first)
3. Deck builder
4. Accounts + sync
5. Match logging + stats
6. Polish + price depth

Details in `DESIGN.md` §8.
