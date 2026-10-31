"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  CARDS,
  formatPrice,
  getCard,
  searchCards,
} from "@/lib/catalog";
import { priceTotal } from "@/lib/pricing";
import {
  domainBreakdown,
  energyCurve,
  validateDeck,
} from "@/lib/legality";
import { deckToText, encodeDeck, parseDeckText } from "@/lib/deck-codec";
import { useStore, type Deck, type DeckCardEntry } from "@/lib/store";
import type { Zone } from "@/lib/rules";

// Legends are a card type; champions are a supertype in the catalogue
// (type Unit/Spell/etc. + supertype Champion). Filtering champions by
// type would return nothing with real data.
function isLegend(card: { type: string }) {
  return card.type.toLowerCase() === "legend";
}
function isChampion(card: { supertype: string | null }) {
  return card.supertype?.toLowerCase() === "champion";
}

export default function DeckBuilderPage() {
  const params = useParams<{ id: string }>();
  const store = useStore();
  const foundDeck = store.decks.find((d) => d.id === params.id);

  const [poolQuery, setPoolQuery] = useState("");
  const [addZone, setAddZone] = useState<Zone>("main");
  const [importText, setImportText] = useState("");
  const [importNote, setImportNote] = useState("");
  const [shareLink, setShareLink] = useState("");
  const [copied, setCopied] = useState(false);

  const pool = useMemo(() => searchCards(poolQuery), [poolQuery]);
  const legends = useMemo(() => CARDS.filter(isLegend), []);
  const champions = useMemo(() => CARDS.filter(isChampion), []);

  if (!foundDeck) {
    return (
      <div>
        <h1 className="text-2xl font-bold">Deck not found</h1>
        <p className="mt-2 text-sm text-neutral-500">
          This deck may have been deleted, or the link is for a different
          browser. Decks are stored locally in this browser only.
        </p>
      </div>
    );
  }
  const deck: Deck = foundDeck;

  const entries: DeckCardEntry[] = deck.cards;
  const violations = validateDeck(entries);
  const hard = violations.filter((v) => !v.unverifiedRule);
  const notes = violations.filter((v) => v.unverifiedRule);
  const price = priceTotal(
    entries.map((c) => ({ cardId: c.cardId, qty: c.qty, foil: false })),
  );
  const mainCount = entries
    .filter((c) => c.zone === "main")
    .reduce((s, c) => s + c.qty, 0);
  const curve = energyCurve(entries);
  const domains = domainBreakdown(entries);
  const maxCurve = Math.max(1, ...curve.map((b) => b.count));

  function bump(cardId: string, zone: Zone, delta: number) {
    const next = entries
      .map((e) =>
        e.cardId === cardId && e.zone === zone
          ? { ...e, qty: e.qty + delta }
          : e,
      )
      .filter((e) => e.qty > 0);
    if (delta > 0 && !next.some((e) => e.cardId === cardId && e.zone === zone)) {
      next.push({ cardId, qty: delta, zone });
    }
    store.updateDeck({ ...deck, cards: next });
  }

  function makeShare() {
    const code = encodeDeck({
      v: 1,
      name: deck.name,
      format: deck.format,
      legendId: deck.legendId,
      championId: deck.championId,
      cards: entries,
    });
    const url = `${window.location.origin}/decks/new?d=${code}`;
    setShareLink(url);
    setCopied(false);
  }

  function handleImport() {
    const parsed = parseDeckText(importText);
    let added = 0;
    let skipped = 0;
    const next = [...entries];
    for (const { qty, label } of parsed) {
      const match =
        CARDS.find((c) => c.id.toLowerCase() === label.toLowerCase()) ??
        CARDS.find((c) => c.name.toLowerCase() === label.toLowerCase());
      if (!match) {
        skipped += 1;
        continue;
      }
      const existing = next.find(
        (e) => e.cardId === match.id && e.zone === "main",
      );
      if (existing) existing.qty += qty;
      else next.push({ cardId: match.id, qty, zone: "main" });
      added += 1;
    }
    store.updateDeck({ ...deck, cards: next });
    setImportNote(`Imported ${added} line(s), skipped ${skipped}.`);
  }

  const zoneLabels: Record<Zone, string> = {
    legend: "Legend",
    champion: "Champion",
    main: "Main deck",
    battlefield: "Battlefield",
    rune: "Runes",
    sideboard: "Sideboard",
  };

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl font-bold">{deck.name}</h1>
        <span className="text-sm text-neutral-500">
          {deck.format} · autosaved
        </span>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-medium">
          Legend
          <select
            value={deck.legendId ?? ""}
            onChange={(e) =>
              store.updateDeck({
                ...deck,
                legendId: e.target.value || null,
              })
            }
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-950"
          >
            <option value="">— No legend —</option>
            {legends.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.id})
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">
          Champion
          <select
            value={deck.championId ?? ""}
            onChange={(e) =>
              store.updateDeck({
                ...deck,
                championId: e.target.value || null,
              })
            }
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-950"
          >
            <option value="">— No champion —</option>
            {champions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.id})
              </option>
            ))}
          </select>
        </label>
      </div>
      {(legends.length === 0 || champions.length === 0) && (
        <p className="mt-2 text-xs text-neutral-500">
          Note: no cards of that leader type were found in the imported
          catalogue, so the picker lists what is available. Pick any card
          above, or leave it blank.
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-6 font-mono text-sm">
        <span>
          Main deck: <strong>{mainCount}</strong>
        </span>
        <span>
          Deck price: <strong>{formatPrice(price.total)}</strong>
        </span>
        {price.unpriced.length > 0 && (
          <span className="text-neutral-500">
            {price.unpriced.length} unpriced line(s) excluded
          </span>
        )}
      </div>

      {hard.length > 0 && (
        <div className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm dark:border-red-900 dark:bg-red-950" role="alert">
          <p className="font-semibold">Legality issues</p>
          <ul className="mt-1 list-disc pl-5">
            {hard.map((v) => (
              <li key={v.code + v.message}>{v.message}</li>
            ))}
          </ul>
        </div>
      )}
      {notes.length > 0 && (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950">
          <p className="font-semibold">Rule notes (unverified rules)</p>
          <ul className="mt-1 list-disc pl-5">
            {notes.map((v) => (
              <li key={v.code + v.message}>{v.message}</li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-neutral-500">
            These rules have not been confirmed against an official source
            yet, so they are shown as notes rather than failures. See
            docs/RULES.md.
          </p>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="text-lg font-semibold">Card pool</h2>
          <input
            type="search"
            value={poolQuery}
            onChange={(e) => setPoolQuery(e.target.value)}
            placeholder="Search the pool…"
            aria-label="Search card pool"
            className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-950"
          />
          <label className="mt-2 block text-sm">
            Add to zone{" "}
            <select
              value={addZone}
              onChange={(e) => setAddZone(e.target.value as Zone)}
              className="rounded-md border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-950"
            >
              <option value="main">Main deck</option>
              <option value="battlefield">Battlefield</option>
              <option value="rune">Runes</option>
              <option value="sideboard">Sideboard</option>
            </select>
          </label>
          <ul className="mt-3 max-h-[480px] space-y-1 overflow-y-auto pr-1">
            {pool.slice(0, 200).map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-2 rounded-md border border-neutral-100 px-2 py-1.5 dark:border-neutral-900"
              >
                <span className="text-sm">
                  {c.name}{" "}
                  <span className="font-mono text-xs text-neutral-500">
                    {c.id} · {formatPrice(c.price)}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => bump(c.id, addZone, 1)}
                  className="shrink-0 rounded-md bg-black px-2 py-1 text-xs font-medium text-white dark:bg-white dark:text-black"
                >
                  + Add
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Deck list</h2>
          {(Object.keys(zoneLabels) as Zone[]).map((zone) => {
            const inZone = entries.filter((e) => e.zone === zone);
            if (inZone.length === 0) return null;
            return (
              <div key={zone} className="mt-3">
                <h3 className="text-sm font-semibold">
                  {zoneLabels[zone]} ({inZone.reduce((s, e) => s + e.qty, 0)})
                </h3>
                <ul className="mt-1 space-y-1">
                  {inZone.map((e) => {
                    const card = getCard(e.cardId);
                    return (
                      <li
                        key={`${e.zone}-${e.cardId}`}
                        className="flex items-center justify-between gap-2 text-sm"
                      >
                        <span>
                          {e.qty}× {card?.name ?? e.cardId}
                        </span>
                        <span className="flex gap-1">
                          <button
                            type="button"
                            aria-label={`Add one ${card?.name ?? e.cardId}`}
                            onClick={() => bump(e.cardId, e.zone, 1)}
                            className="rounded border border-neutral-300 px-2 dark:border-neutral-700"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            aria-label={`Remove one ${card?.name ?? e.cardId}`}
                            onClick={() => bump(e.cardId, e.zone, -1)}
                            className="rounded border border-neutral-300 px-2 dark:border-neutral-700"
                          >
                            −
                          </button>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
          {entries.length === 0 && (
            <p className="mt-3 text-sm text-neutral-500">
              Empty deck. Add cards from the pool.
            </p>
          )}

          <div className="mt-6">
            <h3 className="text-sm font-semibold">Energy curve</h3>
            {curve.length === 0 ? (
              <p className="text-sm text-neutral-500">No costed cards yet.</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {curve.map((b) => (
                  <li key={b.cost} className="flex items-center gap-2 text-sm">
                    <span className="w-10 font-mono">{b.cost}</span>
                    <span
                      className="h-3 bg-black dark:bg-white"
                      style={{ width: `${Math.max(8, (b.count / maxCurve) * 160)}px` }}
                    />
                    <span>{b.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="mt-6">
            <h3 className="text-sm font-semibold">Domain breakdown</h3>
            {domains.length === 0 ? (
              <p className="text-sm text-neutral-500">No domains yet.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm">
                {domains.map((d) => (
                  <li key={d.domain}>
                    {d.domain}: {d.count}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <section className="mt-10 grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="text-lg font-semibold">Share & export</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={makeShare}
              className="rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white dark:bg-white dark:text-black"
            >
              Generate share link
            </button>
            <button
              type="button"
              onClick={() => {
                const text = deckToText(
                  deck.name,
                  entries,
                  (id) => getCard(id)?.name ?? id,
                );
                const blob = new Blob([text], { type: "text/plain" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${deck.name.replace(/\s+/g, "-")}.txt`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
            >
              Export text
            </button>
          </div>
          {shareLink && (
            <div className="mt-2 flex items-center gap-2">
              <input
                readOnly
                value={shareLink}
                aria-label="Share link"
                className="w-full rounded-md border border-neutral-300 px-2 py-1.5 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-950"
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(shareLink).catch(() => {});
                  setCopied(true);
                }}
                className="shrink-0 rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          )}
        </div>
        <div>
          <h2 className="text-lg font-semibold">Import list</h2>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Paste “qty Name” or “qty SET-NUM” lines; they are added to the
            main deck.
          </p>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={5}
            className="mt-2 w-full rounded-md border border-neutral-300 p-2 font-mono text-sm dark:border-neutral-700 dark:bg-neutral-950"
          />
          <button
            type="button"
            onClick={handleImport}
            className="mt-2 rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white dark:bg-white dark:text-black"
          >
            Import list
          </button>
          {importNote && (
            <p className="mt-2 text-sm text-neutral-500" role="status">
              {importNote}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
