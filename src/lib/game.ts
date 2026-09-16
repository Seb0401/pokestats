import { randomBytes, randomInt } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { admin } from "./supabase";
import type {
  BattleRound, BattleStanding, Category, GameState, LeaderboardRow,
  Pokemon, RevealedPick, RoundInfo,
} from "./types";

/** Bonificacion al ganador de una ronda de batalla, sobre el puntaje del Pokemon. */
export const WIN_BONUS = 25;

export class GameError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

export const token = () => randomBytes(24).toString("base64url");

// ---------------------------------------------------------------------------
// Creacion y acceso
// ---------------------------------------------------------------------------

async function freeCode(db: SupabaseClient): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const code = String(randomInt(100000, 1000000));
    const { data } = await db.from("rooms").select("id").eq("code", code).maybeSingle();
    if (!data) return code;
  }
  throw new GameError("No se pudo generar un codigo de sala libre.", 503);
}

export async function createRoom(opts: {
  hostName: string;
  categorySlugs: string[];
  battleRounds: number;
}) {
  const db = admin();
  const slugs = [...new Set(opts.categorySlugs)];

  if (slugs.length < 2) throw new GameError("Elige al menos 2 categorias.");
  if (slugs.length > 20) throw new GameError("Como maximo 20 categorias por partida.");

  const { data: valid, error } = await db.from("categories").select("slug").in("slug", slugs);
  if (error) throw new GameError(error.message, 500);
  if (!valid || valid.length !== slugs.length) {
    throw new GameError("Alguna categoria enviada no existe.");
  }
  if (opts.battleRounds < 1 || opts.battleRounds > slugs.length) {
    throw new GameError("El numero de rondas de batalla no cabe en las categorias elegidas.");
  }

  const hostToken = token();
  const { data: room, error: roomError } = await db
    .from("rooms")
    .insert({
      code: await freeCode(db),
      host_token: hostToken,
      host_name: opts.hostName.slice(0, 20) || "Anfitrion",
      battle_rounds: opts.battleRounds,
    })
    .select("id, code")
    .single();
  if (roomError || !room) throw new GameError(roomError?.message ?? "No se pudo crear la sala.", 500);

  const rows = slugs.map((slug, i) => ({
    room_id: room.id,
    position: i,
    category_slug: slug,
    state: "pending" as const,
  }));
  const { error: catError } = await db.from("room_categories").insert(rows);
  if (catError) throw new GameError(catError.message, 500);

  return { code: room.code, hostToken };
}

async function loadRoom(db: SupabaseClient, code: string) {
  const { data, error } = await db.from("rooms").select("*").eq("code", code).maybeSingle();
  if (error) throw new GameError(error.message, 500);
  if (!data) throw new GameError("No existe una sala con ese codigo.", 404);
  return data;
}

function assertHost(room: { host_token: string }, provided: string | null) {
  if (!provided || provided !== room.host_token) {
    throw new GameError("Solo el anfitrion puede hacer eso.", 403);
  }
}

export async function joinRoom(code: string, nickname: string) {
  const db = admin();
  const room = await loadRoom(db, code);
  // Se admite entrar tarde mientras se sigan eligiendo categorias: en un salon
  // alguien siempre llega tarde o pierde la sesion. Las categorias que ya pasaron
  // le quedan vacias en el cuadro. Con la batalla en marcha ya no tendria sentido.
  if (room.phase !== "lobby" && room.phase !== "picking") {
    throw new GameError("La batalla ya empezo; no se admiten mas jugadores.", 409);
  }

  const name = nickname.trim().slice(0, 20);
  if (!name) throw new GameError("Escribe un apodo.");

  const playerToken = token();
  const { data, error } = await db
    .from("players")
    .insert({ room_id: room.id, nickname: name, token: playerToken })
    .select("id, nickname")
    .single();

  if (error) {
    // 23505 = unique_violation sobre (room_id, nickname)
    if (error.code === "23505") throw new GameError("Ese apodo ya esta tomado en la sala.", 409);
    throw new GameError(error.message, 500);
  }
  return { playerId: data.id, nickname: data.nickname, playerToken };
}

