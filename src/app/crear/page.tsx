"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { api, setHostToken } from "@/lib/client";
import type { Category } from "@/lib/types";
import { Alert, Spinner } from "@/components/ui";

const MAX = 20;

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
  const [battleRounds, setBattleRounds] = useState(3);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.categories()
      .then((r) => setCats(r.categories))
      .catch((e) => setError(e.message));
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
      prev.includes(slug)
        ? prev.filter((s) => s !== slug)
        : prev.length >= MAX ? prev : [...prev, slug],
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
      const res = await api.createRoom({
        hostName: hostName.trim() || "Anfitrión",
        categories: chosen,
        battleRounds: Math.min(battleRounds, chosen.length),
      });
      setHostToken(res.code, res.hostToken);
      router.push(`/host/${res.code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear la sala.");
      setBusy(false);
    }
  }

  const bySlug = new Map((cats ?? []).map((c) => [c.slug, c]));

  return (
    <main className="mx-auto grid max-w-5xl gap-6 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/" className="text-xs text-ink-400 hover:text-ink-200">← Inicio</Link>
          <h1 className="text-2xl font-bold text-ink-200">Armar la partida</h1>
        </div>
        <span className="text-sm text-ink-400 tabular-nums">
          {chosen.length} / {MAX} categorías
        </span>
      </header>

      {error && <Alert>{error}</Alert>}

      <section className="card grid gap-4 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm">
            <span className="text-ink-300">Tu nombre como anfitrión</span>
            <input
              className="field"
              placeholder="Anfitrión"
              maxLength={20}
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="text-ink-300">
              Categorías que irán a la batalla final:{" "}
              <strong className="text-volt-400">{Math.min(battleRounds, chosen.length || 1)}</strong>
            </span>
            <input
              type="range"
              min={1}
              max={Math.max(1, Math.min(10, chosen.length))}
              value={Math.min(battleRounds, Math.max(1, chosen.length))}
              onChange={(e) => setBattleRounds(Number(e.target.value))}
              className="mt-2 accent-[var(--color-volt-500)]"
            />
            <span className="text-xs text-ink-400">
              Se sortean al azar entre las categorías ya jugadas.
            </span>
          </label>
        </div>
      </section>

      {chosen.length > 0 && (
        <section className="card grid gap-2 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-400">
            Orden de juego
          </h2>
          <ol className="grid gap-1.5">
            {chosen.map((slug, i) => {
              const c = bySlug.get(slug);
              if (!c) return null;
              return (
                <li key={slug} className="flex items-center gap-2 rounded-xl border border-ink-800 bg-white/[0.02] px-3 py-1.5">
                  <span className="w-5 text-xs text-ink-400 tabular-nums">{i + 1}.</span>
                  <span aria-hidden>{c.emoji}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-ink-200">{c.name}</span>
                  <span className="text-xs text-ink-400 tabular-nums">{c.pool_size}</span>
                  <button
                    className="rounded px-1.5 text-ink-400 hover:bg-ink-800 hover:text-ink-200 disabled:opacity-30"
                    onClick={() => move(slug, -1)}
                    disabled={i === 0}
                    aria-label="Subir"
                  >↑</button>
                  <button
                    className="rounded px-1.5 text-ink-400 hover:bg-ink-800 hover:text-ink-200 disabled:opacity-30"
                    onClick={() => move(slug, 1)}
                    disabled={i === chosen.length - 1}
                    aria-label="Bajar"
                  >↓</button>
                  <button
                    className="rounded px-1.5 text-flare-400 hover:bg-flare-500/15"
                    onClick={() => toggle(slug)}
                    aria-label="Quitar"
                  >×</button>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {!cats ? (
        <Spinner label="Cargando categorías…" />
      ) : (
        <div className="grid gap-5">
          {groups.map(([grp, list]) => (
            <section key={grp} className="grid gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-400">{grp}</h2>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((c) => {
                  const on = chosen.includes(c.slug);
                  const full = !on && chosen.length >= MAX;
                  return (
                    <button
                      key={c.slug}
                      type="button"
                      onClick={() => toggle(c.slug)}
                      disabled={full}
                      className={`card grid gap-1 p-3 text-left transition disabled:opacity-40
                        ${on ? "border-volt-500 bg-volt-500/10" : "hover:border-ink-600"}`}
                    >
                      <span className="flex items-center gap-2 font-semibold text-ink-200">
                        <span aria-hidden>{c.emoji}</span>
                        <span className="min-w-0 flex-1 truncate text-sm">{c.name}</span>
                        <span className="text-xs text-ink-400 tabular-nums">{c.pool_size}</span>
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

      <div className="sticky bottom-4 z-20">
        <button
          className="btn btn-primary w-full shadow-lg shadow-black/50"
          onClick={create}
          disabled={busy || chosen.length < 2}
        >
          {busy
            ? "Creando…"
            : chosen.length < 2
              ? "Elige al menos 2 categorías"
              : `Crear sala con ${chosen.length} categorías`}
        </button>
      </div>
    </main>
  );
}
