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

Design phase complete. See [DESIGN.md](DESIGN.md) for the full design
document: route map, design system, interactions, data model, stack,
clean-room data sources, and phased build plan.

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
