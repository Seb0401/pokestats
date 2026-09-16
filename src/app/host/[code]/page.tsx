"use client";

import Link from "next/link";
import { use, useState } from "react";
import { api, getHostToken, useGameState } from "@/lib/client";
import type { GameState } from "@/lib/types";
import {
  BracketView, ChampionBanner, DuelArena, DuelPending, latestRevealed, nextPending,
} from "@/components/Bracket";
import { CodePlate, DexShell, Screen } from "@/components/Dex";
import { PickGrid } from "@/components/PickGrid";
import { Alert, BotTag, Spinner } from "@/components/ui";
import {
  ArrowRightIcon, BracketIcon, CategoryIcon, EyeIcon, PlayIcon, TrophyIcon, UserIcon,
} from "@/components/icons";

const bracketSizeFor = (n: number) => Math.max(2, 2 ** Math.ceil(Math.log2(Math.max(1, n))));

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

  const shell = (children: React.ReactNode, subtitle?: string) => (
    <main>
      <DexShell title="Consola del anfitrión" subtitle={subtitle} back="/" right={<CodePlate code={code} />}>
        {children}
      </DexShell>
    </main>
  );

  if (error) return shell(<Screen><Alert>{error}</Alert></Screen>);
  if (!state) return shell(<Screen><Spinner label="Cargando sala…" /></Screen>);

  if (!state.isHost) {
    return shell(
      <Screen>
        <div className="grid gap-3">
          <Alert>
            Esta pantalla es del anfitrión y este navegador no tiene su credencial.
            {getHostToken(code)
              ? " La credencial guardada ya no es válida."
              : " Ábrela desde el navegador en el que creaste la sala."}
          </Alert>
          <Link href={`/play/${code}`} className="btn btn-ghost">Entrar como jugador</Link>
        </div>
      </Screen>,
    );
  }

  const humans = state.players.filter((p) => !p.is_bot).length;
  const phaseLabel = {
    lobby: "Sala de espera",
    picking: "Elección de favoritos",
    bracket: "Torneo en curso",
    finished: "Torneo terminado",
  }[state.room.phase];

  return shell(
    <>
      {actionError && <Alert>{actionError}</Alert>}
      <Controls state={state} busy={busy} act={act} humans={humans} />

      {state.bracket && <Arena state={state} />}

      {state.bracket && (
        <Screen>
          <p className="eyebrow mb-3">Llaves · {state.bracket.size} entrenadores</p>
          <BracketView bracket={state.bracket} meId={null} />
        </Screen>
      )}

      {state.room.phase !== "lobby" && (
        <Screen>
          <p className="eyebrow mb-3">Cuadro de favoritos</p>
          <PickGrid state={state} />
        </Screen>
      )}
    </>,
    phaseLabel,
  );
}

// ---------------------------------------------------------------------------

function Arena({ state }: { state: GameState }) {
  const b = state.bracket!;
  if (state.room.phase === "finished") {
    const final = latestRevealed(b);
    return (
      <>
        <ChampionBanner bracket={b} meId={null} />
        {final && (
          <Screen>
            <DuelArena match={final} roundName={b.rounds[final.round - 1].name} meId={null} />
          </Screen>
        )}
      </>
    );
  }

  const latest = latestRevealed(b);
  const pending = nextPending(b);
  // Al empezar una ronda se anuncia el siguiente duelo; tras revelarlo, se muestra.
  const showLatest = latest && (latest.round === b.current_round || !pending);
  return (
    <Screen>
      {showLatest ? (
        <DuelArena match={latest} roundName={b.rounds[latest.round - 1].name} meId={null} />
      ) : pending ? (
        <DuelPending match={pending} roundName={b.rounds[pending.round - 1].name} meId={null} />
      ) : null}
    </Screen>
  );
}

