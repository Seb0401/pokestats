"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { api, setPlayerToken } from "@/lib/client";
import { Alert } from "@/components/ui";

export default function Home() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const clean = code.replace(/\D/g, "");
      const res = await api.join(clean, nickname);
      setPlayerToken(clean, res.playerToken);
      router.push(`/play/${clean}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo entrar.");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto grid max-w-5xl gap-10 px-4 py-10 sm:py-16">
      <header className="grid gap-3 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-volt-500">
          Estadística Aplicada · Universidad La Salle
        </p>
        <h1 className="text-4xl font-black text-ink-200 sm:text-5xl">
          Poké<span className="text-volt-500">Stats</span>
        </h1>
        <p className="mx-auto max-w-2xl text-balance text-ink-300">
          Llena tu cuadro de favoritos categoría por categoría, a ritmo del anfitrión.
          Al final se sortea qué categorías van a la batalla y gana quien haya elegido
          al Pokémon más efectivo del VGC 2024.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <form onSubmit={join} className="card grid content-start gap-3 p-5">
          <h2 className="text-lg font-bold text-ink-200">Entrar a una sala</h2>
          <p className="text-sm text-ink-400">
            Pide el código de 6 dígitos a quien dirige la partida.
          </p>
          <input
            className="field text-center font-display text-3xl tracking-[0.35em] tabular-nums"
            inputMode="numeric"
            autoComplete="off"
            placeholder="000000"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          />
          <input
            className="field"
            placeholder="Tu apodo"
            maxLength={20}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
          {error && <Alert>{error}</Alert>}
          <button
            className="btn btn-primary"
            disabled={busy || code.length !== 6 || !nickname.trim()}
          >
            {busy ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <section className="card grid content-start gap-3 p-5">
          <h2 className="text-lg font-bold text-ink-200">Dirigir una partida</h2>
          <p className="text-sm text-ink-400">
            Elige las categorías del cuadro, cuántas van al sorteo y controla cuándo
            se revela cada una.
          </p>
          <ul className="grid gap-1.5 text-sm text-ink-300">
            <li>· Hasta 20 categorías de un catálogo de 46</li>
            <li>· 1303 formas Pokémon, incluidas Megas y Gigamax</li>
            <li>· Puntaje basado en el uso real de VGC 2024</li>
          </ul>
          <Link href="/crear" className="btn btn-ghost mt-auto">
            Crear sala
          </Link>
        </section>
      </div>

      <section className="card grid gap-3 p-5 text-sm text-ink-300">
        <h2 className="text-base font-bold text-ink-200">¿Cómo se decide quién gana?</h2>
        <p>
          Cada forma tiene un <strong className="text-ink-200">puntaje competitivo</strong> de 0 a 100
          calculado sobre la base <code className="text-volt-400">pokemon_competitive_analysis</code>:
          55 % viene del uso real en VGC 2024 (Smogon y Worlds, en escala logarítmica porque el
          62.3 % del catálogo no registra uso alguno) y 45 % del reparto de estadísticas base.
        </p>
        <p>
          El informe encontró que el poder total es el predictor más fuerte del uso
          (χ²(3) = 79.22, <em>p</em> &lt; .001, V de Cramér = .516) y que la condición de la especie
          lo condiciona de forma significativa (χ²(2) = 11.83, <em>p</em> = .003): los míticos
          registran 0.0 % de uso porque el reglamento los excluye, así que pagan una penalización.
          Las Megas y Gigamax no compiten en VGC 2024, de modo que su uso no se asume cero: se
          estima con el modelo BST → uso ajustado sobre las especies que sí son elegibles.
        </p>
        <p className="text-xs text-ink-400">
          Fuentes: PokéAPI y estadísticas de uso de Smogon VGC 2022-2024.
        </p>
      </section>
    </main>
  );
}
