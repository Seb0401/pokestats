"use client";

import { iconUrl } from "@/lib/format";
import type { GameState, Pokemon } from "@/lib/types";
import { ScorePill } from "./ui";

/**
 * Cuadro de doble entrada: una fila por categoría, una columna por jugador.
 * Las celdas de categorías todavía no reveladas aparecen tapadas, salvo la
 * propia, que el jugador siempre ve.
 */
export function PickGrid({
  state, highlight,
}: {
  state: GameState;
  /** Slugs de categoría a resaltar (las sorteadas para la batalla). */
  highlight?: string[];
}) {
  const { players, rounds, picks, me } = state;
  const marked = new Set(highlight ?? []);

  if (players.length === 0) {
    return <p className="py-6 text-center text-sm text-ink-400">Aún no hay jugadores.</p>;
  }

  const byCatPlayer = new Map<string, Pokemon>();
  for (const [slug, list] of Object.entries(picks)) {
    for (const entry of list) byCatPlayer.set(`${slug}|${entry.player_id}`, entry.pokemon);
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 min-w-44 bg-ink-950/95 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-400 backdrop-blur">
              Categoría
            </th>
            {players.map((pl) => (
              <th
                key={pl.id}
                className={`min-w-28 px-2 py-2 text-center text-xs font-semibold
                  ${pl.id === me?.id ? "text-volt-400" : "text-ink-300"}`}
              >
                <span className="block truncate">{pl.nickname}</span>
                {pl.id === me?.id && <span className="text-[10px] font-normal text-ink-400">tú</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rounds.map((r) => {
            const active = state.room.phase === "picking" && r.position === state.room.current_position;
            const isMarked = marked.has(r.category.slug);
            return (
              <tr key={r.category.slug}>
                <th
                  scope="row"
                  className={`sticky left-0 z-10 border-t border-ink-800 bg-ink-950/95 px-3 py-2 text-left align-middle backdrop-blur
                    ${isMarked ? "text-volt-400" : active ? "text-ink-200" : "text-ink-300"}`}
                >
                  <span className="flex items-center gap-2 font-medium">
                    <span aria-hidden>{r.category.emoji}</span>
                    <span className="truncate text-xs">{r.category.name}</span>
                    {isMarked && (
                      <span className="rounded bg-volt-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-volt-400">
                        batalla
                      </span>
                    )}
                    {active && (
                      <span className="size-1.5 shrink-0 rounded-full bg-volt-500 pulse" aria-label="en curso" />
                    )}
                  </span>
                </th>

                {players.map((pl) => {
                  const mon = byCatPlayer.get(`${r.category.slug}|${pl.id}`);
                  const mine = pl.id === me?.id;
                  return (
                    <td
                      key={pl.id}
                      className={`border-t border-ink-800 px-1 py-1.5 text-center
                        ${isMarked ? "bg-volt-500/[0.06]" : ""}`}
                    >
                      {mon ? (
                        <span
                          className={`inline-flex flex-col items-center gap-0.5 rounded-lg px-1 py-1
                            ${mine ? "bg-volt-500/10 ring-1 ring-volt-500/30" : ""}`}
                          title={`${mon.name} · puntaje ${Number(mon.battle_score).toFixed(1)}`}
                        >
                          <img
                            src={iconUrl(mon)}
                            alt={mon.name}
                            loading="lazy"
                            width={48}
                            height={48}
                            className="size-10 object-contain [image-rendering:pixelated]"
                          />
                          <span className="max-w-24 truncate text-[10px] text-ink-300">{mon.name}</span>
                        </span>
                      ) : r.state === "revealed" ? (
                        <span className="text-xs text-ink-600">—</span>
                      ) : (
                        <span
                          className="inline-block rounded-lg bg-ink-800 px-3 py-3 text-base"
                          aria-label="Elección oculta"
                          title="Se revela cuando el anfitrión cierre la categoría"
                        >
                          🔒
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Tabla de posiciones acumulada. */
export function Leaderboard({ state }: { state: GameState }) {
  if (!state.leaderboard.length) return null;
  const top = state.leaderboard[0]?.total ?? 0;

  return (
    <ol className="grid gap-1.5">
      {state.leaderboard.map((row, i) => {
        const mine = row.player_id === state.me?.id;
        return (
          <li
            key={row.player_id}
            className={`card flex items-center gap-3 px-3 py-2 ${mine ? "border-volt-500/50" : ""}`}
          >
            <span
              className={`flex size-7 shrink-0 items-center justify-center rounded-lg text-sm font-bold
                ${i === 0 ? "bg-volt-500 text-ink-950" : "bg-ink-800 text-ink-300"}`}
            >
              {i + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold text-ink-200">{row.nickname}</span>
              <span className="mt-1 block h-1 rounded-full bg-ink-800">
                <span
                  className="block h-full rounded-full bg-gradient-to-r from-aqua-500 to-volt-500"
                  style={{ width: top > 0 ? `${(row.total / top) * 100}%` : "0%" }}
                />
              </span>
            </span>
            <span className="shrink-0 text-right">
              <ScorePill value={row.total} size="sm" />
              <span className="mt-0.5 block text-[10px] text-ink-400">
                {row.wins} ronda{row.wins === 1 ? "" : "s"}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
