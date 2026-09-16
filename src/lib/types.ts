export type Phase = "lobby" | "picking" | "battle" | "finished";
export type CategoryState = "pending" | "open" | "revealed";
export type PokemonForm = "base" | "mega" | "gmax" | "regional" | "alt";
export type Profile = "fisico" | "especial" | "equilibrado";

export interface Pokemon {
  slug: string;
  dex: number;
  name: string;
  form: PokemonForm;
  type1: string;
  type2: string | null;
  ability1: string | null;
  ability_hidden: string | null;
  hp: number;
  attack: number;
  defense: number;
  sp_atk: number;
  sp_def: number;
  speed: number;
  total_stats: number;
  legendary: boolean;
  mythical: boolean;
  generation: string;
  profile: Profile;
  dual_type: boolean;
  sprite_id: number;
  usage_2024: number | null;
  usage_historic: number | null;
  usage_estimated: boolean;
  usage_score: number;
  stat_score: number;
  eligibility: number;
  battle_score: number;
  rank: number;
}

export interface Category {
  slug: string;
  name: string;
  emoji: string;
  grp: string;
  description: string;
  pool_size: number;
}

export interface PlayerPublic {
  id: string;
  nickname: string;
  joined_at: string;
}

export interface RoundInfo {
  position: number;
  category: Category;
  state: CategoryState;
  picked_count: number;
}

/** Una eleccion ya revelada (o la propia del jugador). */
export interface RevealedPick {
  player_id: string;
  nickname: string;
  pokemon: Pokemon;
}

/** Resultado de una ronda de batalla, ya ordenado de mejor a peor. */
export interface BattleStanding {
  player_id: string;
  nickname: string;
  pokemon: Pokemon | null;
  points: number;
  won: boolean;
}

export interface BattleRound {
  index: number;
  category: Category;
  revealed: boolean;
  standings: BattleStanding[];
}

export interface LeaderboardRow {
  player_id: string;
  nickname: string;
  total: number;
  wins: number;
}

/** Lo que devuelve GET /api/rooms/[code]/state. */
export interface GameState {
  room: {
    id: string;
    code: string;
    phase: Phase;
    host_name: string;
    current_position: number;
    battle_rounds: number;
    battle_revealed: number;
    updated_at: string;
  };
  isHost: boolean;
  me: { id: string; nickname: string } | null;
  players: PlayerPublic[];
  rounds: RoundInfo[];
  /** Elecciones visibles: las reveladas por el anfitrion y siempre las propias. */
  picks: Record<string, RevealedPick[]>;
  /** Solo presente cuando la partida esta en fase de batalla o terminada. */
  battle: BattleRound[] | null;
  leaderboard: LeaderboardRow[];
}
