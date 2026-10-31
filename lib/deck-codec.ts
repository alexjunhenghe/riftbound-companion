import type { Format, Zone } from "./rules";
import type { DeckCardEntry } from "./store";

/** Shareable deck encoding: base64url JSON, versioned. Kept compact
 *  enough for a URL query parameter. */
export type DeckShare = {
  v: 1;
  name: string;
  format: Format;
  legendId: string | null;
  championId: string | null;
  cards: DeckCardEntry[];
};

export function encodeDeck(share: DeckShare): string {
  const json = JSON.stringify(share);
  const b64 =
    typeof Buffer !== "undefined"
      ? Buffer.from(json, "utf8").toString("base64")
      : btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeDeck(code: string): DeckShare | null {
  try {
    const b64 = code.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const json =
      typeof Buffer !== "undefined"
        ? Buffer.from(padded, "base64").toString("utf8")
        : decodeURIComponent(escape(atob(padded)));
    const parsed = JSON.parse(json) as DeckShare;
    if (parsed.v !== 1 || !Array.isArray(parsed.cards)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Plain-text export: one "qty Name (SET-NUM)" line per entry. */
export function deckToText(
  name: string,
  cards: DeckCardEntry[],
  lookup: (id: string) => string,
): string {
  const lines = [`Deck: ${name}`, ""];
  const zones: Zone[] = [
    "legend",
    "champion",
    "main",
    "battlefield",
    "rune",
    "sideboard",
  ];
  for (const zone of zones) {
    const inZone = cards.filter((c) => c.zone === zone);
    if (inZone.length === 0) continue;
    lines.push(`${zone[0].toUpperCase()}${zone.slice(1)}:`);
    for (const c of inZone) lines.push(`${c.qty} ${lookup(c.cardId)}`);
    lines.push("");
  }
  return lines.join("\n");
}

/** Parse the plain-text format above (name lines "qty Name" or
 *  "qty SET-NUM" are matched against the catalogue by callers). */
export function parseDeckText(
  text: string,
): { qty: number; label: string }[] {
  const out: { qty: number; label: string }[] = [];
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    const m = /^(\d+)x?\s+(.+)$/.exec(line);
    if (m) out.push({ qty: parseInt(m[1], 10), label: m[2].trim() });
  }
  return out;
}
