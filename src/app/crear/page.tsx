"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { api, setHostToken } from "@/lib/client";
import type { Category } from "@/lib/types";
import { DexShell, Screen } from "@/components/Dex";
import { Alert, Spinner } from "@/components/ui";
import {
  ArrowRightIcon, CategoryIcon, CheckIcon, ChevronDownIcon, ChevronUpIcon, CloseIcon, SearchIcon, SwordsIcon,
} from "@/components/icons";
import { fold } from "@/lib/format";

const MAX = 20;
const TEAM_SIZE = 6;

/** Arranque razonable para una partida de clase. */
const SUGERIDAS = [
  "inicial", "legendario", "mitico", "gen-i", "trio-aves",
  "pseudolegendario", "mega", "favorito-absoluto",
];

/** Orden en que se muestran los grupos del catálogo. */
const GROUP_ORDER = ["General", "Clásicas", "Iniciales", "Tríos y grupos", "Especiales", "Perfil", "Generaciones", "Tipos"];

const GEN_ORDER = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix"];

/** Generaciones por número (el orden alfabético pone la IX antes que la V); el resto, por nombre. */
function byCategory(a: Category, b: Category) {
  const ga = GEN_ORDER.indexOf(a.slug.replace(/^gen-/, ""));
  const gb = GEN_ORDER.indexOf(b.slug.replace(/^gen-/, ""));
  if (a.slug.startsWith("gen-") && b.slug.startsWith("gen-")) return ga - gb;
  return a.name.localeCompare(b.name, "es");
}