function Controls({
  state, busy, act, humans,
}: {
  state: GameState;
  busy: boolean;
  act: (a: string) => void;
  humans: number;
}) {
  const { room, rounds, players } = state;

  if (room.phase === "lobby") {
    const size = bracketSizeFor(humans);
    return (
      <Screen>
        <div className="grid gap-5 md:grid-cols-[auto_1fr] md:items-center">
          <div className="grid gap-1 text-center md:pr-6 md:text-left">
            <p className="eyebrow justify-center md:justify-start">Código de sala</p>
            <p className="font-display text-6xl font-bold tracking-[0.12em] text-volt-400 tabular-nums drop-shadow-[0_3px_0_rgba(0,0,0,0.4)] sm:text-7xl">
              {room.code}
            </p>
            <p className="text-sm text-ink-300">Los entrenadores entran desde la portada.</p>
          </div>

          <div className="grid gap-3">
            <p className="flex items-center gap-2 font-display text-lg font-bold text-ink-100">
              <UserIcon size={20} className="text-volt-400" />
              {players.length === 0
                ? "Esperando entrenadores…"
                : `${players.length} entrenador${players.length === 1 ? "" : "es"} en la sala`}
            </p>
            <ul className="flex flex-wrap gap-2">
              {players.map((p) => (
                <li key={p.id} className="pop panel px-3 py-1.5 text-sm font-bold text-ink-100">{p.nickname}</li>
              ))}
            </ul>
            <p className="text-xs text-ink-400">
              {rounds.length} categorías ·{" "}
              {humans > 0 && (
                <>llaves de {size}{size - humans > 0 ? ` con ${size - humans} bot${size - humans === 1 ? "" : "s"}` : ""} si empiezan ahora</>
              )}
            </p>
            <button className="btn btn-primary" onClick={() => act("start")} disabled={busy || players.length === 0}>
              <PlayIcon size={16} /> Empezar partida
            </button>
          </div>
        </div>
      </Screen>
    );
  }

  if (room.phase === "picking") {
    const current = rounds[room.current_position];
    const allRevealed = rounds.every((r) => r.state === "revealed");
    const isLast = room.current_position === rounds.length - 1;
    const size = bracketSizeFor(humans);

    return (
      <Screen>
        <div className="grid gap-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-dex-500 text-ink-100 shadow-[inset_0_-4px_0_rgba(0,0,0,0.25)]">
                {current && <CategoryIcon slug={current.category.slug} size={28} />}
              </span>
              <div className="min-w-0">
                <p className="eyebrow">Categoría {room.current_position + 1} de {rounds.length}</p>
                <h2 className="font-display text-2xl font-bold text-ink-100">{current?.category.name}</h2>
                <p className="mt-1 max-w-xl text-sm text-ink-300">{current?.category.description}</p>
              </div>
            </div>
            <div className="panel px-4 py-2 text-center">
              <p className="font-display text-4xl font-bold tabular-nums text-volt-400">
                {current?.picked_count ?? 0}<span className="text-xl text-ink-400">/{humans}</span>
              </p>
              <p className="text-[11px] font-bold uppercase tracking-wider text-screen-300">ya eligieron</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {!allRevealed && (
              <>
                <button
                  className="btn btn-ghost"
                  onClick={() => act("reveal")}
                  disabled={busy || current?.state === "revealed"}
                >
                  <EyeIcon size={16} /> {current?.state === "revealed" ? "Revelada" : "Revelar elecciones"}
                </button>
                <button className="btn btn-primary" onClick={() => act("next")} disabled={busy}>
                  {isLast ? "Cerrar última categoría" : "Siguiente categoría"} <ArrowRightIcon size={16} />
                </button>
              </>
            )}
            {allRevealed && (
              <button className="btn btn-danger" onClick={() => act("build_bracket")} disabled={busy}>
                <BracketIcon size={16} /> Armar llaves de {size}
              </button>
            )}
          </div>

          <p className="text-xs text-ink-400">
            {allRevealed
              ? `${humans} entrenador${humans === 1 ? "" : "es"}${size - humans > 0 ? ` + ${size - humans} bot${size - humans === 1 ? "" : "s"}` : ""}. Quien no eligió en alguna categoría recibe un Pokémon sorteado.`
              : "Al cerrar la categoría, quien no haya elegido recibe un Pokémon sorteado de ella."}
          </p>
        </div>
      </Screen>
    );
  }

  if (room.phase === "bracket") {
    const b = state.bracket!;
    const round = b.rounds[b.current_round - 1];
    const pending = round.matches.filter((m) => !m.revealed).length;
    const isFinal = b.current_round === b.total_rounds;
    const bots = players.filter((p) => p.is_bot).length;

    return (
      <Screen>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="eyebrow">Ronda {b.current_round} de {b.total_rounds}</p>
            <h2 className="font-display text-2xl font-bold text-ink-100">{round.name}</h2>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-300">
              {round.matches.length - pending} de {round.matches.length} duelos revelados
              {bots > 0 && <><BotTag /> <span className="text-xs text-ink-400">{bots} en el torneo</span></>}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {pending > 0 ? (
              <button className="btn btn-primary" onClick={() => act("reveal_match")} disabled={busy}>
                <EyeIcon size={16} /> Revelar duelo
              </button>
            ) : isFinal ? (
              <button className="btn btn-danger" onClick={() => act("next_round")} disabled={busy}>
                <TrophyIcon size={16} /> Coronar campeón
              </button>
            ) : (
              <button className="btn btn-primary" onClick={() => act("next_round")} disabled={busy}>
                {b.rounds[b.current_round].name} <ArrowRightIcon size={16} />
              </button>
            )}
          </div>
        </div>
      </Screen>
    );
  }

  return (
    <Screen>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 font-display text-lg font-bold text-ink-100">
          <TrophyIcon size={22} className="text-volt-400" /> Torneo terminado
        </p>
        <Link href="/crear" className="btn btn-ghost">Nueva partida <ArrowRightIcon size={16} /></Link>
      </div>
    </Screen>
  );
}
