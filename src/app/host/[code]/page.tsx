"use client";

import Link from "next/link";
import { use, useState } from "react";
import { api, getHostToken, useGameState } from "@/lib/client";
import type { GameState } from "@/lib/types";
import { BattleBoard } from "@/components/Battle";
import { Leaderboard, PickGrid } from "@/components/PickGrid";
import { Alert, Spinner } from "@/components/ui";

export default function HostPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const { state, error, refresh } = useGameState(code);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function act(action: string) {
    setActionError(null);
    setBusy(true);
    try {
      await api.host(code, action);
      await refresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "No se pudo ejecutar la acción.");
    } finally {
      setBusy(false);
    }
  }

  if (error) return <Shell code={code}><Alert>{error}</Alert></Shell>;
  if (!state) return <Shell code={code}><Spinner label="Cargando sala…" /></Shell>;

  if (!state.isHost) {
    return (
      <Shell code={code}>
        <Alert>
          Esta pantalla es del anfitrión y este navegador no tiene su credencial.
          {getHostToken(code)
            ? " La credencial guardada ya no es válida."
            : " Ábrela desde el mismo navegador en el que creaste la sala."}
        </Alert>
        <Link href={`/play/${code}`} className="btn btn-ghost">Entrar como jugador</Link>
      </Shell>
    );
  }

  return (
    <Shell code={code} state={state}>
      {actionError && <Alert>{actionError}</Alert>}
      <Controls state={state} busy={busy} act={act} />

      {state.battle && (
        <section className="grid gap-3">
          <h2 className="font-display text-xl font-bold text-ink-200">Batalla</h2>
          <BattleBoard state={state} />
        </section>
      )}

      {state.leaderboard.length > 0 && (
        <section className="grid gap-2">
          <h2 className="font-display text-xl font-bold text-ink-200">Tabla de posiciones</h2>
          <Leaderboard state={state} />
        </section>
      )}

      {state.room.phase !== "lobby" && (
        <section className="card grid gap-3 p-4">
          <h2 className="font-display text-lg font-bold text-ink-200">Cuadro de la partida</h2>
          <PickGrid
            state={state}
            highlight={state.battle?.map((b) => b.category.slug)}
          />
        </section>
      )}
    </Shell>
  );
}

// ---------------------------------------------------------------------------

function Controls({
  state, busy, act,
}: {
  state: GameState;
  busy: boolean;
  act: (a: string) => void;
}) {
  const { room, rounds, players } = state;
  const current = rounds[room.current_position];
  const allRevealed = rounds.every((r) => r.state === "revealed");
  const isLast = room.current_position === rounds.length - 1;

  if (room.phase === "lobby") {
    return (
      <section className="card grid gap-4 p-5">
        <div className="grid gap-1 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-ink-400">
            Código de sala
          </p>
          <p className="font-display text-6xl font-black tracking-[0.15em] text-volt-500 tabular-nums">
            {room.code}
          </p>
          <p className="text-sm text-ink-400">
            Los jugadores entran desde la pantalla de inicio con este código.
          </p>
        </div>

        <div className="grid gap-2">
          <p className="text-sm text-ink-300">
            {players.length === 0
              ? "Esperando jugadores…"
              : `${players.length} jugador${players.length === 1 ? "" : "es"} en la sala`}
          </p>
          <ul className="flex flex-wrap gap-2">
            {players.map((p) => (
              <li key={p.id} className="rise rounded-lg bg-ink-800 px-3 py-1.5 text-sm text-ink-200">
                {p.nickname}
              </li>
            ))}
          </ul>
        </div>

        <div className="grid gap-1.5 border-t border-ink-700 pt-3 text-sm text-ink-400">
          <p>
            {rounds.length} categorías · se sortearán{" "}
            <strong className="text-ink-200">{room.battle_rounds}</strong> para la batalla
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => act("start")}
          disabled={busy || players.length === 0}
        >
          Empezar partida
        </button>
      </section>
    );
  }

  if (room.phase === "picking") {
    return (
      <section className="card grid gap-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-400">
              Categoría {room.current_position + 1} de {rounds.length}
            </p>
            <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-ink-200">
              <span aria-hidden>{current?.category.emoji}</span>
              {current?.category.name}
            </h2>
            <p className="mt-1 max-w-xl text-sm text-ink-400">{current?.category.description}</p>
          </div>
          <div className="text-right">
            <p className="font-display text-3xl font-bold tabular-nums text-volt-500">
              {current?.picked_count ?? 0}
              <span className="text-lg text-ink-400">/{players.length}</span>
            </p>
            <p className="text-xs text-ink-400">ya eligieron</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            className="btn btn-ghost"
            onClick={() => act("reveal")}
            disabled={busy || current?.state === "revealed"}
          >
            {current?.state === "revealed" ? "Revelada" : "Revelar elecciones"}
          </button>

          {!allRevealed && (
            <button className="btn btn-primary" onClick={() => act("next")} disabled={busy}>
              {isLast ? "Cerrar última categoría" : "Siguiente categoría →"}
            </button>
          )}

          {allRevealed && (
            <button className="btn btn-primary" onClick={() => act("draw_battle")} disabled={busy}>
              🎲 Sortear {room.battle_rounds} categorías y pelear
            </button>
          )}
        </div>

        {allRevealed && (
          <p className="text-sm text-ink-400">
            Todas las categorías están cerradas. El sorteo elegirá {room.battle_rounds} al azar
            entre las {rounds.length} jugadas.
          </p>
        )}
      </section>
    );
  }

  if (room.phase === "battle") {
    const pending = (state.battle?.length ?? 0) - room.battle_revealed;
    return (
      <section className="card grid gap-3 p-5">
        <h2 className="font-display text-2xl font-bold text-ink-200">Fase de batalla</h2>
        <p className="text-sm text-ink-400">
          {room.battle_revealed} de {state.battle?.length ?? 0} rondas reveladas.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            className="btn btn-primary"
            onClick={() => act("reveal_battle")}
            disabled={busy || pending <= 0}
          >
            {pending > 0 ? "Revelar siguiente ronda" : "Todas reveladas"}
          </button>
          <button className="btn btn-ghost" onClick={() => act("finish")} disabled={busy}>
            Terminar partida
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="card grid gap-2 p-5 text-center">
      <h2 className="font-display text-2xl font-bold text-ink-200">Partida terminada</h2>
      <p className="text-sm text-ink-400">
        Ganó <strong className="text-volt-400">{state.leaderboard[0]?.nickname ?? "—"}</strong> con{" "}
        {state.leaderboard[0]?.total ?? 0} puntos.
      </p>
      <Link href="/crear" className="btn btn-ghost mx-auto mt-2">Crear otra partida</Link>
    </section>
  );
}

function Shell({
  code, state, children,
}: {
  code: string;
  state?: GameState;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto grid max-w-5xl gap-5 px-4 py-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <Link href="/" className="text-xs text-ink-400 hover:text-ink-200">← Inicio</Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="rounded-lg bg-ink-800 px-2.5 py-1 font-display tracking-[0.2em] text-volt-500 tabular-nums">
            {code}
          </span>
          {state && (
            <span className="text-ink-400">
              {state.players.length} jugador{state.players.length === 1 ? "" : "es"}
            </span>
          )}
        </div>
      </header>
      {children}
    </main>
  );
}
