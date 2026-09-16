"use client";

import { spriteUrl, typeClass } from "@/lib/format";
import type { Bracket, Match, MatchSide } from "@/lib/types";
import { hasScore } from "@/lib/types";
import { BallMark, BotIcon, CategoryIcon, CheckIcon, DiceIcon, TrophyIcon } from "./icons";
import { ScorePill } from "./ui";

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

/** El último duelo revelado del torneo, que es el que se muestra en la arena. */
export function latestRevealed(bracket: Bracket): Match | null {
  for (let r = bracket.rounds.length - 1; r >= 0; r--) {
    const revealed = bracket.rounds[r].matches.filter((m) => m.revealed);
    if (revealed.length) return revealed[revealed.length - 1];
  }
  return null;
}

/** El siguiente duelo por revelar de la ronda en curso. */
export function nextPending(bracket: Bracket): Match | null {
  const round = bracket.rounds[bracket.current_round - 1];
  return round?.matches.find((m) => !m.revealed) ?? null;
}

function TrainerName({ side, meId, className = "" }: { side: MatchSide; meId: string | null; className?: string }) {
  return (
    <span className={`flex min-w-0 items-center gap-1.5 ${className}`}>
      {side.is_bot && <BotIcon size={14} className="shrink-0 text-lens-300" />}
      <span className="truncate">{side.nickname}</span>
      {side.player_id === meId && <span className="chip shrink-0 bg-volt-500/20 text-volt-400">Tú</span>}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Llaves
// ---------------------------------------------------------------------------

function MatchSlot({ match, meId }: { match: Match; meId: string | null }) {
  const row = (side: MatchSide) => {
    const won = match.revealed && match.winner_id === side.player_id;
    const lost = match.revealed && !won;
    return (
      <div
        className={`flex items-center gap-2 px-2.5 py-1.5 text-xs font-bold
          ${won ? "bg-volt-500/15 text-volt-300" : lost ? "text-ink-600 line-through decoration-ink-600/60" : "text-ink-200"}`}
      >
        <TrainerName side={side} meId={meId} className="flex-1" />
        {won && <CheckIcon size={14} strokeWidth={3} className="shrink-0" />}
      </div>
    );
  };

  const involvesMe = meId && (match.a.player_id === meId || match.b.player_id === meId);
  return (
    <div
      className={`relative overflow-hidden rounded-lg border bg-black/25
        ${involvesMe ? "border-volt-500/50" : "border-white/10"}`}
    >
      {row(match.a)}
      <div className="h-px bg-white/10" />
      {row(match.b)}
      {!match.revealed && (
        <span className="absolute right-1.5 top-1/2 -translate-y-1/2" title="Por revelar">
          <BallMark size={16} />
        </span>
      )}
    </div>
  );
}

export function BracketView({ bracket, meId }: { bracket: Bracket; meId: string | null }) {
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-max gap-4">
        {bracket.rounds.map((round) => (
          <div key={round.round} className="flex w-52 flex-col">
            <p
              className={`mb-2 text-center font-display text-xs font-semibold uppercase tracking-widest
                ${round.round === bracket.current_round ? "text-volt-400" : "text-screen-300"}`}
            >
              {round.name}
            </p>
            {/* justify-around alinea cada duelo entre los dos que lo alimentan. */}
            <div className="flex flex-1 flex-col justify-around gap-3">
              {round.matches.map((m) => <MatchSlot key={m.slot} match={m} meId={meId} />)}
              {Array.from({ length: round.pending_slots }, (_, i) => (
                <div
                  key={`p${i}`}
                  className="rounded-lg border border-dashed border-white/10 px-2.5 py-3 text-center text-[11px] font-semibold text-ink-600"
                >
                  Por definir
                </div>
              ))}
            </div>
          </div>
        ))}
        {bracket.champion && (
          <div className="flex w-40 flex-col items-center justify-center gap-2 text-center">
            <TrophyIcon size={36} className="text-volt-400" />
            <p className="font-display text-sm font-bold text-volt-300">{bracket.champion.nickname}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Arena de un duelo
// ---------------------------------------------------------------------------

function TeamPanel({
  side, won, meId, delay, align,
}: {
  side: MatchSide;
  won: boolean;
  meId: string | null;
  delay: number;
  align: "left" | "right";
}) {
  return (
    <div
      className={`panel relative grid content-start gap-3 p-3 transition
        ${won ? "border-volt-500/60 shadow-[0_0_40px_-12px_rgba(255,203,5,0.55)]" : "opacity-60 saturate-50"}`}
    >
      <div className={`flex items-center gap-2 ${align === "right" ? "sm:flex-row-reverse sm:text-right" : ""}`}>
        <TrainerName side={side} meId={meId} className="min-w-0 flex-1 font-display text-lg font-bold text-ink-100" />
        {won ? (
          <span className="chip shrink-0 bg-volt-500 text-ink-950"><TrophyIcon size={12} strokeWidth={2.6} /> Gana</span>
        ) : (
          <span className="chip shrink-0 bg-white/10 text-ink-400">Eliminado</span>
        )}
      </div>

      {side.average !== null && (
        <div className={`flex items-center gap-2 text-xs text-ink-400 ${align === "right" ? "sm:justify-end" : ""}`}>
          Promedio del equipo <ScorePill value={side.average} size="sm" />
        </div>
      )}

      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {side.team.map((member, i) => (
          <li
            key={member.category.slug}
            className={`${typeClass(member.pokemon.type1)} pop relative flex flex-col items-center gap-1 rounded-lg border border-white/10 bg-black/20 p-2 text-center`}
            style={{ animationDelay: `${delay + i * 90}ms` }}
          >
            <span className="absolute inset-x-3 top-0 h-1 rounded-b-full" style={{ background: "var(--type)" }} aria-hidden />
            {member.random && (
              <span className="absolute right-1 top-1.5 text-ink-400" title="Sorteado">
                <DiceIcon size={12} />
              </span>
            )}
            <img
              src={spriteUrl(member.pokemon)}
              alt={member.pokemon.name}
              loading="lazy"
              width={80}
              height={80}
              className="size-16 object-contain drop-shadow-[0_6px_8px_rgba(0,0,0,0.5)]"
            />
            <span className="line-clamp-1 text-[11px] font-bold text-ink-100">{member.pokemon.name}</span>
            <span className="flex max-w-full items-center gap-1 text-[10px] font-semibold text-ink-400">
              <CategoryIcon slug={member.category.slug} size={11} className="shrink-0 text-volt-400" />
              <span className="truncate">{member.category.name}</span>
            </span>
            {hasScore(member.pokemon) && <ScorePill value={Number(member.pokemon.battle_score)} size="sm" />}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DuelArena({
  match, roundName, meId,
}: {
  match: Match;
  roundName: string;
  meId: string | null;
}) {
  const aWon = match.winner_id === match.a.player_id;
  return (
    <section className="grid gap-3" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="eyebrow flex-1">{roundName} · Duelo {match.slot + 1}</p>
        {match.tiebreak && (
          <span className="chip bg-ink-100/10 text-ink-300"><DiceIcon size={11} /> Empate resuelto al azar</span>
        )}
      </div>
      <div className="grid items-stretch gap-3 lg:grid-cols-[1fr_auto_1fr]">
        <TeamPanel side={match.a} won={aWon} meId={meId} delay={0} align="left" />
        <div className="flex items-center justify-center">
          <span className="pop flex size-14 items-center justify-center rounded-full bg-dex-500 font-display text-lg font-bold text-ink-100 shadow-[0_0_0_4px_#1b1d26,0_0_0_7px_rgba(255,255,255,0.15)]">
            VS
          </span>
        </div>
        <TeamPanel side={match.b} won={!aWon} meId={meId} delay={250} align="right" />
      </div>
    </section>
  );
}

/** Duelo anunciado pero sin revelar: solo los nombres, con suspenso. */
export function DuelPending({ match, roundName, meId }: { match: Match; roundName: string; meId: string | null }) {
  return (
    <section className="grid gap-3">
      <p className="eyebrow">{roundName} · Próximo duelo</p>
      <div className="panel grid items-center gap-4 p-5 sm:grid-cols-[1fr_auto_1fr]">
        <div className="flex items-center gap-3 sm:justify-end">
          <TrainerName side={match.a} meId={meId} className="font-display text-xl font-bold text-ink-100" />
          <span className="shake"><BallMark size={34} /></span>
        </div>
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-dex-500 font-display font-bold text-ink-100">
          VS
        </span>
        <div className="flex items-center gap-3">
          <span className="shake" style={{ animationDelay: "150ms" }}><BallMark size={34} /></span>
          <TrainerName side={match.b} meId={meId} className="font-display text-xl font-bold text-ink-100" />
        </div>
      </div>
    </section>
  );
}

export function ChampionBanner({ bracket, meId }: { bracket: Bracket; meId: string | null }) {
  if (!bracket.champion) return null;
  const mine = bracket.champion.player_id === meId;
  return (
    <section className="pop relative overflow-hidden rounded-2xl border border-volt-500/50 bg-gradient-to-b from-volt-500/20 to-transparent p-6 text-center">
      <div className="pointer-events-none absolute -left-10 -top-10 opacity-10" aria-hidden><BallMark size={160} /></div>
      <div className="pointer-events-none absolute -bottom-12 -right-8 opacity-10" aria-hidden><BallMark size={180} /></div>
      <TrophyIcon size={56} className="float mx-auto text-volt-400" />
      <p className="mt-2 font-display text-xs font-semibold uppercase tracking-[0.3em] text-volt-300">
        Campeón del torneo
      </p>
      <p className="mt-1 flex items-center justify-center gap-2 font-display text-4xl font-bold text-ink-100">
        {bracket.champion.is_bot && <BotIcon size={30} className="text-lens-300" />}
        {bracket.champion.nickname}
      </p>
      {mine && <p className="mt-2 text-sm font-bold text-volt-300">¡Eres el mejor entrenador de la sala!</p>}
    </section>
  );
}
