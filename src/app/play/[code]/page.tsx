"use client";

import { use, useState } from "react";
import { api, getPlayerToken, setPlayerToken, useGameState } from "@/lib/client";
import type { Bracket, GameState, Pokemon } from "@/lib/types";
import {
  BracketView, ChampionBanner, DuelArena, DuelPending, latestRevealed, nextPending,
} from "@/components/Bracket";
import { CodePlate, DexShell, Screen } from "@/components/Dex";
import { PickGrid } from "@/components/PickGrid";
import { PokemonCard } from "@/components/PokemonCard";
import { PokemonPicker } from "@/components/PokemonPicker";
import { Alert, RandomTag, Spinner } from "@/components/ui";
import { ArrowRightIcon, BallMark, CategoryIcon, LockIcon, SwordsIcon, TrophyIcon } from "@/components/icons";

export default function PlayPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const { state, error, refresh } = useGameState(code);

  const shell = (children: React.ReactNode, subtitle?: string) => (
    <main>
      <DexShell title="PokéStats" subtitle={subtitle} back="/" right={<CodePlate code={code} />}>
        {children}
      </DexShell>
    </main>
  );

  if (error) return shell(<Screen><Alert>{error}</Alert></Screen>);
  if (!state) return shell(<Screen><Spinner label="Cargando sala…" /></Screen>);
  if (!state.me) return shell(<Rejoin code={code} />);

  return shell(<Body state={state} code={code} refresh={refresh} />, `Entrenador ${state.me.nickname}`);
}

// ---------------------------------------------------------------------------

/** Dónde está el jugador dentro de las llaves. */
function myStatus(bracket: Bracket, meId: string) {
  for (const round of bracket.rounds) {
    const m = round.matches.find((x) => x.a.player_id === meId || x.b.player_id === meId);
    if (!m) continue;
    if (!m.revealed) {
      const rival = m.a.player_id === meId ? m.b : m.a;
      return { kind: "next" as const, round: round.name, rival: rival.nickname };
    }
    if (m.winner_id !== meId) return { kind: "out" as const, round: round.name };
  }
  if (bracket.champion?.player_id === meId) return { kind: "champion" as const };
  return { kind: "waiting" as const };
}

