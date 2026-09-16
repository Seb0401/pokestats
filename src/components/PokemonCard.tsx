"use client";

import { iconUrl, spriteUrl, typeClass } from "@/lib/format";
import type { Pokemon } from "@/lib/types";
import { hasScore } from "@/lib/types";
import { CheckIcon } from "./icons";
import { ConditionBadge, PokemonMeta, ScoreBreakdown, StatBlock, Types } from "./ui";

/** Ficha compacta para la rejilla de selección. */
export function PokemonTile({
  p, selected, onSelect,
}: {
  p: Pokemon;
  selected?: boolean;
  onSelect?: (p: Pokemon) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect?.(p)}
      aria-pressed={selected}
      className={`${typeClass(p.type1)} group relative flex flex-col items-center gap-1 rounded-xl border p-2 pt-3 text-center transition
        ${selected
          ? "border-volt-500 bg-volt-500/15 shadow-[0_0_0_3px_rgba(255,203,5,0.25)]"
          : "border-white/10 bg-white/[0.03] hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.07]"}`}
    >
      {/* Franja del color del tipo */}
      <span
        className="absolute inset-x-3 top-0 h-1 rounded-b-full"
        style={{ background: "var(--type)" }}
        aria-hidden
      />
      <span className="absolute left-2 top-1.5 text-[9px] font-bold text-ink-400 tabular-nums">
        {String(p.dex).padStart(4, "0")}
      </span>
      {selected && (
        <span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-volt-500 text-ink-950">
          <CheckIcon size={12} strokeWidth={3} />
        </span>
      )}
      <img
        src={iconUrl(p)}
        alt=""
        loading="lazy"
        width={72}
        height={72}
        className="size-16 object-contain [image-rendering:pixelated] transition group-hover:scale-110"
      />
      <span className="line-clamp-2 text-[11px] font-bold leading-tight text-ink-100">{p.name}</span>
      <Types p={p} />
    </button>
  );
}

/** Ficha grande de la Pokédex. */
export function PokemonCard({ p, footer }: { p: Pokemon; footer?: React.ReactNode }) {
  const scored = hasScore(p);
  return (
    <article className={`${typeClass(p.type1)} panel relative overflow-hidden p-4`}>
      <div
        className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full opacity-25 blur-2xl"
        style={{ background: "var(--type)" }}
        aria-hidden
      />
      <div className="relative flex items-start gap-4">
        <div className="relative shrink-0">
          <div className="absolute inset-2 rounded-full bg-white/5" aria-hidden />
          <img
            src={spriteUrl(p)}
            alt={p.name}
            loading="lazy"
            width={112}
            height={112}
            className="float relative size-24 object-contain drop-shadow-[0_10px_12px_rgba(0,0,0,0.5)]"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="font-display text-xl font-bold text-ink-100">{p.name}</h3>
            <ConditionBadge p={p} />
          </div>
          <div className="mt-1.5"><Types p={p} /></div>
          <div className="mt-2"><PokemonMeta p={p} /></div>
        </div>
      </div>

      <div className={`relative mt-4 grid gap-4 ${scored ? "sm:grid-cols-2" : ""}`}>
        <StatBlock p={p} />
        {scored && <ScoreBreakdown p={p} />}
      </div>
      {footer}
    </article>
  );
}
