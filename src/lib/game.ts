import { randomBytes, randomInt } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { admin } from "./supabase";
import type {
  Bracket, BracketRound, Category, GameState, Match, MatchSide, Pokemon,
  PokemonPublic, PlayerPublic, RevealedPick, RoundInfo, TeamMember,
} from "./types";

/** Tope de jugadores humanos: da llaves de hasta 64. */
export const MAX_PLAYERS = 64;

export class GameError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

export const token = () => randomBytes(24).toString("base64url");

const PUBLIC_POKEMON_KEYS: (keyof PokemonPublic)[] = [
  "slug", "dex", "name", "form", "type1", "type2", "ability1", "ability_hidden",
  "hp", "attack", "defense", "sp_atk", "sp_def", "speed", "total_stats",
  "legendary", "mythical", "generation", "profile", "dual_type", "sprite_id",
];

/** Quita el puntaje competitivo: es lo unico que decide los duelos. */
export function publicPokemon(p: Pokemon): PokemonPublic {
  const out = {} as Record<string, unknown>;
  for (const k of PUBLIC_POKEMON_KEYS) out[k] = p[k];
  return out as unknown as PokemonPublic;
}

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

export async function createRoom(opts: { hostName: string; categorySlugs: string[] }) {
  const db = admin();
  const slugs = [...new Set(opts.categorySlugs)];

  if (slugs.length < 2) throw new GameError("Elige al menos 2 categorias.");
  if (slugs.length > 20) throw new GameError("Como maximo 20 categorias por partida.");

  const { data: valid, error } = await db.from("categories").select("slug").in("slug", slugs);
  if (error) throw new GameError(error.message, 500);
  if (!valid || valid.length !== slugs.length) {
    throw new GameError("Alguna categoria enviada no existe.");
  }

  const hostToken = token();
  const { data: room, error: roomError } = await db
    .from("rooms")
    .insert({
      code: await freeCode(db),
      host_token: hostToken,
      host_name: opts.hostName.slice(0, 20) || "Anfitrion",
    })
    .select("id, code")
    .single();
  if (roomError || !room) throw new GameError(roomError?.message ?? "No se pudo crear la sala.", 500);

  const { error: catError } = await db.from("room_categories").insert(
    slugs.map((slug, i) => ({ room_id: room.id, position: i, category_slug: slug, state: "pending" })),
  );
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
  // alguien siempre llega tarde o pierde la sesion. En las categorias que ya
  // pasaron se le sortea un Pokemon al armar las llaves.
  if (room.phase !== "lobby" && room.phase !== "picking") {
    throw new GameError("Las llaves ya estan armadas; no se admiten mas jugadores.", 409);
  }

  const name = nickname.trim().slice(0, 20);
  if (!name) throw new GameError("Escribe un apodo.");

  const { count } = await db
    .from("players").select("id", { count: "exact", head: true }).eq("room_id", room.id);
  if ((count ?? 0) >= MAX_PLAYERS) {
    throw new GameError(`La sala esta llena (maximo ${MAX_PLAYERS} jugadores).`, 409);
  }

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

  const { data: member } = await db
    .from("category_pokemon").select("pokemon_slug")
    .eq("category_slug", round.category_slug).eq("pokemon_slug", pokemonSlug).maybeSingle();
  if (!member) throw new GameError("Ese Pokemon no pertenece a la categoria actual.");

  const { error } = await db.from("picks").upsert({
    room_id: room.id,
    player_id: player.id,
    category_slug: round.category_slug,
    pokemon_slug: pokemonSlug,
    random: false,
  });
  if (error) throw new GameError(error.message, 500);

  // El contador publico es lo que dispara Realtime sin revelar la eleccion.
  const { count } = await db
    .from("picks").select("player_id", { count: "exact", head: true })
    .eq("room_id", room.id).eq("category_slug", round.category_slug);
  await db.from("room_categories")
    .update({ picked_count: count ?? 0 })
    .eq("room_id", room.id).eq("position", room.current_position);

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Llaves
// ---------------------------------------------------------------------------

/** Siguiente potencia de 2 que alcanza a `n`, con un minimo de 2. */
export const bracketSizeFor = (n: number) => Math.max(2, 2 ** Math.ceil(Math.log2(Math.max(1, n))));

export function roundName(round: number, totalRounds: number) {
  const matches = 2 ** (totalRounds - round);
  if (matches === 1) return "Final";
  if (matches === 2) return "Semifinales";
  if (matches === 4) return "Cuartos de final";
  if (matches === 8) return "Octavos de final";
  if (matches === 16) return "Dieciseisavos";
  return `Ronda ${round}`;
}

const BOT_CLASSES = [
  "Recluta", "Joven", "Dominguera", "Cazabichos", "Montañero", "Nadadora",
  "Karateka", "Pescador", "Científico", "Motorista", "Médium", "Criadora",
  "Dragonauta", "Esquiadora", "Guardabosques", "Colegiala", "Ruinamaníaco",
  "Malabarista", "Pokéfan", "Rival",
];

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const pickOne = <T,>(items: T[]): T => items[randomInt(items.length)];

/** Tamano del equipo que pelea en cada duelo. */
export const TEAM_SIZE = 6;

/**
 * Sortea un Pokemon de la categoria para cada par jugador/categoria que no tenga
 * eleccion: bots, jugadores que no eligieron a tiempo y quienes entraron tarde.
 */
async function fillRandomPicks(
  db: SupabaseClient, roomId: string, categorySlugs: string[], playerIds: string[],
) {
  if (!categorySlugs.length || !playerIds.length) return 0;

  const [{ data: existing }, { data: members }] = await Promise.all([
    db.from("picks").select("player_id, category_slug")
      .eq("room_id", roomId).in("category_slug", categorySlugs),
    db.from("category_pokemon").select("category_slug, pokemon_slug").in("category_slug", categorySlugs),
  ]);
  const have = new Set((existing ?? []).map((p) => `${p.player_id}|${p.category_slug}`));
  const pool = new Map<string, string[]>();
  for (const m of members ?? []) {
    if (!pool.has(m.category_slug)) pool.set(m.category_slug, []);
    pool.get(m.category_slug)!.push(m.pokemon_slug);
  }

  const rows = playerIds.flatMap((player) => categorySlugs
    .filter((c) => !have.has(`${player}|${c}`) && pool.get(c)?.length)
    .map((c) => ({
      room_id: roomId, player_id: player, category_slug: c,
      pokemon_slug: pickOne(pool.get(c)!), random: true,
    })));
  if (!rows.length) return 0;

  // ignoreDuplicates: si el jugador eligio justo en este instante, gana su eleccion.
  const { error } = await db.from("picks")
    .upsert(rows, { onConflict: "room_id,player_id,category_slug", ignoreDuplicates: true });
  if (error) throw new GameError(error.message, 500);
  return rows.length;
}

type DuelContext = {
  /** Categorias de la sala, en orden de juego. */
  categories: string[];
  /** `${player_id}|${category}` -> battle_score del Pokemon elegido. */
  scores: Map<string, number>;
};

async function loadDuelContext(db: SupabaseClient, roomId: string): Promise<DuelContext> {
  const [{ data: cats }, { data: picks }] = await Promise.all([
    db.from("room_categories").select("category_slug").eq("room_id", roomId).order("position"),
    db.from("picks").select("player_id, category_slug, pokemon_slug").eq("room_id", roomId),
  ]);

  const slugs = [...new Set((picks ?? []).map((p) => p.pokemon_slug))];
  const { data: mons } = slugs.length
    ? await db.from("pokemon").select("slug, battle_score").in("slug", slugs)
    : { data: [] as { slug: string; battle_score: number }[] };
  const scoreBySlug = new Map((mons ?? []).map((m) => [m.slug, Number(m.battle_score)]));

  return {
    categories: (cats ?? []).map((c) => c.category_slug),
    scores: new Map((picks ?? []).map((p) => [
      `${p.player_id}|${p.category_slug}`, scoreBySlug.get(p.pokemon_slug) ?? 0,
    ])),
  };
}

/**
 * Arma el equipo de un lado. Con TEAM_SIZE categorias o menos pelean todas, las
 * mismas para ambos; con mas, cada jugador recibe TEAM_SIZE al azar, sin
 * relacion con las del rival. Se respeta el orden de juego de la sala.
 */
function drawTeam(categories: string[]): string[] {
  if (categories.length <= TEAM_SIZE) return [...categories];
  const chosen = new Set(shuffle(categories).slice(0, TEAM_SIZE));
  return categories.filter((c) => chosen.has(c));
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Decide un duelo: gana el mayor promedio de puntaje del equipo; empate exacto, al azar. */
function resolveDuel(ctx: DuelContext, a: string, b: string) {
  const team_a = drawTeam(ctx.categories);
  const team_b = drawTeam(ctx.categories);
  const avg = (player: string, team: string[]) =>
    round2(team.reduce((sum, c) => sum + (ctx.scores.get(`${player}|${c}`) ?? 0), 0) / team.length);

  const avg_a = avg(a, team_a);
  const avg_b = avg(b, team_b);
  const tiebreak = avg_a === avg_b;
  const winner = tiebreak ? pickOne([a, b]) : avg_a > avg_b ? a : b;
  return { team_a, team_b, avg_a, avg_b, winner, tiebreak };
}

async function buildBracket(db: SupabaseClient, room: { id: string }) {
  const { data: humans } = await db
    .from("players").select("id, nickname").eq("room_id", room.id).eq("is_bot", false);
  if (!humans?.length) throw new GameError("No hay jugadores en la sala.", 409);

  const size = bracketSizeFor(humans.length);
  const botCount = size - humans.length;

  let bots: { id: string }[] = [];
  if (botCount > 0) {
    const taken = new Set(humans.map((h) => h.nickname.toLowerCase()));
    const names: string[] = [];
    for (const cls of shuffle(BOT_CLASSES)) {
      if (names.length === botCount) break;
      const name = `${cls} Bot`;
      if (!taken.has(name.toLowerCase())) names.push(name);
    }
    for (let i = 1; names.length < botCount; i++) {
      const name = `Bot ${i}`;
      if (!taken.has(name.toLowerCase())) names.push(name);
    }

    const { data, error } = await db.from("players")
      .insert(names.map((nickname) => ({ room_id: room.id, nickname, token: token(), is_bot: true })))
      .select("id");
    if (error || !data) throw new GameError(error?.message ?? "No se pudieron crear los bots.", 500);
    bots = data;
  }

  // Bots y huecos de los humanos (quien entro tarde) se completan al azar.
  const { data: roomCats } = await db
    .from("room_categories").select("category_slug").eq("room_id", room.id);
  await fillRandomPicks(
    db, room.id, (roomCats ?? []).map((c) => c.category_slug), [...humans, ...bots].map((p) => p.id),
  );

  // Hay menos bots que humanos, asi que cada bot enfrenta a un humano en la
  // primera ronda: nadie queda fuera por un cruce entre bots.
  const h = shuffle(humans.map((x) => x.id));
  const b = shuffle(bots.map((x) => x.id));
  const pairs: [string, string][] = b.map((bot, i) => [h[i], bot]);
  const rest = h.slice(b.length);
  for (let i = 0; i < rest.length; i += 2) pairs.push([rest[i], rest[i + 1]]);

  const ctx = await loadDuelContext(db, room.id);
  const rows = shuffle(pairs).map(([pa, pb], slot) => ({
    room_id: room.id, round: 1, slot, player_a: pa, player_b: pb, ...resolveDuel(ctx, pa, pb),
  }));
  const { error } = await db.from("matches").insert(rows);
  if (error) throw new GameError(error.message, 500);

  await db.from("rooms")
    .update({ phase: "bracket", bracket_size: size, current_round: 1 })
    .eq("id", room.id);
  return { size, bots: botCount };
}

async function advanceRound(
  db: SupabaseClient, room: { id: string; bracket_size: number; current_round: number },
) {
  const { data: current } = await db
    .from("matches").select("slot, winner, revealed")
    .eq("room_id", room.id).eq("round", room.current_round).order("slot");
  if (!current?.length) throw new GameError("No hay duelos en esta ronda.", 409);
  if (current.some((m) => !m.revealed)) {
    throw new GameError("Revela todos los duelos de la ronda antes de avanzar.", 409);
  }

  const totalRounds = Math.log2(room.bracket_size);
  if (room.current_round >= totalRounds) {
    await db.from("rooms").update({ phase: "finished" }).eq("id", room.id);
    return { finished: true };
  }

  // Los ganadores de los duelos 0-1 se cruzan, luego 2-3, y asi.
  const ctx = await loadDuelContext(db, room.id);
  const next = room.current_round + 1;
  const rows = [];
  for (let i = 0; i < current.length; i += 2) {
    const a = current[i].winner;
    const b = current[i + 1].winner;
    rows.push({ room_id: room.id, round: next, slot: i / 2, player_a: a, player_b: b, ...resolveDuel(ctx, a, b) });
  }
  const { error } = await db.from("matches").insert(rows);
  if (error) throw new GameError(error.message, 500);

  await db.from("rooms").update({ current_round: next }).eq("id", room.id);
  return { round: next };
}

// ---------------------------------------------------------------------------
// Acciones del anfitrion
// ---------------------------------------------------------------------------

export type HostAction =
  | "start" | "reveal" | "next" | "build_bracket" | "reveal_match" | "next_round" | "finish";

export async function hostAction(code: string, hostToken: string, action: HostAction) {
  const db = admin();
  const room = await loadRoom(db, code);
  assertHost(room, hostToken);

  const { data: rounds } = await db
    .from("room_categories").select("position, category_slug, state")
    .eq("room_id", room.id).order("position");
  const total = rounds?.length ?? 0;
  const touch = () => db.from("rooms").update({ updated_at: new Date().toISOString() }).eq("id", room.id);

  /** Cierra la categoria activa y sortea un Pokemon a quien no eligio a tiempo. */
  const closeCategory = async () => {
    const current = rounds?.find((r) => r.position === room.current_position);
    if (!current) return;
    await db.from("room_categories")
      .update({ state: "revealed" })
      .eq("room_id", room.id).eq("position", room.current_position);
    const { data: humans } = await db
      .from("players").select("id").eq("room_id", room.id).eq("is_bot", false);
    await fillRandomPicks(db, room.id, [current.category_slug], (humans ?? []).map((p) => p.id));
  };

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
      await closeCategory();
      await touch();
      return { ok: true };
    }

    case "next": {
      if (room.phase !== "picking") throw new GameError("La partida no esta eligiendo.", 409);
      // Avanzar sin revelar cierra la categoria igualmente.
      await closeCategory();

      const next = room.current_position + 1;
      if (next >= total) {
        await touch();
        return { ok: true, exhausted: true };
      }
      await db.from("rooms").update({ current_position: next }).eq("id", room.id);
      await db.from("room_categories")
        .update({ state: "open" }).eq("room_id", room.id).eq("position", next);
      return { ok: true };
    }

    case "build_bracket": {
      if (room.phase !== "picking") throw new GameError("Las llaves solo se arman al terminar de elegir.", 409);
      if ((rounds ?? []).some((r) => r.state !== "revealed")) {
        throw new GameError("Cierra todas las categorias antes de armar las llaves.", 409);
      }
      return { ok: true, ...(await buildBracket(db, room)) };
    }

    case "reveal_match": {
      if (room.phase !== "bracket") throw new GameError("El torneo no esta en curso.", 409);
      const { data: pending } = await db
        .from("matches").select("slot")
        .eq("room_id", room.id).eq("round", room.current_round).eq("revealed", false)
        .order("slot").limit(1).maybeSingle();
      if (!pending) throw new GameError("Ya se revelaron todos los duelos de esta ronda.", 409);

      await db.from("matches").update({ revealed: true })
        .eq("room_id", room.id).eq("round", room.current_round).eq("slot", pending.slot);
      // `matches` no esta en Realtime: se toca la sala para avisar a los clientes.
      await touch();
      return { ok: true, round: room.current_round, slot: pending.slot };
    }

    case "next_round": {
      if (room.phase !== "bracket") throw new GameError("El torneo no esta en curso.", 409);
      return { ok: true, ...(await advanceRound(db, room)) };
    }

    case "finish": {
      await db.from("rooms").update({ phase: "finished" }).eq("id", room.id);
      return { ok: true };
    }
  }
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

  const [{ data: playerRows }, { data: roomCats }, { data: allPicks }] = await Promise.all([
    db.from("players").select("id, nickname, is_bot, joined_at, token")
      .eq("room_id", room.id).order("is_bot").order("joined_at"),
    db.from("room_categories").select("position, category_slug, state, picked_count")
      .eq("room_id", room.id).order("position"),
    db.from("picks").select("player_id, category_slug, pokemon_slug, random").eq("room_id", room.id),
  ]);

  const meRow = auth.playerToken
    ? (playerRows ?? []).find((p) => !p.is_bot && p.token === auth.playerToken)
    : undefined;
  const me = meRow ? { id: meRow.id, nickname: meRow.nickname } : null;
  const players: PlayerPublic[] = (playerRows ?? []).map(({ id, nickname, is_bot, joined_at }) => ({
    id, nickname, is_bot, joined_at,
  }));
  const playerById = new Map(players.map((p) => [p.id, p]));

  const catSlugs = (roomCats ?? []).map((r) => r.category_slug);
  const { data: cats } = await db.from("categories").select("*").in("slug", catSlugs);
  const catBySlug = new Map<string, Category>((cats ?? []).map((c) => [c.slug, c]));

  const rounds: RoundInfo[] = (roomCats ?? []).map((r) => ({
    position: r.position,
    category: catBySlug.get(r.category_slug)!,
    state: r.state,
    picked_count: r.picked_count,
  }));

  const monSlugs = [...new Set((allPicks ?? []).map((p) => p.pokemon_slug))];
  const { data: mons } = monSlugs.length
    ? await db.from("pokemon").select("*").in("slug", monSlugs)
    : { data: [] as Pokemon[] };
  // El anfitrion ve el puntaje; los jugadores, nunca.
  const view = (p: Pokemon): Pokemon => (isHost ? p : publicPokemon(p));
  const monBySlug = new Map<string, Pokemon>((mons ?? []).map((m) => [m.slug, m]));
  const pickOf = new Map((allPicks ?? []).map((p) => [`${p.player_id}|${p.category_slug}`, p]));

  // Elecciones visibles: las de categorias reveladas, mas siempre las propias.
  const revealed = new Set(rounds.filter((r) => r.state === "revealed").map((r) => r.category.slug));
  const picks: Record<string, RevealedPick[]> = {};
  for (const p of allPicks ?? []) {
    if (!revealed.has(p.category_slug) && p.player_id !== me?.id) continue;
    const mon = monBySlug.get(p.pokemon_slug);
    if (!mon) continue;
    (picks[p.category_slug] ??= []).push({
      player_id: p.player_id,
      nickname: playerById.get(p.player_id)?.nickname ?? "?",
      pokemon: view(mon),
      random: p.random,
    });
  }
  for (const list of Object.values(picks)) {
    list.sort((a, b) => a.nickname.localeCompare(b.nickname, "es"));
  }

  // --- Llaves ---
  let bracket: Bracket | null = null;
  if (room.bracket_size > 0) {
    const { data: matchRows } = await db
      .from("matches").select("*").eq("room_id", room.id).order("round").order("slot");
    const totalRounds = Math.log2(room.bracket_size);

    const side = (playerId: string, team: string[] | null, average: number): MatchSide => {
      const pl = playerById.get(playerId);
      const members: TeamMember[] = [];
      for (const cat of team ?? []) {
        const pick = pickOf.get(`${playerId}|${cat}`);
        const mon = pick ? monBySlug.get(pick.pokemon_slug) : undefined;
        const category = catBySlug.get(cat);
        if (mon && category) members.push({ category, pokemon: view(mon), random: pick!.random });
      }
      return {
        player_id: playerId,
        nickname: pl?.nickname ?? "?",
        is_bot: pl?.is_bot ?? false,
        team: members,
        average: team && isHost ? Number(average) : null,
      };
    };

    const byRound = new Map<number, Match[]>();
    for (const m of matchRows ?? []) {
      // Un duelo sin revelar solo dice quien contra quien.
      const match: Match = {
        round: m.round,
        slot: m.slot,
        a: side(m.player_a, m.revealed ? m.team_a : null, m.avg_a),
        b: side(m.player_b, m.revealed ? m.team_b : null, m.avg_b),
        revealed: m.revealed,
        winner_id: m.revealed ? m.winner : null,
        tiebreak: m.revealed ? m.tiebreak : false,
      };
      if (!byRound.has(m.round)) byRound.set(m.round, []);
      byRound.get(m.round)!.push(match);
    }

    const bracketRounds: BracketRound[] = [];
    for (let r = 1; r <= totalRounds; r++) {
      const list = byRound.get(r) ?? [];
      bracketRounds.push({
        round: r,
        name: roundName(r, totalRounds),
        matches: list,
        pending_slots: room.bracket_size / 2 ** r - list.length,
      });
    }

    const final = byRound.get(totalRounds)?.[0];
    const champ = final?.revealed && final.winner_id ? playerById.get(final.winner_id) : undefined;

    bracket = {
      size: room.bracket_size,
      total_rounds: totalRounds,
      current_round: room.current_round,
      rounds: bracketRounds,
      champion: champ ? { player_id: champ.id, nickname: champ.nickname, is_bot: champ.is_bot } : null,
    };
  }

  return {
    room: {
      id: room.id,
      code: room.code,
      phase: room.phase,
      host_name: room.host_name,
      current_position: room.current_position,
      bracket_size: room.bracket_size,
      current_round: room.current_round,
      updated_at: room.updated_at,
    },
    isHost,
    me,
    players,
    rounds,
    picks,
    bracket,
  };
}
