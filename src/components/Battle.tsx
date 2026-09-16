"use client";

import { spriteUrl } from "@/lib/format";
import type { BattleRound, GameState } from "@/lib/types";
import { PokemonCard } from "./PokemonCard";
import { ScorePill, Types } from "./ui";

function RoundHeader({ round, total }: { round: BattleRound; total: number }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="flex items-center gap-2 font-display text-lg font-bold text-ink-200">
        <span aria-hidden>{round.category.emoji}</span>
        {round.category.name}
      </h3>
      <span className="text-xs uppercase tracking-wide text-ink-400">
        Ronda {round.index + 1} de {total}
      </span>
    </div>
  );
}

export function BattleRoundView({
  round, total, meId,
}: {
  round: BattleRound;
  total: number;
  meId: string | null;
}) {
  if (!round.revealed) {
    return (
      <section className="card grid gap-3 p-4 opacity-70">
        <RoundHeader round={round} total={total} />
        <p className="py-6 text-center text-sm text-ink-400">
          🔒 A la espera de que el anfitrión revele esta ronda.
        </p>
      </section>
    );
  }

  const [first, ...rest] = round.standings;

  return (
    <section className="card grid gap-4 p-4 rise">
      <RoundHeader round={round} total={total} />

      {!first?.pokemon ? (
        <p className="py-6 text-center text-sm text-ink-400">
          Nadie eligió Pokémon en esta categoría.
        </p>
      ) : (
        <>
          <div className="grid gap-1.5">
            <p className="text-xs uppercase tracking-wide text-ink-400">Vencedor</p>
            <PokemonCard
              p={first.pokemon}
              crown
              footer={
                <div className="flex items-center justify-between border-t border-ink-700 pt-3">
                  <span className="font-semibold text-ink-200">
                    {first.nickname}
                    {first.player_id === meId && <span className="ml-1 text-xs text-volt-400">(tú)</span>}
                  </span>
                  <span className="text-sm text-ink-300">
                    +{first.points} pts
                    <span className="ml-1 text-xs text-ink-400">(incluye bonus de ronda)</span>
                  </span>
                </div>
              }
            />
          </div>

          {rest.length > 0 && (
            <div className="grid gap-1.5">
              <p className="text-xs uppercase tracking-wide text-ink-400">Resto de la mesa</p>
              <ul className="grid gap-1.5">
                {rest.map((s) => (
                  <li
                    key={s.player_id}
                    className={`flex items-center gap-3 rounded-xl border border-ink-800 bg-white/[0.02] px-3 py-2
                      ${s.player_id === meId ? "border-volt-500/40" : ""}`}
                  >
                    {s.pokemon ? (
                      <img
                        src={spriteUrl(s.pokemon)}
                        alt=""
                        loading="lazy"
                        width={48}
                        height={48}
                        className="size-11 shrink-0 object-contain"
                      />
                    ) : (
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-ink-800 text-lg">
                        —
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink-200">
                        {s.nickname}
                        {s.player_id === meId && <span className="ml-1 text-xs text-volt-400">(tú)</span>}
                      </span>
                      <span className="block truncate text-xs text-ink-400">
                        {s.pokemon?.name ?? "Sin elección"}
                      </span>
                      {s.pokemon && (
                        <span className="mt-1 flex gap-1">
                          <Types p={s.pokemon} />
                        </span>
                      )}
                    </span>
                    <ScorePill value={s.points} size="sm" />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export function BattleBoard({ state }: { state: GameState }) {
  if (!state.battle) return null;
  return (
    <div className="grid gap-4">
      {state.battle.map((r) => (
        <BattleRoundView
          key={r.category.slug}
          round={r}
          total={state.battle!.length}
          meId={state.me?.id ?? null}
        />
      ))}
    </div>
  );
}
