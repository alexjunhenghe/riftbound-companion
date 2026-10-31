"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CardTile } from "@/components/CardTile";
import {
  distinctValues,
  searchCards,
  type CardFilters,
} from "@/lib/catalog";

function CardsInner() {
  const params = useSearchParams();
  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState(params.get("domain") ?? "");
  const [type, setType] = useState("");
  const [setCode, setSetCode] = useState(params.get("set") ?? "");
  const [rarity, setRarity] = useState("");

  const domains = distinctValues((c) => c.domains);
  const types = distinctValues((c) => c.type);
  const sets = distinctValues((c) => c.setCode);
  const rarities = distinctValues((c) => c.rarity);

  const filters: CardFilters = {
    ...(domain ? { domain } : {}),
    ...(type ? { type } : {}),
    ...(setCode ? { setCode } : {}),
    ...(rarity ? { rarity } : {}),
  };
  const results = useMemo(
    () => searchCards(query, filters),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [query, domain, type, setCode, rarity],
  );

  const selectClass =
    "rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-black";

  return (
    <div>
      <h1 className="text-2xl font-bold">Cards</h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Search by name, rules text, or collector number. Add copies straight
        from the grid.
      </p>
      <div className="sticky top-0 z-10 -mx-4 bg-white px-4 py-3 dark:bg-black md:-mx-8 md:px-8">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search cards…"
          aria-label="Search cards"
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-base dark:border-neutral-700 dark:bg-neutral-950"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <select aria-label="Filter by domain" value={domain} onChange={(e) => setDomain(e.target.value)} className={selectClass}>
            <option value="">All domains</option>
            {domains.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <select aria-label="Filter by type" value={type} onChange={(e) => setType(e.target.value)} className={selectClass}>
            <option value="">All types</option>
            {types.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select aria-label="Filter by set" value={setCode} onChange={(e) => setSetCode(e.target.value)} className={selectClass}>
            <option value="">All sets</option>
            {sets.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select aria-label="Filter by rarity" value={rarity} onChange={(e) => setRarity(e.target.value)} className={selectClass}>
            <option value="">All rarities</option>
            {rarities.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          {(query || domain || type || setCode || rarity) && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setDomain("");
                setType("");
                setSetCode("");
                setRarity("");
              }}
              className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>
      <p className="mt-2 text-sm text-neutral-500" role="status">
        {results.length.toLocaleString()} card{results.length === 1 ? "" : "s"}
      </p>
      {results.length === 0 ? (
        <p className="mt-8 text-neutral-500">
          No cards match. Try a different search or clear the filters.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {results.slice(0, 500).map((card) => (
            <CardTile key={card.id} card={card} />
          ))}
        </div>
      )}
      {results.length > 500 && (
        <p className="mt-4 text-sm text-neutral-500">
          Showing the first 500 of {results.length.toLocaleString()} results —
          narrow your search to see more.
        </p>
      )}
    </div>
  );
}

export default function CardsPage() {
  return (
    <Suspense fallback={<p>Loading cards…</p>}>
      <CardsInner />
    </Suspense>
  );
}