// ---------------------------------------------------------------------------
// Elecciones
// ---------------------------------------------------------------------------

export async function submitPick(code: string, playerToken: string, pokemonSlug: string) {
  const db = admin();
  const room = await loadRoom(db, code);
  if (room.phase !== "picking") throw new GameError("La partida no esta en fase de eleccion.", 409);

  const { data: player } = await db
    .from("players").select("id")
    .eq("room_id", room.id).eq("token", playerToken).maybeSingle();
  if (!player) throw new GameError("No estas en esta sala.", 403);

  const { data: round } = await db
    .from("room_categories").select("category_slug, state")
    .eq("room_id", room.id).eq("position", room.current_position).maybeSingle();
  if (!round) throw new GameError("La sala no tiene una categoria activa.", 409);
  if (round.state !== "open") throw new GameError("Esta categoria ya no acepta cambios.", 409);

  // El Pokemon tiene que pertenecer a la categoria abierta.
  const { data: member } = await db
    .from("category_pokemon").select("pokemon_slug")
    .eq("category_slug", round.category_slug).eq("pokemon_slug", pokemonSlug).maybeSingle();
  if (!member) throw new GameError("Ese Pokemon no pertenece a la categoria actual.");

  const { error } = await db.from("picks").upsert({
    room_id: room.id,
    player_id: player.id,
    category_slug: round.category_slug,
    pokemon_slug: pokemonSlug,
  });
  if (error) throw new GameError(error.message, 500);

  await refreshPickedCount(db, room.id, room.current_position, round.category_slug);
  return { ok: true };
}

/** Recalcula el contador publico "N ya eligieron", que es lo que dispara Realtime. */
async function refreshPickedCount(
  db: SupabaseClient, roomId: string, position: number, categorySlug: string,
) {
  const { count } = await db
    .from("picks").select("player_id", { count: "exact", head: true })
    .eq("room_id", roomId).eq("category_slug", categorySlug);
  await db.from("room_categories")
    .update({ picked_count: count ?? 0 })
    .eq("room_id", roomId).eq("position", position);
}

// ---------------------------------------------------------------------------
// Acciones del anfitrion
// ---------------------------------------------------------------------------

export type HostAction =
  | "start" | "reveal" | "next" | "draw_battle" | "reveal_battle" | "finish";

