"use client";

import Link from "next/link";
import { formatPrice, type CardPrinting } from "@/lib/catalog";
import { useStore } from "@/lib/store";

function domainClass(domain: string): string {
  return `domain-chip domain-${domain.toLowerCase()}`;
}

export function DomainChips({ domains }: { domains: string[] }) {
  return (
    <span className="flex flex-wrap gap-1">
      {domains.map((d) => (
        <span
          key={d}
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${domainClass(d)}`}
        >
          {d}
        </span>
      ))}
    </span>
  );
}

export function CardTile({ card }: { card: CardPrinting }) {
  const store = useStore();
  const owned = store.collection[card.id];
  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
      <Link href={`/cards/${card.id}`} className="block">
        {card.imageLarge ? (
          // Plain img: catalogue hosts vary; next/image would need a
          // remote-pattern per host.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.imageLarge}
            alt={card.name}
            className="aspect-[63/88] w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex aspect-[63/88] w-full items-center justify-center bg-neutral-100 p-3 text-center text-sm text-neutral-500 dark:bg-neutral-900">
            {card.name}
          </div>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <Link
          href={`/cards/${card.id}`}
          className="text-sm font-semibold leading-snug hover:underline"
        >
          {card.name}
        </Link>
        <p className="font-mono text-xs text-neutral-500">
          {card.setCode} · {card.collectorNumber} · {card.rarity}
        </p>
        <DomainChips domains={card.domains} />
        <p className="font-mono text-sm">
          {formatPrice(card.price)}
          {card.priceFoil !== null && card.priceFoil !== undefined && (
            <span className="text-neutral-500">
              {" "}
              / foil {formatPrice(card.priceFoil)}
            </span>
          )}
        </p>
        <div className="mt-auto flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => store.addCollection(card.id, false, 1)}
            className="rounded-md bg-black px-2 py-1 text-xs font-medium text-white dark:bg-white dark:text-black"
          >
            + Add
          </button>
          <button
            type="button"
            onClick={() => store.addCollection(card.id, true, 1)}
            className="rounded-md border border-neutral-300 px-2 py-1 text-xs font-medium dark:border-neutral-700"
          >
            + Foil
          </button>
          {owned && (owned.qty > 0 || owned.qtyFoil > 0) && (
            <span className="text-xs text-neutral-500">
              Owned: {owned.qty}
              {owned.qtyFoil > 0 ? ` (+${owned.qtyFoil} foil)` : ""}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
