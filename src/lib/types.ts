export type Phase = "lobby" | "picking" | "bracket" | "finished";
export type CategoryState = "pending" | "open" | "revealed";
export type PokemonForm = "base" | "mega" | "gmax" | "regional" | "alt";
export type Profile = "fisico" | "especial" | "equilibrado";

/** Lo que cualquiera puede ver de un Pokemon: datos del juego, sin puntaje. */
export interface PokemonPublic {
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
}

/** Puntaje competitivo: solo lo recibe el anfitrion. */
export interface PokemonScore {
  usage_2024: number | null;
  usage_historic: number | null;
  usage_estimated: boolean;
  usage_score: number;
  stat_score: number;
  eligibility: number;
  battle_score: number;
  rank: number;
}

export type Pokemon = PokemonPublic & Partial<PokemonScore>;
export type ScoredPokemon = PokemonPublic & PokemonScore;

export const hasScore = (p: Pokemon): p is ScoredPokemon =>
  typeof p.battle_score === "number" || typeof p.battle_score === "string";

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
  is_bot: boolean;
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
  /** Se sorteo porque el jugador no eligio a tiempo (o es un bot). */
  random: boolean;
}

export interface TeamMember {
  category: Category;
  pokemon: Pokemon;
  random: boolean;
}

export interface MatchSide {
  player_id: string;
  nickname: string;
  is_bot: boolean;
  /** Equipo de hasta 6. Vacio mientras el duelo no se revele. */
  team: TeamMember[];
  /** Promedio del puntaje del equipo: solo lo recibe el anfitrion. */
  average: number | null;
}

export interface Match {
  round: number;
  slot: number;
  a: MatchSide;
  b: MatchSide;
  revealed: boolean;
  /** null mientras el duelo no se revele. */
  winner_id: string | null;
  /** Empate exacto de promedios resuelto al azar. */
  tiebreak: boolean;
}

export interface BracketRound {
  round: number;
  name: string;
  matches: Match[];
  /** Duelos que aun no existen porque la ronda anterior no termino. */
  pending_slots: number;
}

export interface Bracket {
  size: number;
  total_rounds: number;
  current_round: number;
  rounds: BracketRound[];
  champion: { player_id: string; nickname: string; is_bot: boolean } | null;
}

/** Lo que devuelve GET /api/rooms/[code]/state. */
export interface GameState {
  room: {
    id: string;
    code: string;
    phase: Phase;
    host_name: string;
    current_position: number;
    bracket_size: number;
    current_round: number;
    updated_at: string;
  };
  isHost: boolean;
  me: { id: string; nickname: string } | null;
  players: PlayerPublic[];
  rounds: RoundInfo[];
  /** Elecciones visibles: las reveladas por el anfitrion y siempre las propias. */
  picks: Record<string, RevealedPick[]>;
  /** Presente desde que se arman las llaves. */
  bracket: Bracket | null;
}
