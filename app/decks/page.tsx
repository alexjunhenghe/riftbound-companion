"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getCard } from "@/lib/catalog";
import { priceTotal } from "@/lib/pricing";
import { decodeDeck } from "@/lib/deck-codec";
import { useStore } from "@/lib/store";

export default function DecksPage() {
  const store = useStore();
  const router = useRouter();
  const [shareCode, setShareCode] = useState("");
  const [shareNote, setShareNote] = useState("");

  function importFromShare() {
    const code = shareCode.trim();
    const match = /[?&]d=([^&]+)/.exec(code);
    const decoded = decodeDeck(match ? match[1] : code);
    if (!decoded) {
      setShareNote("That share code could not be read.");
      return;
    }
    const deck = store.createDeck(decoded.name, decoded.format);
    store.updateDeck({
      ...deck,
      legendId: decoded.legendId,
      championId: decoded.championId,
      cards: decoded.cards,
    });
    router.push(`/decks/${deck.id}`);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Decks</h1>
        <Link
          href="/decks/new"
          className="rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          New deck
        </Link>
      </div>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Decks autosave in your browser. Share a deck with its link, or
        import one from a share code below.
      </p>
      {store.decks.length === 0 ? (
        <p className="mt-8 text-neutral-500">
          No decks yet. Create one to start building.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {store.decks.map((deck) => {
            // Main deck size includes the Chosen Champion (TR 402.1).
            const mainCount =
              deck.cards
                .filter((c) => c.zone === "main")
                .reduce((s, c) => s + c.qty, 0) +
              (deck.championId ? 1 : 0);
            const price = priceTotal(
              deck.cards.map((c) => ({
                cardId: c.cardId,
                qty: c.qty,
                foil: false,
              })),
            );
            return (
              <li
                key={deck.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
              >
                <div>
                  <Link
                    href={`/decks/${deck.id}`}
                    className="font-semibold underline"
                  >
                    {deck.name}
                  </Link>
                  <p className="text-sm text-neutral-500">
                    {deck.format} · {mainCount} main-deck cards
                    {deck.legendId
                      ? ` · Legend: ${getCard(deck.legendId)?.name ?? deck.legendId}`
                      : ""}
                    {deck.championId
                      ? ` · Champion: ${getCard(deck.championId)?.name ?? deck.championId}`
                      : ""}{" "}
                    · ${price.total.toFixed(2)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => store.deleteDeck(deck.id)}
                  className="rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700"
                >
                  Delete
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <section className="mt-10">
        <h2 className="text-lg font-semibold">Import from a share link</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Paste a full deck link or just its share code.
        </p>
        <textarea
          value={shareCode}
          onChange={(e) => setShareCode(e.target.value)}
          rows={3}
          className="mt-2 w-full rounded-md border border-neutral-300 p-2 font-mono text-sm dark:border-neutral-700 dark:bg-neutral-950"
        />
        <button
          type="button"
          onClick={importFromShare}
          className="mt-2 rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          Import deck
        </button>
        {shareNote && (
          <p className="mt-2 text-sm text-neutral-500" role="status">
            {shareNote}
          </p>
        )}
      </section>
    </div>
  );
}