function Body({ state, code, refresh }: { state: GameState; code: string; refresh: () => Promise<void> }) {
  const [pickError, setPickError] = useState<string | null>(null);
  const { room, rounds } = state;
  const meId = state.me!.id;
  const current = rounds[room.current_position];

  const myEntry = current ? state.picks[current.category.slug]?.find((p) => p.player_id === meId) ?? null : null;

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
      <Screen>
        <div className="grid justify-items-center gap-4 py-4 text-center">
          <span className="shake"><BallMark size={64} /></span>
          <h2 className="font-display text-3xl font-bold text-ink-100">¡Estás dentro, {state.me!.nickname}!</h2>
          <p className="text-sm text-ink-300">Esperando a que {room.host_name} empiece la partida.</p>
          <ul className="flex flex-wrap justify-center gap-2">
            {state.players.map((p) => (
              <li
                key={p.id}
                className={`pop rounded-lg px-3 py-1.5 text-sm font-bold ${p.id === meId ? "bg-volt-500/20 text-volt-400" : "panel text-ink-100"}`}
              >
                {p.nickname}
              </li>
            ))}
          </ul>
          <p className="text-xs text-ink-400">{rounds.length} categorías · torneo por llaves con duelos 6 vs 6</p>
        </div>
      </Screen>
    );
  }

  if (room.phase === "picking" && current) {
    const closed = current.state === "revealed";
    const humans = state.players.filter((p) => !p.is_bot).length;
    return (
      <>
        <Screen>
          <div className="grid gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-dex-500 text-ink-100 shadow-[inset_0_-4px_0_rgba(0,0,0,0.25)]">
                  <CategoryIcon slug={current.category.slug} size={24} />
                </span>
                <div className="min-w-0">
                  <p className="eyebrow">Categoría {room.current_position + 1} de {rounds.length}</p>
                  <h2 className="font-display text-2xl font-bold text-ink-100">{current.category.name}</h2>
                  <p className="mt-1 text-sm text-ink-300">{current.category.description}</p>
                </div>
              </div>
              <span className="panel shrink-0 px-2.5 py-1 font-display text-sm font-bold text-screen-300 tabular-nums">
                {current.picked_count}/{humans} listos
              </span>
            </div>

            {pickError && <Alert>{pickError}</Alert>}

            {closed ? (
              <Alert tone="info">
                <span className="inline-flex items-center gap-1.5"><LockIcon size={14} /> Categoría cerrada.</span>{" "}
                Espera a que {room.host_name} pase a la siguiente.
              </Alert>
            ) : (
              <PokemonPicker category={current.category} current={myEntry?.pokemon.slug ?? null} onPick={choose} />
            )}
          </div>
        </Screen>

        {myEntry && (
          <Screen>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <p className="eyebrow flex-1">
                Tu elección{closed ? "" : " · puedes cambiarla hasta que cierren"}
              </p>
              {myEntry.random && <RandomTag />}
            </div>
            <PokemonCard p={myEntry.pokemon} />
          </Screen>
        )}

        <Screen>
          <p className="eyebrow mb-3">Cuadro de favoritos</p>
          <PickGrid state={state} />
        </Screen>
      </>
    );
  }

  // --- Torneo ---
  const b = state.bracket;
  if (!b) {
    return (
      <Screen>
        <Spinner label={`Esperando a que ${room.host_name} arme las llaves…`} />
        <div className="mt-4"><PickGrid state={state} /></div>
      </Screen>
    );
  }

  const status = myStatus(b, meId);
  const latest = latestRevealed(b);
  const pending = nextPending(b);
  const showLatest = latest && (latest.round === b.current_round || !pending || room.phase === "finished");

  return (
    <>
      {room.phase === "finished" && <ChampionBanner bracket={b} meId={meId} />}

      {room.phase !== "finished" && (
        <Screen>
          <div className="flex flex-wrap items-center gap-3">
            {status.kind === "next" && (
              <>
                <SwordsIcon size={26} className="text-volt-400" />
                <p className="font-display text-lg font-bold text-ink-100">
                  {status.round}: tu rival es <span className="text-volt-400">{status.rival}</span>
                </p>
              </>
            )}
            {status.kind === "out" && (
              <>
                <BallMark size={26} closed={false} />
                <p className="font-display text-lg font-bold text-ink-300">
                  Quedaste fuera en {status.round}. ¡Sigue el torneo!
                </p>
              </>
            )}
            {status.kind === "champion" && (
              <>
                <TrophyIcon size={26} className="text-volt-400" />
                <p className="font-display text-lg font-bold text-volt-300">¡Ganaste el torneo!</p>
              </>
            )}
            {status.kind === "waiting" && (
              <>
                <ArrowRightIcon size={24} className="text-screen-300" />
                <p className="font-display text-lg font-bold text-ink-100">
                  Avanzaste. Esperando la siguiente ronda…
                </p>
              </>
            )}
          </div>
        </Screen>
      )}

      <Screen>
        {showLatest && latest ? (
          <DuelArena match={latest} roundName={b.rounds[latest.round - 1].name} meId={meId} />
        ) : pending ? (
          <DuelPending match={pending} roundName={b.rounds[pending.round - 1].name} meId={meId} />
        ) : (
          <Spinner label="Esperando al anfitrión…" />
        )}
      </Screen>

      <Screen>
        <p className="eyebrow mb-3">Llaves · {b.size} entrenadores</p>
        <BracketView bracket={b} meId={meId} />
      </Screen>

      <Screen>
        <p className="eyebrow mb-3">Cuadro de favoritos</p>
        <PickGrid state={state} />
      </Screen>
    </>
  );
}

/** El jugador perdió su credencial (otro navegador, datos borrados). */
function Rejoin({ code }: { code: string }) {
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
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo entrar.");
      setBusy(false);
    }
  }

  return (
    <Screen>
      <form onSubmit={join} className="grid gap-3">
        <p className="eyebrow">Sala {code}</p>
        <h2 className="font-display text-2xl font-bold text-ink-100">Únete al torneo</h2>
        <p className="text-sm text-ink-300">
          {getPlayerToken(code)
            ? "Tu credencial ya no es válida en esta sala. Vuelve a entrar con un nombre."
            : "Este navegador todavía no está registrado en la sala."}
        </p>
        <input
          className="field"
          placeholder="Tu nombre de entrenador"
          maxLength={20}
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
        />
        {error && <Alert>{error}</Alert>}
        <button className="btn btn-primary" disabled={busy || !nickname.trim()}>
          {busy ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </Screen>
  );
}
