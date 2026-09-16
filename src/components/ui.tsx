import type { Category, Pokemon } from "@/lib/types";
import { hasScore } from "@/lib/types";
import { GEN_ES, PROFILE_ES, TYPE_ES, condition, pct, score, typeClass } from "@/lib/format";
import { BallMark, BotIcon, CategoryIcon, DiceIcon, SparkleIcon, TypeIcon } from "./icons";

export function TypeBadge({ type }: { type: string }) {
  return (
    <span
      className={`${typeClass(type)} chip`}
      style={{
        background: "color-mix(in srgb, var(--type) 24%, transparent)",
        color: "color-mix(in srgb, var(--type) 55%, white)",
        boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--type) 45%, transparent)",
      }}
    >
      <TypeIcon type={type} size={11} strokeWidth={2.6} />
      {TYPE_ES[type] ?? type}
    </span>
  );
}

export function Types({ p }: { p: Pokemon }) {
  return (
    <div className="flex flex-wrap gap-1">
      <TypeBadge type={p.type1} />
      {p.type2 && <TypeBadge type={p.type2} />}
    </div>
  );
}

export function ConditionBadge({ p }: { p: Pokemon }) {
  const c = condition(p);
  if (!c) return null;
  return <span className={`chip border ${c.tone}`}>{c.label}</span>;
}

export function CategoryBadge({ category, size = "md" }: { category: Category; size?: "sm" | "md" }) {
  const small = size === "sm";
  return (
    <span className={`inline-flex min-w-0 items-center gap-1.5 ${small ? "text-xs" : "text-sm"}`}>
      <span
        className={`flex shrink-0 items-center justify-center rounded-md bg-volt-500/15 text-volt-400 ${small ? "size-5" : "size-7"}`}
      >
        <CategoryIcon slug={category.slug} size={small ? 12 : 16} />
      </span>
      <span className="truncate font-semibold">{category.name}</span>
    </span>
  );
}

export function BotTag() {
  return (
    <span className="chip bg-lens-500/15 text-lens-300" title="Bot de relleno: elige al azar">
      <BotIcon size={11} strokeWidth={2.4} /> Bot
    </span>
  );
}

export function RandomTag() {
  return (
    <span className="chip bg-ink-100/10 text-ink-300" title="No eligió a tiempo: se sorteó de la categoría">
      <DiceIcon size={11} strokeWidth={2.4} /> Sorteado
    </span>
  );
}

/** Solo se renderiza para el anfitrión: los jugadores nunca reciben puntajes. */
export function ScorePill({ value, size = "md" }: { value: number; size?: "sm" | "md" | "lg" }) {
  const cls = { sm: "text-xs px-2 py-0.5", md: "text-sm px-2.5 py-1", lg: "text-2xl px-4 py-1.5" }[size];
  return (
    <span className={`inline-flex items-center gap-1 rounded-lg bg-volt-500/15 font-display font-bold text-volt-400 tabular-nums ${cls}`}>
      {score(value)}
    </span>
  );
}

function StatRow({ label, value, max = 200 }: { label: string; value: number; max?: number }) {
  return (
    <div className="grid grid-cols-[2.6rem_2.2rem_1fr] items-center gap-2">
      <span className="text-[11px] font-bold uppercase text-screen-300/80">{label}</span>
      <span className="text-right text-xs font-bold tabular-nums text-ink-100">{value}</span>
      <span className="statbar"><i style={{ width: `${Math.min(100, (value / max) * 100)}%` }} /></span>
    </div>
  );
}

export function StatBlock({ p }: { p: Pokemon }) {
  return (
    <div className="grid gap-1.5">
      <StatRow label="PS" value={p.hp} />
      <StatRow label="Atq" value={p.attack} />
      <StatRow label="Def" value={p.defense} />
      <StatRow label="AtEs" value={p.sp_atk} />
      <StatRow label="DfEs" value={p.sp_def} />
      <StatRow label="Vel" value={p.speed} />
      <div className="mt-1 flex items-center justify-between border-t border-white/10 pt-1.5 text-xs">
        <span className="font-bold uppercase text-screen-300/80">Total</span>
        <span className="font-bold tabular-nums text-ink-100">{p.total_stats}</span>
      </div>
    </div>
  );
}

/** Desglose del puntaje. Devuelve null si el Pokémon llega sin puntaje (jugadores). */
export function ScoreBreakdown({ p }: { p: Pokemon }) {
  if (!hasScore(p)) return null;
  const rows = [
    { k: "Uso VGC 2024", v: Number(p.usage_score), w: "55%", note: p.usage_estimated ? "estimado" : pct(p.usage_2024, 2) },
    { k: "Stats base", v: Number(p.stat_score), w: "45%", note: `BST ${p.total_stats}` },
  ];
  const elig = Number(p.eligibility);

  return (
    <div className="grid gap-2 text-xs">
      {rows.map((r) => (
        <div key={r.k} className="grid gap-1">
          <div className="flex items-baseline justify-between">
            <span className="text-ink-300">{r.k} <span className="text-ink-400">({r.w})</span></span>
            <span className="tabular-nums text-ink-200">{score(r.v)} <span className="text-ink-400">· {r.note}</span></span>
          </div>
          <span className="statbar"><i style={{ width: `${Math.min(100, r.v)}%` }} /></span>
        </div>
      ))}
      {elig < 1 && (
        <p className="rounded-lg border border-flare-500/30 bg-flare-500/10 px-2 py-1.5 text-[11px] text-flare-400">
          Penalización reglamentaria ×{elig}: el reglamento VGC excluye a los míticos.
        </p>
      )}
      {p.usage_estimated && (
        <p className="rounded-lg border border-aqua-500/30 bg-aqua-500/10 px-2 py-1.5 text-[11px] text-aqua-400">
          Forma no elegible en VGC 2024: uso estimado con el modelo BST → uso.
        </p>
      )}
      <div className="flex items-center justify-between border-t border-white/10 pt-2">
        <span className="text-ink-400">Puntaje · ranking #{p.rank}</span>
        <ScorePill value={Number(p.battle_score)} />
      </div>
    </div>
  );
}

export function PokemonMeta({ p }: { p: Pokemon }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold text-ink-400">
      <span>N.º {String(p.dex).padStart(4, "0")}</span>
      <span>Gen {GEN_ES[p.generation] ?? "?"}</span>
      <span>{PROFILE_ES[p.profile]}</span>
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-2 text-sm font-semibold text-ink-300">
      <span className="shake inline-block"><BallMark size={26} /></span>
      {label}
    </div>
  );
}

export function Alert({ children, tone = "error" }: { children: React.ReactNode; tone?: "error" | "info" }) {
  const cls = tone === "error"
    ? "border-flare-500/40 bg-flare-500/10 text-flare-400"
    : "border-screen-300/30 bg-screen-300/10 text-screen-300";
  return (
    <div className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${cls}`}>
      <SparkleIcon size={16} className="mt-0.5 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