export async function hostAction(code: string, hostToken: string, action: HostAction) {
  const db = admin();
  const room = await loadRoom(db, code);
  assertHost(room, hostToken);

  const { data: rounds } = await db
    .from("room_categories").select("position, category_slug, state")
    .eq("room_id", room.id).order("position");
  const total = rounds?.length ?? 0;

  switch (action) {
    case "start": {
      if (room.phase !== "lobby") throw new GameError("La partida ya empezo.", 409);
      const { count } = await db
        .from("players").select("id", { count: "exact", head: true }).eq("room_id", room.id);
      if (!count) throw new GameError("Necesitas al menos un jugador en la sala.", 409);

      await db.from("rooms").update({ phase: "picking", current_position: 0 }).eq("id", room.id);
      await db.from("room_categories")
        .update({ state: "open" }).eq("room_id", room.id).eq("position", 0);
      return { ok: true };
    }

    case "reveal": {
      if (room.phase !== "picking") throw new GameError("No hay categoria que revelar.", 409);
      await db.from("room_categories")
        .update({ state: "revealed" })
        .eq("room_id", room.id).eq("position", room.current_position);
      // `rooms` no cambia, asi que se toca a mano para disparar el evento Realtime.
      await db.from("rooms").update({ updated_at: new Date().toISOString() }).eq("id", room.id);
      return { ok: true };
    }

    case "next": {
      if (room.phase !== "picking") throw new GameError("La partida no esta eligiendo.", 409);
      // Avanzar sin revelar cierra la categoria igualmente: nadie la vuelve a tocar.
      await db.from("room_categories")
        .update({ state: "revealed" })
        .eq("room_id", room.id).eq("position", room.current_position);

      const next = room.current_position + 1;
      if (next >= total) {
        // Se acabaron las categorias: queda listo para el sorteo de la batalla.
        await db.from("rooms").update({ current_position: total - 1 }).eq("id", room.id);
        return { ok: true, exhausted: true };
      }
      await db.from("rooms").update({ current_position: next }).eq("id", room.id);
      await db.from("room_categories")
        .update({ state: "open" }).eq("room_id", room.id).eq("position", next);
      return { ok: true };
    }

    case "draw_battle": {
      if (room.phase === "battle" || room.phase === "finished") {
        throw new GameError("La batalla ya fue sorteada.", 409);
      }
      const played = (rounds ?? []).filter((r) => r.state === "revealed");
      if (played.length === 0) throw new GameError("Aun no se jugo ninguna categoria.", 409);

      const n = Math.min(room.battle_rounds, played.length);
      const picked = sample(played.map((r) => r.category_slug), n);

      await db.from("rooms").update({
        phase: "battle",
        battle_categories: picked,
        battle_revealed: 0,
      }).eq("id", room.id);
      return { ok: true, categories: picked };
    }

    case "reveal_battle": {
      if (room.phase !== "battle") throw new GameError("La batalla no esta en curso.", 409);
      const next = room.battle_revealed + 1;
      if (next > room.battle_categories.length) {
        throw new GameError("Ya se revelaron todas las rondas.", 409);
      }
      await db.from("rooms").update({ battle_revealed: next }).eq("id", room.id);
      return { ok: true, revealed: next };
    }

    case "finish": {
      await db.from("rooms").update({ phase: "finished" }).eq("id", room.id);
      return { ok: true };
    }
  }
}

