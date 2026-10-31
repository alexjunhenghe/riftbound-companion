import Link from "next/link";
import { CARDS, CATALOG_META, distinctValues } from "@/lib/catalog";

const DOMAINS = ["Fury", "Calm", "Mind", "Body", "Chaos", "Order"];

export default function Home() {
  const sets = distinctValues((c) => c.setCode);
  return (
    <div>
      <section className="py-10 text-center md:py-16">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
          Collect. Build. Compete.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-neutral-600 dark:text-neutral-400">
          Track your Riftbound collection, build decks with prices, and log
          your matches — all stored in your browser, no account needed.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/cards"
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
          >
            Browse cards
          </Link>
          <Link
            href="/decks/new"
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium dark:border-neutral-700"
          >
            Build a deck
          </Link>
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {DOMAINS.map((d) => (
            <Link
              key={d}
              href={`/cards?domain=${d}`}
              className={`domain-chip domain-${d.toLowerCase()} rounded-full px-3 py-1 text-sm font-medium`}
            >
              {d}
            </Link>
          ))}
        </div>
        <p className="mt-8 font-mono text-xs text-neutral-500">
          {CARDS.length.toLocaleString()} printings · {sets.length} sets ·{" "}
          {CATALOG_META.source} · snapshot {CATALOG_META.fetchedAt}
        </p>
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <h2 className="font-semibold">Collection</h2>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Add copies from the card grid and watch your binder value add up
            from the latest prices.
          </p>
          <Link href="/collection" className="mt-3 inline-block text-sm font-medium underline">
            Open your collection →
          </Link>
        </div>
        <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <h2 className="font-semibold">Decks</h2>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Legend-first building with autosave, legality notes, price
            totals, and shareable links.
          </p>
          <Link href="/decks" className="mt-3 inline-block text-sm font-medium underline">
            Open your decks →
          </Link>
        </div>
        <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <h2 className="font-semibold">Matches</h2>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Log BO1 and BO3 results per deck and see win rates by deck and
            matchup.
          </p>
          <Link href="/matches" className="mt-3 inline-block text-sm font-medium underline">
            Open match log →
          </Link>
        </div>
      </section>
    </div>
  );
}
