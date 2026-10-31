"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { decodeDeck } from "@/lib/deck-codec";
import { FORMATS, type Format } from "@/lib/rules";
import { useStore } from "@/lib/store";

function NewDeckInner() {
  const store = useStore();
  const router = useRouter();
  const params = useSearchParams();
  const [name, setName] = useState("");
  const [format, setFormat] = useState<Format>("Standard");
  const [shareError, setShareError] = useState("");
  const shareCode = params.get("d");

  // Share links point here (?d=<code>). Import is click-to-confirm so
  // opening a link never silently writes to the user's browser store.
  function importShared() {
    if (!shareCode) return;
    const decoded = decodeDeck(shareCode);
    if (!decoded) {
      setShareError("That share link could not be read.");
      return;
    }
    const deck = store.createDeck(decoded.name, decoded.format);
    store.updateDeck({
      ...deck,
      legendId: decoded.legendId,
      championId: decoded.championId,
      cards: decoded.cards,
    });
    router.replace(`/decks/${deck.id}`);
  }

  function create() {
    const deck = store.createDeck(name.trim() || "Untitled deck", format);
    router.push(`/decks/${deck.id}`);
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold">New deck</h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Pick a name and a format. You will choose a legend next, then add
        cards — everything autosaves.
      </p>
      {shareError && (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {shareError}
        </p>
      )}
      {shareCode && (
        <div className="mt-4 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
          <p className="text-sm">
            This link contains a shared deck. Import it into your browser
            to open it in the builder.
          </p>
          <button
            type="button"
            onClick={importShared}
            className="mt-2 rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white dark:bg-white dark:text-black"
          >
            Import shared deck
          </button>
        </div>
      )}
      <label className="mt-6 block text-sm font-medium">
        Deck name
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Untitled deck"
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-950"
        />
      </label>
      <label className="mt-4 block text-sm font-medium">
        Format
        <select
          value={format}
          onChange={(e) => setFormat(e.target.value as Format)}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-950"
        >
          {FORMATS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={create}
        className="mt-6 rounded-md bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
      >
        Create deck
      </button>
    </div>
  );
}

export default function NewDeckPage() {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <NewDeckInner />
    </Suspense>
  );
}
