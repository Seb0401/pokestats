"use client";

import { iconUrl } from "@/lib/format";
import type { GameState, RevealedPick } from "@/lib/types";
import { hasScore } from "@/lib/types";
import { BotIcon, CategoryIcon, DiceIcon, LockIcon } from "./icons";

/**
 * Cuadro de doble entrada: una fila por categoría y una columna por entrenador.
 * Las celdas de categorías sin revelar aparecen tapadas, salvo la propia.
 */
export function PickGrid({ state }: { state: GameState }) {
  const { players, rounds, picks, me } = state;

  if (players.length === 0) {
    return <p className="py-6 text-center text-sm text-ink-400">Aún no hay entrenadores.</p>;
  }

  const cell = new Map<string, RevealedPick>();
  for (const [slug, list] of Object.entries(picks)) {
    for (const entry of list) cell.set(`${slug}|${entry.player_id}`, entry);
  }

  return (
    <div className="overflow-x-auto rounded-xl">
      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 min-w-40 bg-screen-900 px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-screen-300">
              Categoría
            </th>
            {players.map((pl) => {
              const mine = pl.id === me?.id;
              return (
                <th key={pl.id} className="min-w-24 px-1.5 py-2 text-center align-bottom">
                  <span
                    className={`mx-auto flex max-w-28 items-center justify-center gap-1 rounded-md px-1.5 py-1 text-xs font-bold
                      ${mine ? "bg-volt-500/20 text-volt-400" : pl.is_bot ? "text-lens-300" : "text-ink-200"}`}
                  >
                    {pl.is_bot && <BotIcon size={12} className="shrink-0" />}
                    <span className="truncate">{pl.nickname}</span>
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rounds.map((r) => {
            const active = state.room.phase === "picking" && r.position === state.room.current_position;
            return (
              <tr key={r.category.slug}>
                <th
                  scope="row"
                  className={`sticky left-0 z-10 border-t border-white/5 bg-screen-900 px-3 py-2 text-left align-middle
                    ${active ? "text-volt-400" : "text-ink-200"}`}
                >
                  <span className="flex items-center gap-2">
                    <CategoryIcon slug={r.category.slug} size={15} className="shrink-0 text-volt-400" />
                    <span className="truncate text-xs font-bold">{r.category.name}</span>
                    {active && <span className="glow size-2 shrink-0 rounded-full bg-volt-500" aria-label="en curso" />}
                  </span>
                </th>

                {players.map((pl) => {
                  const entry = cell.get(`${r.category.slug}|${pl.id}`);
                  const mine = pl.id === me?.id;
                  return (
                    <td key={pl.id} className="border-t border-white/5 px-1 py-1.5 text-center">
                      {entry ? (
                        <span
                          className={`relative inline-flex flex-col items-center gap-0.5 rounded-lg px-1 py-1
                            ${mine ? "bg-volt-500/10 ring-1 ring-volt-500/30" : ""}`}
                          title={
                            entry.pokemon.name +
                            (entry.random ? " (sorteado)" : "") +
                            (hasScore(entry.pokemon) ? ` · ${Number(entry.pokemon.battle_score).toFixed(1)}` : "")
                          }
                        >
                          {entry.random && (
                            <span className="absolute -right-0.5 -top-0.5 rounded bg-ink-800 p-0.5 text-ink-300">
                              <DiceIcon size={10} strokeWidth={2.5} />
                            </span>
                          )}
                          <img
                            src={iconUrl(entry.pokemon)}
                            alt={entry.pokemon.name}
                            loading="lazy"
                            width={48}
                            height={48}
                            className="size-10 object-contain [image-rendering:pixelated]"
                          />
                          <span className="max-w-24 truncate text-[10px] font-semibold text-ink-300">
                            {entry.pokemon.name}
                          </span>
                        </span>
                      ) : r.state === "revealed" ? (
                        <span className="text-xs text-ink-600">—</span>
                      ) : (
                        <span
                          className="inline-flex size-11 items-center justify-center rounded-lg bg-black/25 text-ink-600"
                          aria-label="Elección oculta"
                          title="Se revela cuando el anfitrión cierre la categoría"
                        >
                          <LockIcon size={16} />
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
