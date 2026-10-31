"use client";

import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { Format, Zone } from "./rules";

export type CollectionEntry = { qty: number; qtyFoil: number };

export type DeckCardEntry = { cardId: string; qty: number; zone: Zone };

export type Deck = {
  id: string;
  name: string;
  format: Format;
  legendId: string | null;
  championId: string | null;
  cards: DeckCardEntry[];
  createdAt: string;
  updatedAt: string;
};

export type Match = {
  id: string;
  deckId: string;
  opponentLegend: string;
  opponentArchetype: string;
  format: "BO1" | "BO3";
  gamesWon: number;
  gamesLost: number;
  eventName: string;
  playedAt: string;
  notes: string;
};

type State = {
  collection: Record<string, CollectionEntry>;
  decks: Deck[];
  matches: Match[];
};

const EMPTY: State = { collection: {}, decks: [], matches: [] };
const KEY = "rbc-state-v1";

function load(): State {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<State>;
    return {
      collection: parsed.collection ?? {},
      decks: parsed.decks ?? [],
      matches: parsed.matches ?? [],
    };
  } catch {
    return EMPTY;
  }
}

type Store = State & {
  addCollection: (cardId: string, foil: boolean, delta: number) => void;
  setCollectionQty: (
    cardId: string,
    foil: boolean,
    qty: number,
  ) => void;
  createDeck: (name: string, format: Format) => Deck;
  updateDeck: (deck: Deck) => void;
  deleteDeck: (id: string) => void;
  addMatch: (match: Omit<Match, "id">) => void;
  deleteMatch: (id: string) => void;
  importState: (state: State) => void;
};

const Ctx = createContext<Store | null>(null);

// External-store backing for localStorage state. useSyncExternalStore
// keeps server and client snapshots consistent (EMPTY on the server)
// and avoids setState-in-effect hydration patterns.
let current: State | null = null;
const listeners = new Set<() => void>();

function getSnapshot(): State {
  if (current === null) current = load();
  return current;
}

function getServerSnapshot(): State {
  return EMPTY;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function setState(updater: (prev: State) => State) {
  const prev = getSnapshot();
  const next = updater(prev);
  current = next;
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    }
  } catch {
    // Storage full or unavailable — state still works in memory.
  }
  for (const l of listeners) l();
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const value = useMemo<Store>(
    () => ({
      ...state,
      addCollection: (cardId, foil, delta) =>
        setState((s) => {
          const cur = s.collection[cardId] ?? { qty: 0, qtyFoil: 0 };
          const next = {
            qty: foil ? cur.qty : Math.max(0, cur.qty + delta),
            qtyFoil: foil ? Math.max(0, cur.qtyFoil + delta) : cur.qtyFoil,
          };
          const collection = { ...s.collection };
          if (next.qty === 0 && next.qtyFoil === 0) delete collection[cardId];
          else collection[cardId] = next;
          return { ...s, collection };
        }),
      setCollectionQty: (cardId, foil, qty) =>
        setState((s) => {
          const cur = s.collection[cardId] ?? { qty: 0, qtyFoil: 0 };
          const next = {
            qty: foil ? cur.qty : Math.max(0, qty),
            qtyFoil: foil ? Math.max(0, qty) : cur.qtyFoil,
          };
          const collection = { ...s.collection };
          if (next.qty === 0 && next.qtyFoil === 0) delete collection[cardId];
          else collection[cardId] = next;
          return { ...s, collection };
        }),
      createDeck: (name, format) => {
        const deck: Deck = {
          id: `deck-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name,
          format,
          legendId: null,
          championId: null,
          cards: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setState((s) => ({ ...s, decks: [...s.decks, deck] }));
        return deck;
      },
      updateDeck: (deck) =>
        setState((s) => ({
          ...s,
          decks: s.decks.map((d) =>
            d.id === deck.id
              ? { ...deck, updatedAt: new Date().toISOString() }
              : d,
          ),
        })),
      deleteDeck: (id) =>
        setState((s) => ({
          ...s,
          decks: s.decks.filter((d) => d.id !== id),
        })),
      addMatch: (match) =>
        setState((s) => ({
          ...s,
          matches: [
            ...s.matches,
            {
              ...match,
              id: `match-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            },
          ],
        })),
      deleteMatch: (id) =>
        setState((s) => ({
          ...s,
          matches: s.matches.filter((m) => m.id !== id),
        })),
      importState: (next) => setState(() => next),
    }),
    [state],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const store = useContext(Ctx);
  if (!store) throw new Error("useStore must be used within StoreProvider");
  return store;
}

/** Win rate helper: wins / (wins + losses), null when no games. */
export function winRate(
  matches: Pick<Match, "gamesWon" | "gamesLost">[],
): { wins: number; losses: number; rate: number | null } {
  const wins = matches.reduce((s, m) => s + m.gamesWon, 0);
  const losses = matches.reduce((s, m) => s + m.gamesLost, 0);
  const total = wins + losses;
  return { wins, losses, rate: total === 0 ? null : wins / total };
}
