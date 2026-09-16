"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { api, setHostToken } from "@/lib/client";
import type { Category } from "@/lib/types";
import { DexShell, Screen } from "@/components/Dex";
import { Alert, Spinner } from "@/components/ui";
import {
  ArrowRightIcon, CategoryIcon, CheckIcon, ChevronDownIcon, ChevronUpIcon, CloseIcon, SwordsIcon,
} from "@/components/icons";

const MAX = 20;
const TEAM_SIZE = 6;

/** Arranque razonable para una partida de clase. */
const SUGERIDAS = [
  "inicial", "legendario", "mitico", "gen-i", "trio-aves",
  "pseudolegendario", "mega", "favorito-absoluto",
];

export default function CrearSala() {
  const router = useRouter();
  const [cats, setCats] = useState<Category[] | null>(null);
  const [chosen, setChosen] = useState<string[]>(SUGERIDAS);
  const [hostName, setHostName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.categories().then((r) => setCats(r.categories)).catch((e) => setError(e.message));
  }, []);

  const groups = useMemo(() => {
    const map = new Map<string, Category[]>();
    for (const c of cats ?? []) {
      if (!map.has(c.grp)) map.set(c.grp, []);
      map.get(c.grp)!.push(c);
    }
    return [...map.entries()];
  }, [cats]);

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
      <DexShell
        title="Armar la partida"
        subtitle={`${chosen.length} de ${MAX} categorías`}
        back="/"
      >
        {error && <Alert>{error}</Alert>}

        <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
          <div className="grid content-start gap-4">
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
              <div className="panel mt-3 flex gap-3 p-3 text-xs leading-relaxed text-ink-300">
                <SwordsIcon size={20} className="mt-0.5 shrink-0 text-volt-400" />
                <p>
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
                <ol className="grid gap-1.5">
                  {chosen.map((slug, i) => {
                    const c = bySlug.get(slug);
                    if (!c) return null;
                    return (
                      <li key={slug} className="panel flex items-center gap-2 px-2.5 py-1.5">
                        <span className="w-5 text-right font-display text-xs font-bold text-screen-300 tabular-nums">{i + 1}</span>
                        <CategoryIcon slug={slug} size={16} className="shrink-0 text-volt-400" />
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink-100">{c.name}</span>
                        <button
                          className="rounded p-1 text-ink-400 hover:bg-white/10 hover:text-ink-100 disabled:opacity-30"
                          onClick={() => move(slug, -1)} disabled={i === 0} aria-label="Subir"
                        ><ChevronUpIcon size={16} /></button>
                        <button
                          className="rounded p-1 text-ink-400 hover:bg-white/10 hover:text-ink-100 disabled:opacity-30"
                          onClick={() => move(slug, 1)} disabled={i === chosen.length - 1} aria-label="Bajar"
                        ><ChevronDownIcon size={16} /></button>
                        <button
                          className="rounded p-1 text-flare-400 hover:bg-flare-500/15"
                          onClick={() => toggle(slug)} aria-label="Quitar"
                        ><CloseIcon size={16} /></button>
                      </li>
                    );
                  })}
                </ol>
              )}
            </Screen>
          </div>

          <Screen>
            <p className="eyebrow mb-3">Catálogo de categorías</p>
            {!cats ? (
              <Spinner label="Cargando categorías…" />
            ) : (
              <div className="grid max-h-[40rem] gap-5 overflow-y-auto pr-1">
                {groups.map(([grp, list]) => (
                  <section key={grp} className="grid gap-2">
                    <h2 className="font-display text-sm font-semibold text-ink-300">{grp}</h2>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {list.map((c) => {
                        const on = chosen.includes(c.slug);
                        return (
                          <button
                            key={c.slug}
                            type="button"
                            onClick={() => toggle(c.slug)}
                            disabled={!on && chosen.length >= MAX}
                            aria-pressed={on}
                            className={`relative grid gap-1 rounded-xl border p-3 text-left transition disabled:opacity-40
                              ${on ? "border-volt-500 bg-volt-500/10" : "border-white/10 bg-white/[0.03] hover:border-white/25"}`}
                          >
                            <span className="flex items-center gap-2">
                              <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${on ? "bg-volt-500 text-ink-950" : "bg-white/10 text-volt-400"}`}>
                                {on ? <CheckIcon size={16} strokeWidth={3} /> : <CategoryIcon slug={c.slug} size={16} />}
                              </span>
                              <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink-100">{c.name}</span>
                              <span className="text-[11px] font-bold text-ink-400 tabular-nums">{c.pool_size}</span>
                            </span>
                            <span className="text-xs leading-snug text-ink-400">{c.description}</span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </Screen>
        </div>

        <div className="sticky bottom-3 z-20">
          <button
            className="btn btn-primary w-full text-base shadow-lg shadow-black/50"
            onClick={create}
            disabled={busy || chosen.length < 2}
          >
            {busy ? "Creando…" : chosen.length < 2
              ? "Elige al menos 2 categorías"
              : <>Crear sala con {chosen.length} categorías <ArrowRightIcon size={18} /></>}
          </button>
        </div>
      </DexShell>
    </main>
  );
}
