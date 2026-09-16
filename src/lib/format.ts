import type { Pokemon } from "./types";

export const SPRITE_BASE =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";

/** Render de Pokemon HOME: cubre Megas, Gigamax y variantes regionales. */
export const spriteUrl = (p: Pick<Pokemon, "sprite_id">) =>
  `${SPRITE_BASE}/other/home/${p.sprite_id}.png`;

/** Sprite pixelado, ligero, para listas largas. */
export const iconUrl = (p: Pick<Pokemon, "sprite_id">) =>
  `${SPRITE_BASE}/${p.sprite_id}.png`;

export const TYPE_ES: Record<string, string> = {
  normal: "Normal", fire: "Fuego", water: "Agua", electric: "Eléctrico",
  grass: "Planta", ice: "Hielo", fighting: "Lucha", poison: "Veneno",
  ground: "Tierra", flying: "Volador", psychic: "Psíquico", bug: "Bicho",
  rock: "Roca", ghost: "Fantasma", dragon: "Dragón", dark: "Siniestro",
  steel: "Acero", fairy: "Hada",
};

export const GEN_ES: Record<string, string> = {
  "generation-i": "I", "generation-ii": "II", "generation-iii": "III",
  "generation-iv": "IV", "generation-v": "V", "generation-vi": "VI",
  "generation-vii": "VII", "generation-viii": "VIII", "generation-ix": "IX",
};

export const PROFILE_ES: Record<string, string> = {
  fisico: "Físico", especial: "Especial", equilibrado: "Equilibrado",
};

export const typeClass = (t: string) => `type-${t}`;

export const titleCase = (s: string) =>
  s.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

export const pct = (n: number | null | undefined, digits = 1) =>
  n == null ? "—" : `${n.toFixed(digits)}%`;

export const score = (n: number) => Number(n).toFixed(1);

/** Etiqueta corta de condición, para la esquina de la tarjeta. */
export function condition(p: Pokemon): { label: string; tone: string } | null {
  if (p.mythical) return { label: "Mítico", tone: "text-flare-400 border-flare-500/40 bg-flare-500/10" };
  if (p.legendary) return { label: "Legendario", tone: "text-volt-400 border-volt-500/40 bg-volt-500/10" };
  if (p.form === "mega") return { label: "Mega", tone: "text-aqua-400 border-aqua-500/40 bg-aqua-500/10" };
  if (p.form === "gmax") return { label: "Gigamax", tone: "text-aqua-400 border-aqua-500/40 bg-aqua-500/10" };
  if (p.form === "regional") return { label: "Regional", tone: "text-mint-400 border-mint-500/40 bg-mint-500/10" };
  return null;
}

/** Normaliza para buscar sin tildes ni mayúsculas. */
export const fold = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
