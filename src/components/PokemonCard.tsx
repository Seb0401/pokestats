"use client";

import { iconUrl, spriteUrl } from "@/lib/format";
import type { Pokemon } from "@/lib/types";
import { ConditionBadge, PokemonMeta, ScoreBreakdown, ScorePill, StatBlock, Types } from "./ui";

/** Ficha compacta para rejillas de selección. */
export function PokemonTile({
  p, selected, onSelect, showScore = false,
}: {
  p: Pokemon;
  selected?: boolean;
  onSelect?: (p: Pokemon) => void;
  showScore?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect?.(p)}
      className={`card group flex flex-col items-center gap-1 p-2 text-center transition
        ${selected
          ? "border-volt-500 bg-volt-500/10 ring-2 ring-volt-500/40"
          : "hover:border-ink-600 hover:bg-white/[0.06]"}`}
    >
      <img
        src={iconUrl(p)}
        alt=""
        loading="lazy"
        width={72}
        height={72}
        className="size-16 object-contain [image-rendering:pixelated] transition group-hover:scale-110"
      />
      <span className="line-clamp-2 text-[11px] font-semibold leading-tight text-ink-200">
        {p.name}
      </span>
      <div className="flex items-center gap-1">
        <Types p={p} />
      </div>
      {showScore && <ScorePill value={Number(p.battle_score)} size="sm" />}
    </button>
  );
}

/** Ficha grande: la que se ve en el reveal y en la batalla. */
export function PokemonCard({
  p, footer, dim = false, crown = false,
}: {
  p: Pokemon;
  footer?: React.ReactNode;
  dim?: boolean;
  crown?: boolean;
}) {
  return (
    <article
      className={`card relative flex flex-col gap-3 p-4 transition ${dim ? "opacity-55 saturate-50" : ""}
        ${crown ? "border-volt-500/70 shadow-[0_0_40px_-12px_rgba(255,196,0,0.6)]" : ""}`}
    >
      {crown && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-volt-500 px-3 py-0.5 text-[11px] font-bold text-ink-950">
          GANA
        </span>
      )}
      <div className="flex items-start gap-3">
        <img
          src={spriteUrl(p)}
          alt={p.name}
          loading="lazy"
          width={112}
          height={112}
          className="size-24 shrink-0 object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate font-display text-lg font-bold text-ink-200">{p.name}</h3>
            <ConditionBadge p={p} />
          </div>
          <div className="mt-1.5">
            <Types p={p} />
          </div>
          <div className="mt-2">
            <PokemonMeta p={p} />
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <StatBlock p={p} />
        <ScoreBreakdown p={p} />
      </div>

      {footer}
    </article>
  );
}
