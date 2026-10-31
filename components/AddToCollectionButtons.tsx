"use client";

import { useStore } from "@/lib/store";

export function AddToCollectionButtons({ cardId }: { cardId: string }) {
  const store = useStore();
  const owned = store.collection[cardId];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => store.addCollection(cardId, false, 1)}
        className="rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white dark:bg-white dark:text-black"
      >
        + Add to collection
      </button>
      <button
        type="button"
        onClick={() => store.addCollection(cardId, true, 1)}
        className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
      >
        + Add foil
      </button>
      {owned && (owned.qty > 0 || owned.qtyFoil > 0) && (
        <>
          <span className="text-sm text-neutral-500">
            Owned: {owned.qty}
            {owned.qtyFoil > 0 ? ` (+${owned.qtyFoil} foil)` : ""}
          </span>
          <button
            type="button"
            onClick={() => store.addCollection(cardId, false, -1)}
            className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700"
          >
            − Remove
          </button>
        </>
      )}
    </div>
  );
}
