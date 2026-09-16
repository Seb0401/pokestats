"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { api, getPlayerToken, setPlayerToken, useGameState } from "@/lib/client";
import type { GameState, Pokemon } from "@/lib/types";
import { BattleBoard } from "@/components/Battle";
import { Leaderboard, PickGrid } from "@/components/PickGrid";
import { PokemonCard } from "@/components/PokemonCard";
import { PokemonPicker } from "@/components/PokemonPicker";
import { Alert, Spinner } from "@/components/ui";

export default function PlayPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const { state, error, refresh } = useGameState(code);

  if (error) return <Shell code={code}><Alert>{error}</Alert></Shell>;
  if (!state) return <Shell code={code}><Spinner label="Cargando sala…" /></Shell>;
  if (!state.me) return <Shell code={code}><Rejoin code={code} /></Shell>;

  return (
    <Shell code={code} state={state}>
      <Body state={state} code={code} refresh={refresh} />
    </Shell>
  );
}

// ---------------------------------------------------------------------------

function Body({
  state, code, refresh,
}: {
  state: GameState;
  code: string;
  refresh: () => Promise<void>;
}) {
  const [pickError, setPickError] = useState<string | null>(null);
  const { room, rounds } = state;
  const current = rounds[room.current_position];

  const myPick = current
    ? state.picks[current.category.slug]?.find((p) => p.player_id === state.me?.id)?.pokemon ?? null
    : null;

  async function choose(p: Pokemon) {
    setPickError(null);
    try {
      await api.pick(code, p.slug);
      await refresh();
    } catch (e) {
      setPickError(e instanceof Error ? e.message : "No se pudo guardar tu elección.");
    }
  }

  if (room.phase === "lobby") {
    return (
      <section className="card grid gap-4 p-5 text-center">
        <h2 className="font-display text-2xl font-bold text-ink-200">
          Estás dentro, {state.me?.nickname}
        </h2>
        <p className="text-sm text-ink-400">
          Esperando a que {room.host_name} empiece la partida.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {state.players.map((p) => (
            <span
              key={p.id}
              className={`rise rounded-lg px-3 py-1.5 text-sm
                ${p.id === state.me?.id ? "bg-volt-500/20 text-volt-400" : "bg-ink-800 text-ink-200"}`}
            >
              {p.nickname}
            </span>
          ))}
        </div>
        <p className="text-xs text-ink-400">
          {rounds.length} categorías · {room.battle_rounds} irán a la batalla
        </p>
      </section>
    );
  }

  if (room.phase === "picking" && current) {
    const closed = current.state === "revealed";
    return (
      <div className="grid gap-5">
        <section className="card grid gap-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-ink-400">
                Categoría {room.current_position + 1} de {rounds.length}
              </p>
              <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-ink-200">
                <span aria-hidden>{current.category.emoji}</span>
                <span className="min-w-0 break-words">{current.category.name}</span>
              </h2>
              <p className="mt-1 text-sm text-ink-400">{current.category.description}</p>
            </div>
            <span className="shrink-0 rounded-lg bg-ink-800 px-2.5 py-1 text-xs text-ink-300 tabular-nums">
              {current.picked_count}/{state.players.length} listos
            </span>
          </div>

          {pickError && <Alert>{pickError}</Alert>}

          {closed ? (
            <Alert tone="info">
              Categoría cerrada. Espera a que {room.host_name} pase a la siguiente.
            </Alert>
          ) : (
            <PokemonPicker
              category={current.category}
              current={myPick?.slug ?? null}
              onPick={choose}
            />
          )}
        </section>

        {myPick && (
          <section className="grid gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-400">
              Tu elección{closed ? "" : " · puedes cambiarla hasta que cierren"}
            </h3>
            <PokemonCard p={myPick} />
          </section>
        )}

        <section className="card grid gap-3 p-4">
          <h3 className="font-display text-lg font-bold text-ink-200">Cuadro de la partida</h3>
          <PickGrid state={state} />
        </section>
      </div>
    );
  }

  // battle / finished
  return (
    <div className="grid gap-5">
      {room.phase === "finished" && (
        <section className="card grid gap-1 p-5 text-center">
          <h2 className="font-display text-2xl font-bold text-ink-200">Partida terminada</h2>
          <p className="text-sm text-ink-400">
            Ganó <strong className="text-volt-400">{state.leaderboard[0]?.nickname ?? "—"}</strong>.
          </p>
        </section>
      )}

      {state.leaderboard.length > 0 && (
        <section className="grid gap-2">
          <h2 className="font-display text-xl font-bold text-ink-200">Tabla de posiciones</h2>
          <Leaderboard state={state} />
        </section>
      )}

      <section className="grid gap-3">
        <h2 className="font-display text-xl font-bold text-ink-200">Batalla</h2>
        <BattleBoard state={state} />
      </section>

      <section className="card grid gap-3 p-4">
        <h3 className="font-display text-lg font-bold text-ink-200">Cuadro de la partida</h3>
        <PickGrid state={state} highlight={state.battle?.map((b) => b.category.slug)} />
      </section>
    </div>
  );
}

/** El jugador perdió su credencial (otro navegador, datos borrados). */
function Rejoin({ code }: { code: string }) {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await api.join(code, nickname);
      setPlayerToken(code, res.playerToken);
      router.refresh();
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo entrar.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={join} className="card grid gap-3 p-5">
      <h2 className="font-display text-xl font-bold text-ink-200">Únete a la sala {code}</h2>
      <p className="text-sm text-ink-400">
        {getPlayerToken(code)
          ? "Tu credencial ya no es válida en esta sala. Vuelve a entrar con un apodo."
          : "Este navegador todavía no está registrado en la sala."}
      </p>
      <input
        className="field"
        placeholder="Tu apodo"
        maxLength={20}
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
      />
      {error && <Alert>{error}</Alert>}
      <button className="btn btn-primary" disabled={busy || !nickname.trim()}>
        {busy ? "Entrando…" : "Entrar"}
      </button>
    </form>
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
    <main className="mx-auto grid max-w-4xl gap-5 px-4 py-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <Link href="/" className="text-xs text-ink-400 hover:text-ink-200">← Inicio</Link>
        <div className="flex items-center gap-3 text-sm">
          {state?.me && <span className="text-ink-300">{state.me.nickname}</span>}
          <span className="rounded-lg bg-ink-800 px-2.5 py-1 font-display tracking-[0.2em] text-volt-500 tabular-nums">
            {code}
          </span>
        </div>
      </header>
      {children}
    </main>
  );
}