export default function CrearSala() {
  const router = useRouter();
  const [cats, setCats] = useState<Category[] | null>(null);
  const [chosen, setChosen] = useState<string[]>(SUGERIDAS);
  const [hostName, setHostName] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.categories().then((r) => setCats(r.categories)).catch((e) => setError(e.message));
  }, []);

  const groups = useMemo(() => {
    const q = fold(query.trim());
    const map = new Map<string, Category[]>();
    for (const c of cats ?? []) {
      if (q && !fold(c.name).includes(q) && !fold(c.description).includes(q)) continue;
      if (!map.has(c.grp)) map.set(c.grp, []);
      map.get(c.grp)!.push(c);
    }
    const rank = (g: string) => (GROUP_ORDER.indexOf(g) + 1 || 99);
    for (const list of map.values()) list.sort(byCategory);
    return [...map.entries()].sort((a, b) => rank(a[0]) - rank(b[0]));
  }, [cats, query]);

  // El orden de `chosen` es el orden en que se jugarán las categorías.
  function toggle(slug: string) {
    setChosen((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : prev.length >= MAX ? prev : [...prev, slug],
    );
  }

  function move(slug: string, delta: number) {
    setChosen((prev) => {
      const i = prev.indexOf(slug);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  async function create() {
    setError(null);
    setBusy(true);
    try {
      const res = await api.createRoom({ hostName: hostName.trim() || "Anfitrión", categories: chosen });
      setHostToken(res.code, res.hostToken);
      router.push(`/host/${res.code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear la sala.");
      setBusy(false);
    }
  }

  const bySlug = new Map((cats ?? []).map((c) => [c.slug, c]));

  return (
    <main>
      <DexShell title="Armar la partida" subtitle={`${chosen.length} de ${MAX} categorías`} back="/" wide>
        {error && <Alert>{error}</Alert>}

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_21rem]">
          {/* Catálogo */}
          <Screen>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <p className="eyebrow min-w-40 flex-1">Catálogo · {cats?.length ?? 0} categorías</p>
              <label className="relative w-full sm:w-64">
                <SearchIcon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-screen-300" />
                <input
                  className="field py-2 pl-9"
                  placeholder="Buscar categoría…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Buscar categoría"
                />
              </label>
            </div>

            {!cats ? (
              <Spinner label="Cargando categorías…" />
            ) : groups.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-400">Ninguna categoría coincide con “{query}”.</p>
            ) : (
              <div className="grid gap-6">
                {groups.map(([grp, list]) => (
                  <section key={grp} className="grid gap-2">
                    <h2 className="font-display text-sm font-semibold text-ink-300">{grp}</h2>
                    <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(min(100%,16rem),1fr))]">
                      {list.map((c) => {
                        const on = chosen.includes(c.slug);
                        return (
                          <button
                            key={c.slug}
                            type="button"
                            onClick={() => toggle(c.slug)}
                            disabled={!on && chosen.length >= MAX}
                            aria-pressed={on}
                            className={`flex min-w-0 items-start gap-3 rounded-xl border p-3 text-left transition disabled:opacity-40
                              ${on ? "border-volt-500 bg-volt-500/10" : "border-white/10 bg-white/[0.03] hover:border-white/25"}`}
                          >
                            <span
                              className={`flex size-9 shrink-0 items-center justify-center rounded-lg
                                ${on ? "bg-volt-500 text-ink-950" : "bg-white/10 text-volt-400"}`}
                            >
                              {on ? <CheckIcon size={18} strokeWidth={3} /> : <CategoryIcon slug={c.slug} size={18} />}
                            </span>
                            <span className="grid min-w-0 flex-1 gap-1">
                              <span className="flex items-start justify-between gap-2">
                                <span className="min-w-0 text-sm font-bold leading-snug text-ink-100 [overflow-wrap:anywhere]">
                                  {c.name}
                                </span>
                                <span
                                  className="shrink-0 rounded bg-black/30 px-1.5 py-0.5 text-[10px] font-bold text-ink-300 tabular-nums"
                                  title="Pokémon disponibles"
                                >
                                  {c.pool_size}
                                </span>
                              </span>
                              <span className="text-xs leading-snug text-ink-400 [overflow-wrap:anywhere]">
                                {c.description}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </Screen>

          {/* Panel lateral */}
          <aside className="grid gap-4 lg:sticky lg:top-4">
            <Screen>
              <label className="grid gap-1.5 text-sm">
                <span className="eyebrow">Anfitrión</span>
                <input
                  className="field"
                  placeholder="Tu nombre"
                  maxLength={20}
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                />
              </label>
              <div className="panel mt-3 flex gap-2.5 p-3 text-xs leading-relaxed text-ink-300">
                <SwordsIcon size={18} className="mt-0.5 shrink-0 text-volt-400" />
                <p className="min-w-0">
                  {chosen.length <= TEAM_SIZE
                    ? `Con ${chosen.length} categorías, cada duelo enfrenta los ${chosen.length} Pokémon completos de ambos entrenadores.`
                    : `Con ${chosen.length} categorías, en cada duelo se sortean ${TEAM_SIZE} Pokémon de cada entrenador, distintos para cada uno.`}
                </p>
              </div>
            </Screen>

            <Screen>
              <p className="eyebrow mb-2">Orden de juego</p>
              {chosen.length === 0 ? (
                <p className="py-4 text-center text-sm text-ink-400">Elige categorías del catálogo.</p>
              ) : (
                <ol className="grid max-h-[22rem] gap-1.5 overflow-y-auto pr-1">
                  {chosen.map((slug, i) => {
                    const c = bySlug.get(slug);
                    if (!c) return null;
                    return (
                      <li key={slug} className="panel flex min-w-0 items-center gap-1.5 py-1.5 pl-2 pr-1">
                        <span className="w-5 shrink-0 text-right font-display text-xs font-bold text-screen-300 tabular-nums">
                          {i + 1}
                        </span>
                        <CategoryIcon slug={slug} size={15} className="shrink-0 text-volt-400" />
                        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-ink-100" title={c.name}>
                          {c.name}
                        </span>
                        <span className="flex shrink-0">
                          <button
                            className="rounded p-1 text-ink-400 hover:bg-white/10 hover:text-ink-100 disabled:opacity-30"
                            onClick={() => move(slug, -1)} disabled={i === 0} aria-label={`Subir ${c.name}`}
                          ><ChevronUpIcon size={15} /></button>
                          <button
                            className="rounded p-1 text-ink-400 hover:bg-white/10 hover:text-ink-100 disabled:opacity-30"
                            onClick={() => move(slug, 1)} disabled={i === chosen.length - 1} aria-label={`Bajar ${c.name}`}
                          ><ChevronDownIcon size={15} /></button>
                          <button
                            className="rounded p-1 text-flare-400 hover:bg-flare-500/15"
                            onClick={() => toggle(slug)} aria-label={`Quitar ${c.name}`}
                          ><CloseIcon size={15} /></button>
                        </span>
                      </li>
                    );
                  })}
                </ol>
              )}
            </Screen>

            <button
              className="btn btn-primary sticky bottom-3 z-20 w-full shadow-lg shadow-black/50 lg:static"
              onClick={create}
              disabled={busy || chosen.length < 2}
            >
              {busy ? "Creando…" : chosen.length < 2
                ? "Elige al menos 2 categorías"
                : <>Crear sala con {chosen.length} categorías <ArrowRightIcon size={18} /></>}
            </button>
          </aside>
        </div>
      </DexShell>
    </main>
  );
}
