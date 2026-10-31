"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CARDS, formatPrice, getCard } from "@/lib/catalog";
import { collectionValue } from "@/lib/pricing";
import { useStore } from "@/lib/store";

function toCsv(
  items: Record<string, { qty: number; qtyFoil: number }>,
): string {
  const lines = ["card_id,name,set,collector_number,qty,qty_foil,price,price_foil"];
  for (const [id, v] of Object.entries(items)) {
    const c = getCard(id);
    if (!c) continue;
    const name = `"${c.name.replace(/"/g, '""')}"`;
    lines.push(
      [id, name, c.setCode, c.collectorNumber, v.qty, v.qtyFoil, c.price ?? "", c.priceFoil ?? ""].join(","),
    );
  }
  return lines.join("\n");
}

function download(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function CollectionPage() {
  const store = useStore();
  const [importText, setImportText] = useState("");
  const [importNote, setImportNote] = useState("");

  const value = useMemo(
    () => collectionValue(store.collection),
    [store.collection],
  );

  const bySet = useMemo(() => {
    const map = new Map<string, { total: number; owned: number; cards: typeof CARDS }>();
    for (const c of CARDS) {
      const entry = map.get(c.setCode) ?? { total: 0, owned: 0, cards: [] };
      entry.total += 1;
      const owned = store.collection[c.id];
      if (owned && (owned.qty > 0 || owned.qtyFoil > 0)) entry.owned += 1;
      entry.cards.push(c);
      map.set(c.setCode, entry);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [store.collection]);

  const ownedCount = Object.values(store.collection).reduce(
    (s, v) => s + v.qty + v.qtyFoil,
    0,
  );

  function handleImport() {
    // Accepts "qty Name" lines or "qty SET-NUM" lines, plus CSV rows
    // pasted from an export (card_id column wins when present).
    let added = 0;
    let skipped = 0;
    const next = { ...store.collection };
    for (const rawLine of importText.split("\n")) {
      const line = rawLine.trim();
      if (!line || line.startsWith("card_id,")) continue;
      const csvId = line.split(",")[0];
      const byId = getCard(csvId);
      if (byId) {
        const parts = line.split(",");
        const qty = parseInt(parts[4] ?? "0", 10) || 0;
        const qtyFoil = parseInt(parts[5] ?? "0", 10) || 0;
        if (qty > 0 || qtyFoil > 0) {
          next[byId.id] = { qty, qtyFoil };
          added += 1;
        }
        continue;
      }
      const m = /^(\d+)x?\s+(.+)$/.exec(line);
      if (!m) {
        skipped += 1;
        continue;
      }
      const qty = parseInt(m[1], 10);
      const label = m[2].trim();
      const match =
        CARDS.find((c) => c.id.toLowerCase() === label.toLowerCase()) ??
        CARDS.find((c) => c.name.toLowerCase() === label.toLowerCase());
      if (!match) {
        skipped += 1;
        continue;
      }
      const cur = next[match.id] ?? { qty: 0, qtyFoil: 0 };
      next[match.id] = { ...cur, qty: cur.qty + qty };
      added += 1;
    }
    store.importState({
      collection: next,
      decks: store.decks,
      matches: store.matches,
    });
    setImportNote(`Imported ${added} line(s), skipped ${skipped}.`);
  }

  const plainText = Object.entries(store.collection)
    .map(([id, v]) => {
      const c = getCard(id);
      if (!c) return null;
      const parts: string[] = [];
      if (v.qty > 0) parts.push(`${v.qty} ${c.id}`);
      if (v.qtyFoil > 0) parts.push(`${v.qtyFoil} ${c.id} (foil)`);
      return parts.join("\n");
    })
    .filter(Boolean)
    .join("\n");

  return (
    <div>
      <h1 className="text-2xl font-bold">Collection</h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Stored in your browser. Add copies from the card grid or import a
        list below.
      </p>
      <div className="mt-4 flex flex-wrap gap-6 font-mono text-sm">
        <span>
          Copies owned: <strong>{ownedCount}</strong>
        </span>
        <span>
          Total value: <strong>{formatPrice(value.total)}</strong>
        </span>
        {value.unpriced.length > 0 && (
          <span className="text-neutral-500">
            {value.unpriced.length} unpriced line(s) excluded
          </span>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => download("collection.csv", toCsv(store.collection))}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
        >
          Export CSV
        </button>
        <button
          type="button"
          onClick={() => download("collection.txt", plainText)}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
        >
          Export text
        </button>
      </div>

      {bySet.map(([setCode, info]) => (
        <section key={setCode} className="mt-8">
          <h2 className="text-lg font-semibold">
            {setCode} — {info.owned} of {info.total} printings owned
          </h2>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left dark:border-neutral-800">
                  <th className="py-1 pr-2">Card</th>
                  <th className="py-1 pr-2">Number</th>
                  <th className="py-1 pr-2">Price</th>
                  <th className="py-1 pr-2">Owned</th>
                  <th className="py-1 pr-2">Foil</th>
                  <th className="py-1">Adjust</th>
                </tr>
              </thead>
              <tbody>
                {info.cards.map((c) => {
                  const owned = store.collection[c.id];
                  return (
                    <tr
                      key={c.id}
                      className="border-b border-neutral-100 dark:border-neutral-900"
                    >
                      <td className="py-1 pr-2">
                        <Link href={`/cards/${c.id}`} className="underline">
                          {c.name}
                        </Link>
                      </td>
                      <td className="py-1 pr-2 font-mono text-xs">
                        {c.collectorNumber}
                      </td>
                      <td className="py-1 pr-2 font-mono text-xs">
                        {formatPrice(c.price)}
                      </td>
                      <td className="py-1 pr-2">{owned?.qty ?? 0}</td>
                      <td className="py-1 pr-2">{owned?.qtyFoil ?? 0}</td>
                      <td className="py-1">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            aria-label={`Add ${c.name}`}
                            onClick={() => store.addCollection(c.id, false, 1)}
                            className="rounded border border-neutral-300 px-2 dark:border-neutral-700"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            aria-label={`Remove ${c.name}`}
                            onClick={() => store.addCollection(c.id, false, -1)}
                            className="rounded border border-neutral-300 px-2 dark:border-neutral-700"
                          >
                            −
                          </button>
                          <button
                            type="button"
                            aria-label={`Add foil ${c.name}`}
                            onClick={() => store.addCollection(c.id, true, 1)}
                            className="rounded border border-neutral-300 px-2 dark:border-neutral-700"
                          >
                            +F
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Import</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Paste lines like “3 OGN-001” or “2 Jinx” (one per line), or rows
          from a CSV export. Matching is by card id first, then by exact
          card name.
        </p>
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          rows={6}
          placeholder={"3 OGN-001\n2 Jinx"}
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
      </section>
    </div>
  );
}