/** Seleccion aleatoria sin reemplazo (Fisher-Yates parcial con RNG criptografico). */
function sample<T>(items: T[], n: number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

// ---------------------------------------------------------------------------
// Estado de la partida
// ---------------------------------------------------------------------------

export async function buildState(
  code: string,
  auth: { hostToken?: string | null; playerToken?: string | null },
): Promise<GameState> {
  const db = admin();
  const room = await loadRoom(db, code);
  const isHost = Boolean(auth.hostToken) && auth.hostToken === room.host_token;

  const [{ data: players }, { data: roomCats }] = await Promise.all([
    db.from("players").select("id, nickname, joined_at").eq("room_id", room.id).order("joined_at"),
    db.from("room_categories").select("position, category_slug, state, picked_count")
      .eq("room_id", room.id).order("position"),
  ]);

  const catSlugs = (roomCats ?? []).map((r) => r.category_slug);
  const { data: cats } = await db.from("categories").select("*").in("slug", catSlugs);
  const catBySlug = new Map<string, Category>((cats ?? []).map((c) => [c.slug, c]));

  const me = auth.playerToken
    ? (await db.from("players").select("id, nickname")
        .eq("room_id", room.id).eq("token", auth.playerToken).maybeSingle()).data
    : null;

  const rounds: RoundInfo[] = (roomCats ?? []).map((r) => ({
    position: r.position,
    category: catBySlug.get(r.category_slug)!,
    state: r.state,
    picked_count: r.picked_count,
  }));

  // Elecciones visibles: las de categorias reveladas, mas siempre las propias.
  const revealedSlugs = rounds.filter((r) => r.state === "revealed").map((r) => r.category.slug);
  const visibleSlugs = new Set(revealedSlugs);

  const { data: allPicks } = await db
    .from("picks").select("player_id, category_slug, pokemon_slug").eq("room_id", room.id);

  const shown = (allPicks ?? []).filter(
    (p) => visibleSlugs.has(p.category_slug) || (me && p.player_id === me.id),
  );

  const monSlugs = [...new Set((allPicks ?? []).map((p) => p.pokemon_slug))];
  const { data: mons } = monSlugs.length
    ? await db.from("pokemon").select("*").in("slug", monSlugs)
    : { data: [] as Pokemon[] };
  const monBySlug = new Map<string, Pokemon>((mons ?? []).map((m) => [m.slug, m]));
  const nameById = new Map((players ?? []).map((p) => [p.id, p.nickname]));

  const picks: Record<string, RevealedPick[]> = {};
  for (const p of shown) {
    const mon = monBySlug.get(p.pokemon_slug);
    if (!mon) continue;
    (picks[p.category_slug] ??= []).push({
      player_id: p.player_id,
      nickname: nameById.get(p.player_id) ?? "?",
      pokemon: mon,
    });
  }
  for (const list of Object.values(picks)) {
    list.sort((a, b) => a.nickname.localeCompare(b.nickname, "es"));
  }

  // --- Batalla ---
  let battle: BattleRound[] | null = null;
  let leaderboard: LeaderboardRow[] = [];

  if (room.phase === "battle" || room.phase === "finished") {
    const totals = new Map<string, LeaderboardRow>(
      (players ?? []).map((p) => [p.id, {
        player_id: p.id, nickname: p.nickname, total: 0, wins: 0,
      }]),
    );

    battle = (room.battle_categories as string[]).map((slug, i) => {
      const revealed = i < room.battle_revealed;
      const inCat = (allPicks ?? []).filter((p) => p.category_slug === slug);
      const byPlayer = new Map(inCat.map((p) => [p.player_id, monBySlug.get(p.pokemon_slug) ?? null]));

      const raw = (players ?? []).map((pl) => ({
        player_id: pl.id,
        nickname: pl.nickname,
        pokemon: byPlayer.get(pl.id) ?? null,
        score: Number(byPlayer.get(pl.id)?.battle_score ?? 0),
      }));

      const best = Math.max(0, ...raw.map((r) => r.score));
      const standings: BattleStanding[] = raw
        .map((r) => {
          // Empate en el maximo: todos los empatados cobran la bonificacion.
          const won = r.score > 0 && r.score === best;
          return {
            player_id: r.player_id,
            nickname: r.nickname,
            pokemon: r.pokemon,
            points: Math.round(r.score) + (won ? WIN_BONUS : 0),
            won,
          };
        })
        .sort((a, b) => b.points - a.points || a.nickname.localeCompare(b.nickname, "es"));

      if (revealed) {
        for (const s of standings) {
          const row = totals.get(s.player_id);
          if (!row) continue;
          row.total += s.points;
          if (s.won) row.wins += 1;
        }
      }

      return {
        index: i,
        category: catBySlug.get(slug)!,
        revealed,
        // Las rondas aun no reveladas no filtran nada.
        standings: revealed ? standings : [],
      };
    });

    leaderboard = [...totals.values()].sort(
      (a, b) => b.total - a.total || b.wins - a.wins || a.nickname.localeCompare(b.nickname, "es"),
    );
  }

  return {
    room: {
      id: room.id,
      code: room.code,
      phase: room.phase,
      host_name: room.host_name,
      current_position: room.current_position,
      battle_rounds: room.battle_rounds,
      battle_revealed: room.battle_revealed,
      updated_at: room.updated_at,
    },
    isHost,
    me: me ? { id: me.id, nickname: me.nickname } : null,
    players: players ?? [],
    rounds,
    picks,
    battle,
    leaderboard,
  };
}

/** id de sala, necesario del lado cliente para filtrar las suscripciones Realtime. */
export async function roomId(code: string): Promise<string> {
  const db = admin();
  return (await loadRoom(db, code)).id;
}
