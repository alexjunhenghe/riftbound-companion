/**
 * Import the RiftHunt public bulk catalogue into data/cards.json.
 *
 * Usage: npm run sync-catalog
 * Verified 2026-10-31 (RiftHunt public API, no key):
 *   bulk catalogue: https://api.rifthunt.com/bulk/cards
 *     -> { fetched, source, sets[], cards[] } with 1725 printings
 *   price export:   https://api.rifthunt.com/bulk/prices
 *     -> { fetched, currency, prices[] } with 1688 rows, each
 *        { riftboundId, finishes: { normal: {market}, foil: {market} } }
 * Env overrides (defaults are the verified endpoints above):
 *   RIFTHUNT_BULK_URL, RIFTHUNT_PRICE_URL
 *
 * The script is deliberately tolerant of field-name variation: it maps
 * the common RiftHunt field names and falls back to null for anything
 * missing, so a schema drift produces unpriced/blank fields rather than
 * invented data. It never invents card names, stats, or prices.
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const BULK_URL =
  process.env.RIFTHUNT_BULK_URL || "https://api.rifthunt.com/bulk/cards";
const PRICE_URL =
  process.env.RIFTHUNT_PRICE_URL || "https://api.rifthunt.com/bulk/prices";
const UA = "RiftboundCompanion/0.1 (clean-room fan project; catalogue import)";

if (!BULK_URL) {
  console.error(
    "RIFTHUNT_BULK_URL is not set. See docs/DATA-SOURCES.md for the verified bulk endpoint.",
  );
  process.exit(2);
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return res.json();
}

function firstString(...vals) {
  for (const v of vals) if (typeof v === "string" && v) return v;
  return null;
}

// RiftHunt collector numbers arrive as numbers (num: 7), not strings.
function firstStringOrNumber(...vals) {
  for (const v of vals) {
    if (typeof v === "string" && v) return v;
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return null;
}

function firstNumber(...vals) {
  for (const v of vals)
    if (typeof v === "number" && Number.isFinite(v)) return v;
  return null;
}

function asArray(v) {
  if (Array.isArray(v)) return v.filter((x) => typeof x === "string");
  if (typeof v === "string") return [v];
  return [];
}

function slugify(setCode, number) {
  const base = `${setCode || "UNK"}-${number || "?"}`.replace(/\s+/g, "");
  return base;
}

function normalize(raw) {
  const setCode = firstString(raw.setCode, raw.set_code, raw.set, raw.setId) ?? "UNK";
  const number = firstStringOrNumber(
    raw.collectorNumber,
    raw.collector_number,
    raw.number,
    raw.cardNumber,
    raw.num,
  ) ?? "?";
  const name = firstString(raw.name) ?? "Unknown card";
  const domains = asArray(raw.domains ?? raw.domain);
  // RiftHunt "tags" are community tags (e.g. Dragon, Noxus); the app's
  // keyword filter matches them, since no separate keyword field exists.
  const keywords = asArray(raw.keywords ?? raw.tags);
  const prices = raw.prices ?? raw.price ?? {};
  const market = firstNumber(
    prices.market, prices.marketPrice, prices.usd, raw.marketPrice,
  );
  const foil = firstNumber(prices.foil, prices.marketFoil, raw.foilPrice);
  const images = raw.images ?? raw.imageUrls ?? {};
  const imgUrl = firstString(raw.imgUrl, raw.imageUrl);
  return {
    // Use the RiftHunt riftboundId verbatim: SET-num alone collides
    // (266 set-num pairs have alternate-art printings, e.g. ogn-007
    // vs ogn-007a). Fall back to a slug only for records without an id.
    id: firstString(raw.id, raw.riftboundId) ?? slugify(setCode, number),
    name,
    rulesText: firstString(raw.rulesText, raw.rules_text, raw.text, raw.oracleText) ?? "",
    flavorText: firstString(raw.flavorText, raw.flavor_text, raw.flavour) ?? undefined,
    type: firstString(raw.type, raw.cardType, raw.typeLine) ?? "Unknown",
    supertype: firstString(raw.supertype) ?? null,
    domains,
    cost: firstNumber(raw.cost, raw.energy, raw.energyCost),
    might: firstNumber(raw.might),
    power: firstNumber(raw.power),
    keywords,
    rarity: firstString(raw.rarity) ?? "Unknown",
    setCode,
    setName: firstString(raw.setName, raw.set_name) ?? setCode,
    collectorNumber: number,
    imageSmall: firstString(images.small, images.thumbnail) ?? imgUrl,
    imageLarge: firstString(images.large, images.normal, images.art) ?? imgUrl,
    price: market,
    priceFoil: foil,
    priceSource: market !== null || foil !== null ? "rifthunt" : null,
  };
}

const bulk = await fetchJson(BULK_URL);
const records = Array.isArray(bulk) ? bulk : (bulk.data ?? bulk.cards ?? []);
if (!Array.isArray(records) || records.length === 0) {
  throw new Error("Bulk export returned no records");
}
const bulkFetched = firstString(bulk.fetched) ?? null;

let priceMap = {};
let priceFetched = null;
if (PRICE_URL) {
  try {
    const priceData = await fetchJson(PRICE_URL);
    priceFetched = firstString(priceData.fetched) ?? null;
    const rows = Array.isArray(priceData)
      ? priceData
      : (priceData.prices ?? priceData.data ?? []);
    for (const row of rows) {
      const key = firstString(row.riftboundId, row.id, row.printingId, row.cardId);
      if (key) priceMap[key] = row;
    }
  } catch (err) {
    console.warn(`Price export failed (${err.message}); continuing without prices.`);
  }
}

const cards = records.map((raw) => {
  const card = normalize(raw);
  const priceRow = priceMap[raw.id] ?? priceMap[raw.riftboundId] ?? priceMap[card.id];
  if (priceRow) {
    const finishes = priceRow.finishes ?? {};
    const p = priceRow.prices ?? priceRow;
    card.price =
      firstNumber(
        finishes.normal?.market, finishes.normal?.mid,
        p.market, p.marketPrice, p.usd,
      ) ?? card.price;
    card.priceFoil =
      firstNumber(
        finishes.foil?.market, finishes.foil?.mid,
        p.foil, p.marketFoil,
      ) ?? card.priceFoil;
    if (card.price !== null || card.priceFoil !== null) card.priceSource = "rifthunt";
  }
  return card;
});

// De-duplicate by id, keeping the first occurrence.
const seen = new Set();
const deduped = cards.filter((c) => {
  if (seen.has(c.id)) return false;
  seen.add(c.id);
  return true;
});

const outPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../data/cards.json",
);
const out = {
  meta: {
    source: "rifthunt",
    fetchedAt: new Date().toISOString().slice(0, 10),
    bulkFetched,
    priceFetched,
    count: deduped.length,
    note: "Public RiftHunt bulk catalogue, normalized. Prices are snapshot values from the price export; unpriced entries show as Unpriced in the app.",
  },
  cards: deduped,
};
writeFileSync(outPath, JSON.stringify(out));
console.log(`Wrote ${deduped.length} printings to data/cards.json`);
const priced = deduped.filter((c) => c.price !== null).length;
console.log(`Priced (normal): ${priced}; unpriced: ${deduped.length - priced}`);
