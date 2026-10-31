"use client";

import { useMemo, useState } from "react";
import { useStore, winRate } from "@/lib/store";

function pct(rate: number | null): string {
  return rate === null ? "—" : `${(rate * 100).toFixed(1)}%`;
}

export default function MatchesPage() {
  const store = useStore();
  const [deckId, setDeckId] = useState("");
  const [opponentLegend, setOpponentLegend] = useState("");
  const [opponentArchetype, setOpponentArchetype] = useState("");
  const [format, setFormat] = useState<"BO1" | "BO3">("BO1");
  const [gamesWon, setGamesWon] = useState(1);
  const [gamesLost, setGamesLost] = useState(0);
  const [eventName, setEventName] = useState("");
  const [notes, setNotes] = useState("");
  const [note, setNote] = useState("");

  const { matches, decks } = store;
  const overall = useMemo(() => winRate(matches), [matches]);

  const perDeck = useMemo(() => {
    const map = new Map<string, typeof matches>();
    for (const m of matches) {
      const list = map.get(m.deckId) ?? [];
      list.push(m);
      map.set(m.deckId, list);
    }
    return [...map.entries()].map(([id, list]) => ({
      deckId: id,
      ...winRate(list),
      count: list.length,
    }));
  }, [matches]);

  const perMatchup = useMemo(() => {
    const map = new Map<string, typeof matches>();
    for (const m of matches) {
      const key = m.opponentLegend || "(unknown)";
      const list = map.get(key) ?? [];
      list.push(m);
      map.set(key, list);
    }
    return [...map.entries()].map(([legend, list]) => ({
      legend,
      ...winRate(list),
      count: list.length,
    }));
  }, [matches]);

  function submit() {
    if (!deckId) {
      setNote("Choose a deck first.");
      return;
    }
    store.addMatch({
      deckId,
      opponentLegend: opponentLegend.trim(),
      opponentArchetype: opponentArchetype.trim(),
      format,
      gamesWon,
      gamesLost,
      eventName: eventName.trim(),
      playedAt: new Date().toISOString(),
      notes: notes.trim(),
    });
    setNote("Match logged.");
    setOpponentLegend("");
    setOpponentArchetype("");
    setEventName("");
    setNotes("");
  }

  const inputClass =
    "mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-950";

  return (
    <div>
      <h1 className="text-2xl font-bold">Match log</h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Log results per deck. Win rates are computed from your own logged
        matches only.
      </p>

      <div className="mt-4 flex flex-wrap gap-6 font-mono text-sm">
        <span>
          Matches: <strong>{store.matches.length}</strong>
        </span>
        <span>
          Overall:{" "}
          <strong>
            {overall.wins}W – {overall.losses}L ({pct(overall.rate)})
          </strong>
        </span>
      </div>

      <section className="mt-6 max-w-xl rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="font-semibold">Log a match</h2>
        <label className="mt-3 block text-sm font-medium">
          Deck
          <select
            value={deckId}
            onChange={(e) => setDeckId(e.target.value)}
            className={inputClass}
          >
            <option value="">— Choose a deck —</option>
            {decks.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium">
            Opponent legend
            <input
              type="text"
              value={opponentLegend}
              onChange={(e) => setOpponentLegend(e.target.value)}
              placeholder="e.g. Jinx"
              className={inputClass}
            />
          </label>
          <label className="block text-sm font-medium">
            Opponent archetype
            <input
              type="text"
              value={opponentArchetype}
              onChange={(e) => setOpponentArchetype(e.target.value)}
              placeholder="Optional"
              className={inputClass}
            />
          </label>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <label className="block text-sm font-medium">
            Format
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as "BO1" | "BO3")}
              className={inputClass}
            >
              <option value="BO1">BO1</option>
              <option value="BO3">BO3</option>
            </select>
          </label>
          <label className="block text-sm font-medium">
            Games won
            <input
              type="number"
              min={0}
              value={gamesWon}
              onChange={(e) => setGamesWon(parseInt(e.target.value, 10) || 0)}
              className={inputClass}
            />
          </label>
          <label className="block text-sm font-medium">
            Games lost
            <input
              type="number"
              min={0}
              value={gamesLost}
              onChange={(e) => setGamesLost(parseInt(e.target.value, 10) || 0)}
              className={inputClass}
            />
          </label>
        </div>
        <label className="mt-3 block text-sm font-medium">
          Event
          <input
            type="text"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            placeholder="Optional"
            className={inputClass}
          />
        </label>
        <label className="mt-3 block text-sm font-medium">
          Notes
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className={inputClass}
          />
        </label>
        <button
          type="button"
          onClick={submit}
          className="mt-4 rounded-md bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          Log match
        </button>
        {note && (
          <p className="mt-2 text-sm text-neutral-500" role="status">
            {note}
          </p>
        )}
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="text-lg font-semibold">Win rate by deck</h2>
          {perDeck.length === 0 ? (
            <p className="mt-2 text-sm text-neutral-500">No matches yet.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {perDeck.map((d) => (
                <li key={d.deckId}>
                  {decks.find((x) => x.id === d.deckId)?.name ?? "Deleted deck"}
                  : {d.wins}W – {d.losses}L ({pct(d.rate)}) over {d.count} match
                  {d.count === 1 ? "" : "es"}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h2 className="text-lg font-semibold">Win rate by matchup</h2>
          {perMatchup.length === 0 ? (
            <p className="mt-2 text-sm text-neutral-500">No matches yet.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {perMatchup.map((m) => (
                <li key={m.legend}>
                  vs {m.legend}: {m.wins}W – {m.losses}L ({pct(m.rate)}) over{" "}
                  {m.count} match{m.count === 1 ? "" : "es"}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Match history</h2>
        {store.matches.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">No matches logged.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {[...store.matches].reverse().map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-200 p-3 text-sm dark:border-neutral-800"
              >
                <span>
                  {decks.find((d) => d.id === m.deckId)?.name ?? "Deleted deck"}{" "}
                  vs {m.opponentLegend || "unknown"}
                  {m.opponentArchetype ? ` (${m.opponentArchetype})` : ""} ·{" "}
                  {m.format} · {m.gamesWon}–{m.gamesLost}
                  {m.eventName ? ` · ${m.eventName}` : ""}
                  {m.notes ? ` · ${m.notes}` : ""}
                </span>
                <button
                  type="button"
                  onClick={() => store.deleteMatch(m.id)}
                  className="rounded-md border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
