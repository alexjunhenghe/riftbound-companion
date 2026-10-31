import Link from "next/link";
import { notFound } from "next/navigation";
import { formatPrice, getCard, otherPrintings } from "@/lib/catalog";
import { DomainChips } from "@/components/CardTile";
import { AddToCollectionButtons } from "@/components/AddToCollectionButtons";

// Rendered on demand (not statically generated): the catalogue is a
// checked-in snapshot that can be empty before the first import, and
// static generation fails on an empty param list.
export const dynamic = "force-dynamic";

export default async function CardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const card = getCard(id);
  if (!card) notFound();
  const others = otherPrintings(card);

  return (
    <div>
      <Link href="/cards" className="text-sm font-medium underline">
        ← Back to cards
      </Link>
      <div className="mt-4 grid gap-6 md:grid-cols-[280px_1fr]">
        {card.imageLarge ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.imageLarge}
            alt={card.name}
            className="w-full max-w-[280px] rounded-lg border border-neutral-200 dark:border-neutral-800"
          />
        ) : (
          <div className="flex aspect-[63/88] w-full max-w-[280px] items-center justify-center rounded-lg border border-neutral-200 bg-neutral-100 p-4 text-center dark:border-neutral-800 dark:bg-neutral-900">
            {card.name}
          </div>
        )}
        <div>
          <h1 className="text-3xl font-bold">{card.name}</h1>
          <p className="mt-1 font-mono text-sm text-neutral-500">
            {card.setCode} · {card.collectorNumber} · {card.rarity} ·{" "}
            {card.type}
            {card.supertype ? ` · ${card.supertype}` : ""}
          </p>
          <div className="mt-2">
            <DomainChips domains={card.domains} />
          </div>
          <dl className="mt-4 grid max-w-md grid-cols-3 gap-2 font-mono text-sm">
            <div>
              <dt className="text-xs text-neutral-500">Energy</dt>
              <dd>{card.cost ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">Power</dt>
              <dd>{card.power ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">Might</dt>
              <dd>{card.might ?? "—"}</dd>
            </div>
          </dl>
          {card.keywords.length > 0 && (
            <p className="mt-3 text-sm">
              <span className="font-medium">Keywords: </span>
              {card.keywords.join(", ")}
            </p>
          )}
          <p className="mt-3 whitespace-pre-line text-base leading-relaxed">
            {card.rulesText}
          </p>
          {card.flavorText && (
            <p className="mt-2 text-sm italic text-neutral-500">
              {card.flavorText}
            </p>
          )}
          <div className="mt-4 flex items-center gap-4 font-mono text-sm">
            <span>
              Normal: <strong>{formatPrice(card.price)}</strong>
            </span>
            <span>
              Foil: <strong>{formatPrice(card.priceFoil)}</strong>
            </span>
          </div>
          <div className="mt-4">
            <AddToCollectionButtons cardId={card.id} />
          </div>
        </div>
      </div>
      {others.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Other printings</h2>
          <ul className="mt-2 space-y-1">
            {others.map((o) => (
              <li key={o.id}>
                <Link href={`/cards/${o.id}`} className="text-sm underline">
                  {o.setCode} · {o.collectorNumber} · {o.rarity}
                </Link>{" "}
                <span className="font-mono text-sm text-neutral-500">
                  {formatPrice(o.price)}
                  {o.priceFoil !== null && o.priceFoil !== undefined
                    ? ` / foil ${formatPrice(o.priceFoil)}`
                    : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
