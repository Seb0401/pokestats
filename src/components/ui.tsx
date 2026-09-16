import type { Pokemon } from "@/lib/types";
import { GEN_ES, PROFILE_ES, TYPE_ES, condition, pct, score, typeClass } from "@/lib/format";

export function TypeBadge({ type }: { type: string }) {
  return (
    <span
      className={`${typeClass(type)} inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide`}
      style={{ background: "color-mix(in srgb, var(--type) 26%, transparent)", color: "color-mix(in srgb, var(--type) 70%, white)" }}
    >
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
  return (
    <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${c.tone}`}>
      {c.label}
    </span>
  );
}

export function ScorePill({ value, size = "md" }: { value: number; size?: "sm" | "md" | "lg" }) {
  const cls = { sm: "text-xs px-2 py-0.5", md: "text-sm px-2.5 py-1", lg: "text-2xl px-4 py-1.5" }[size];
  return (
    <span className={`inline-flex items-center gap-1 rounded-lg bg-volt-500/15 font-bold text-volt-400 tabular-nums ${cls}`}>
      {score(value)}
    </span>
  );
}

function StatRow({ label, value, max = 190 }: { label: string; value: number; max?: number }) {
  return (
    <div className="grid grid-cols-[2.6rem_2.2rem_1fr] items-center gap-2">
      <span className="text-[11px] uppercase text-ink-400">{label}</span>
      <span className="text-right text-xs font-semibold tabular-nums text-ink-200">{value}</span>
      <span className="statbar">
        <i style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
      </span>
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
      <div className="mt-1 flex items-center justify-between border-t border-ink-700 pt-1.5 text-xs">
        <span className="uppercase text-ink-400">Total</span>
        <span className="font-bold tabular-nums text-ink-200">{p.total_stats}</span>
      </div>
    </div>
  );
}

/**
 * Desglose del puntaje competitivo. Es la parte que conecta el juego con el
 * informe: deja ver por que gano el Pokemon que gano.
 */
export function ScoreBreakdown({ p }: { p: Pokemon }) {
  const usage = Number(p.usage_score);
  const stats = Number(p.stat_score);
  const elig = Number(p.eligibility);
  const rows = [
    { k: "Uso VGC 2024", v: usage, w: "55%", note: p.usage_estimated ? "estimado" : pct(p.usage_2024, 2) },
    { k: "Stats base", v: stats, w: "45%", note: `BST ${p.total_stats}` },
  ];

  return (
    <div className="grid gap-2 text-xs">
      {rows.map((r) => (
        <div key={r.k} className="grid gap-1">
          <div className="flex items-baseline justify-between">
            <span className="text-ink-300">
              {r.k} <span className="text-ink-400">({r.w})</span>
            </span>
            <span className="tabular-nums text-ink-200">
              {score(r.v)} <span className="text-ink-400">· {r.note}</span>
            </span>
          </div>
          <span className="statbar">
            <i style={{ width: `${Math.min(100, r.v)}%` }} />
          </span>
        </div>
      ))}
      {elig < 1 && (
        <p className="rounded-lg border border-flare-500/30 bg-flare-500/10 px-2 py-1.5 text-[11px] text-flare-400">
          Penalización reglamentaria ×{elig}: el reglamento VGC excluye a los míticos,
          y en el informe registran 0.0 % de uso.
        </p>
      )}
      {p.usage_estimated && (
        <p className="rounded-lg border border-aqua-500/30 bg-aqua-500/10 px-2 py-1.5 text-[11px] text-aqua-400">
          Forma no elegible en VGC 2024: su uso no está medido, se estimó con el
          modelo BST → uso ajustado sobre las especies elegibles de la base.
        </p>
      )}
      <div className="flex items-center justify-between border-t border-ink-700 pt-2">
        <span className="text-ink-400">Puntaje final</span>
        <ScorePill value={Number(p.battle_score)} />
      </div>
    </div>
  );
}

export function PokemonMeta({ p }: { p: Pokemon }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-400">
      <span>Gen {GEN_ES[p.generation] ?? "?"}</span>
      <span>#{String(p.dex).padStart(4, "0")}</span>
      <span>{PROFILE_ES[p.profile]}</span>
      <span>Ranking #{p.rank}</span>
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-ink-400">
      <span className="size-4 animate-spin rounded-full border-2 border-ink-600 border-t-volt-500" />
      {label}
    </div>
  );
}

export function Alert({ children, tone = "error" }: { children: React.ReactNode; tone?: "error" | "info" }) {
  const cls = tone === "error"
    ? "border-flare-500/40 bg-flare-500/10 text-flare-400"
    : "border-aqua-500/40 bg-aqua-500/10 text-aqua-400";
  return <div className={`rounded-xl border px-3 py-2 text-sm ${cls}`}>{children}</div>;
}
