"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client";
import { TYPE_ES, fold } from "@/lib/format";
import type { Category, Pokemon } from "@/lib/types";
import { PokemonTile } from "./PokemonCard";
import { Alert, Spinner } from "./ui";

const PAGE = 120;

export function PokemonPicker({
  category, current, onPick, disabled,
}: {
  category: Category;
  current: string | null;
  onPick: (p: Pokemon) => void | Promise<void>;
  disabled?: boolean;
}) {
  const [pool, setPool] = useState<Pokemon[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setPool(null);
    setError(null);
    setQuery("");
    setLimit(PAGE);
    api.pool(category.slug)
      .then((r) => { if (alive) setPool(r.pokemon); })
      .catch((e) => { if (alive) setError(e.message); });
    return () => { alive = false; };
  }, [category.slug]);

  const results = useMemo(() => {
    if (!pool) return [];
    const q = fold(query.trim());
    if (!q) return pool;
    return pool.filter((p) =>
      fold(p.name).includes(q) ||
      fold(p.slug).includes(q) ||
      String(p.dex) === q ||
      fold(TYPE_ES[p.type1] ?? "").startsWith(q) ||
      (p.type2 ? fold(TYPE_ES[p.type2] ?? "").startsWith(q) : false),
    );
  }, [pool, query]);

  async function choose(p: Pokemon) {
    if (disabled || saving) return;
    setSaving(p.slug);
    try {
      await onPick(p);
    } finally {
      setSaving(null);
    }
  }

  if (error) return <Alert>{error}</Alert>;
  if (!pool) return <Spinner label="Cargando candidatos…" />;

  const visible = results.slice(0, limit);

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="field flex-1 min-w-48"
          placeholder={`Buscar entre ${pool.length} candidatos…`}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setLimit(PAGE); }}
          disabled={disabled}
        />
        <span className="text-xs text-ink-400 tabular-nums">
          {results.length} resultado{results.length === 1 ? "" : "s"}
        </span>
      </div>

      {results.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-400">
          Ningún Pokémon de esta categoría coincide con “{query}”.
        </p>
      ) : (
        <>
          <div className="grid max-h-[26rem] grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {visible.map((p) => (
              <PokemonTile
                key={p.slug}
                p={p}
                selected={current === p.slug || saving === p.slug}
                onSelect={disabled ? undefined : choose}
              />
            ))}
          </div>
          {limit < results.length && (
            <button
              type="button"
              className="btn btn-ghost w-full"
              onClick={() => setLimit((l) => l + PAGE)}
            >
              Ver {Math.min(PAGE, results.length - limit)} más
            </button>
          )}
        </>
      )}
    </div>
  );
}
