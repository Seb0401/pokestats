// Definicion de las categorias del cuadro de doble entrada.
// Cada categoria filtra la base `pokemon_competitive_analysis.csv`.
// `match(p)` recibe el registro ya normalizado (ver build-seed.mjs).

const range = (a, b) => (p) => p.dex >= a && p.dex <= b;
const anyOf = (...ids) => (p) => ids.includes(p.dex);
const inRanges = (...pairs) => (p) => pairs.some(([a, b]) => p.dex >= a && p.dex <= b);

// Las 9 lineas iniciales ocupan 9 numeros consecutivos de la Pokedex.
const STARTER_RANGES = [
  [1, 9], [152, 160], [252, 260], [387, 395], [495, 503],
  [650, 658], [722, 730], [810, 818], [906, 914],
];

const PSEUDO_FINALS = [149, 248, 373, 376, 445, 635, 706, 784, 887, 998];

const GENS = [
  ["i", "I", "Kanto"], ["ii", "II", "Johto"], ["iii", "III", "Hoenn"],
  ["iv", "IV", "Sinnoh"], ["v", "V", "Teselia"], ["vi", "VI", "Kalos"],
  ["vii", "VII", "Alola"], ["viii", "VIII", "Galar"], ["ix", "IX", "Paldea"],
];

const TYPES = [
  ["fire", "Fuego", "\u{1F525}"], ["water", "Agua", "\u{1F4A7}"], ["grass", "Planta", "\u{1F33F}"],
  ["electric", "El\u00e9ctrico", "\u26A1"], ["psychic", "Ps\u00edquico", "\u{1F52E}"], ["dragon", "Drag\u00f3n", "\u{1F409}"],
  ["dark", "Siniestro", "\u{1F311}"], ["fairy", "Hada", "\u2728"], ["steel", "Acero", "\u2699\uFE0F"],
  ["ghost", "Fantasma", "\u{1F47B}"], ["fighting", "Lucha", "\u{1F94A}"], ["ice", "Hielo", "\u2744\uFE0F"],
  ["ground", "Tierra", "\u{1F3DC}\uFE0F"], ["rock", "Roca", "\u{1FAA8}"], ["bug", "Bicho", "\u{1F41B}"],
  ["poison", "Veneno", "\u2620\uFE0F"], ["flying", "Volador", "\u{1FAB6}"], ["normal", "Normal", "\u{1F43E}"],
];

/**
 * Marca la forma canonica de cada numero de Pokedex: la que no lleva sufijo si
 * existe, o si no la primera que lista el CSV, que es la forma por defecto
 * (tornadus-incarnate, urshifu-single, ogerpon-teal, ho-oh...). Muta y devuelve
 * el arreglo, que debe venir en el orden del CSV.
 */
export function markCanonical(mons) {
  const byDex = new Map();
  for (const p of mons) {
    if (!byDex.has(p.dex)) byDex.set(p.dex, []);
    byDex.get(p.dex).push(p);
  }
  for (const group of byDex.values()) {
    const chosen = group.find((p) => !p.slug.includes("-")) ?? group[0];
    for (const p of group) p.canonical = p === chosen;
  }
  return mons;
}

// Unicas formas alternativas que se admiten entre los legendarios.
const GALAR_BIRDS = ["articuno-galar", "zapdos-galar", "moltres-galar"];

/** Solo la forma por defecto de cada especie: sin Megas, Gigamax ni variantes. */
const base = (fn) => (p) => p.canonical && fn(p);

/** Las categorias de iniciales no admiten Megas ni Gigamax. */
const noMegaGmax = (p) => p.form !== "mega" && p.form !== "gmax";

const starterSlot = (offsets) => (p) =>
  noMegaGmax(p) && STARTER_RANGES.some(([a]) => offsets.includes(p.dex - a));

const BASE_CATEGORIES = [
  {
    slug: "favorito-absoluto", name: "Pok\u00e9mon favorito absoluto", emoji: "\u2B50",
    group: "General", description: "Sin filtros. El que elegir\u00edas sobre todos los dem\u00e1s.",
    match: () => true,
  },
  {
    slug: "inicial", name: "Inicial favorito", emoji: "\u{1F95A}",
    group: "Cl\u00e1sicas", description: "Cualquier miembro de las 27 l\u00edneas iniciales, de Kanto a Paldea, sin Megas ni Gigamax.",
    match: (p) => noMegaGmax(p) && inRanges(...STARTER_RANGES)(p),
  },
  {
    slug: "legendario", name: "Legendario favorito", emoji: "\u{1F451}",
    group: "Cl\u00e1sicas",
    description: "Una forma por especie: sin Megas, Primigenios, Gigamax ni formas especiales. Las aves de Galar s\u00ed cuentan.",
    match: (p) => p.legendary && !p.mythical && (p.canonical || GALAR_BIRDS.includes(p.slug)),
  },
  {
    slug: "legendario-especial", name: "Legendario especial favorito", emoji: "\u{1F31F}",
    group: "Clásicas",
    description: "Formas alternativas de legendarios: Megas, Primigenios, Coronados, jinetes de Calyrex, modos de Koraidon y Miraidon, Gigamax y más.",
    // Complemento exacto de "legendario": lo que ahi se excluye, aqui entra.
    match: (p) => p.legendary && !p.mythical && !p.canonical && !GALAR_BIRDS.includes(p.slug),
  },
  {
    slug: "mitico", name: "M\u00edtico favorito", emoji: "\u{1F320}",
    group: "Cl\u00e1sicas", description: "Especies m\u00edticas. Ojo: el reglamento VGC las excluye, pagan penalizaci\u00f3n.",
    match: (p) => p.mythical,
  },
  {
    slug: "pseudolegendario", name: "Pseudolegendario favorito", emoji: "\u{1F5E1}\uFE0F",
    group: "Cl\u00e1sicas", description: "Las 10 etapas finales de 600 puntos base: Dragonite, Tyranitar, Garchomp...",
    match: anyOf(...PSEUDO_FINALS),
  },
  {
    slug: "inicial-planta", name: "Inicial de tipo Planta favorito", emoji: "",
    group: "Iniciales", description: "Las nueve líneas iniciales de tipo Planta, de Bulbasaur a Sprigatito, sin Megas ni Gigamax.",
    match: starterSlot([0, 1, 2]),
  },
  {
    slug: "inicial-fuego", name: "Inicial de tipo Fuego favorito", emoji: "",
    group: "Iniciales", description: "Las nueve líneas iniciales de tipo Fuego, de Charmander a Fuecoco, sin Megas ni Gigamax.",
    match: starterSlot([3, 4, 5]),
  },
  {
    slug: "inicial-agua", name: "Inicial de tipo Agua favorito", emoji: "",
    group: "Iniciales", description: "Las nueve líneas iniciales de tipo Agua, de Squirtle a Quaxly, sin Megas ni Gigamax.",
    match: starterSlot([6, 7, 8]),
  },
  {
    slug: "inicial-final", name: "Inicial en su etapa final favorito", emoji: "",
    group: "Iniciales", description: "Solo la última evolución de cada inicial, sin Megas ni Gigamax: Venusaur, Charizard, Typhlosion…",
    match: starterSlot([2, 5, 8]),
  },
  {
    slug: "legendario-portada", name: "Legendario de portada favorito", emoji: "",
    group: "Tríos y grupos",
    description: "Los legendarios que protagonizan la carátula de su juego: Lugia, Rayquaza, Dialga, Xerneas, Koraidon…",
    match: base(anyOf(249, 250, 382, 383, 384, 483, 484, 487, 643, 644, 646, 716, 717, 791, 792, 800, 888, 889, 1007, 1008)),
  },
  {
    slug: "trio-lagos", name: "Trío del lago favorito", emoji: "",
    group: "Tríos y grupos", description: "Uxie, Mesprit y Azelf, los guardianes de los lagos de Sinnoh.",
    match: range(480, 482),
  },
  {
    slug: "espadas-justicia", name: "Espada de la justicia favorita", emoji: "",
    group: "Tríos y grupos", description: "Cobalion, Terrakion, Virizion y Keldeo.",
    match: base(anyOf(638, 639, 640, 647)),
  },
  {
    slug: "fuerzas-naturaleza", name: "Fuerza de la naturaleza favorita", emoji: "",
    group: "Tríos y grupos", description: "Tornadus, Thundurus, Landorus y Enamorus en su forma Avatar.",
    match: base(anyOf(641, 642, 645, 905)),
  },
  {
    slug: "guardianes-alola", name: "Guardián de Alola favorito", emoji: "",
    group: "Tríos y grupos", description: "Tapu Koko, Tapu Lele, Tapu Bulu y Tapu Fini.",
    match: range(785, 788),
  },
  {
    slug: "tesoros-funestos", name: "Tesoro funesto favorito", emoji: "",
    group: "Tríos y grupos", description: "Wo-Chien, Chien-Pao, Ting-Lu y Chi-Yu, los legendarios ruinosos de Paldea.",
    match: range(1001, 1004),
  },
  {
    slug: "bebe", name: "Pokémon bebé favorito", emoji: "",
    group: "Especiales", description: "Pichu, Cleffa, Togepi, Munchlax, Riolu y el resto de preevoluciones bebé.",
    match: base(anyOf(172, 173, 174, 175, 236, 238, 239, 240, 298, 360, 406, 433, 438, 439, 440, 446, 447, 458, 848)),
  },
  {
    slug: "fosil", name: "Pokémon fósil favorito", emoji: "",
    group: "Especiales", description: "Revividos a partir de fósiles: Omanyte, Aerodactyl, Cranidos, Tyrunt, Dracozolt…",
    match: base(anyOf(
      138, 139, 140, 141, 142, 345, 346, 347, 348, 408, 409, 410, 411,
      564, 565, 566, 567, 696, 697, 698, 699, 880, 881, 882, 883,
    )),
  },
  {
    slug: "pikaclon", name: "Roedor eléctrico favorito", emoji: "",
    group: "Especiales", description: "La familia de Pikachu y sus parecidos: Plusle, Minun, Pachirisu, Dedenne, Pawmot…",
    match: base(anyOf(25, 26, 172, 311, 312, 417, 587, 702, 777, 877, 921, 922, 923)),
  },
  {
    slug: "trio-aves", name: "Tr\u00edo de aves legendarias", emoji: "\u{1F985}",
    group: "Tr\u00edos y grupos", description: "Articuno, Zapdos y Moltres, incluidas sus formas de Galar.",
    match: range(144, 146),
  },
  {
    slug: "trio-bestias", name: "Tr\u00edo de bestias legendarias", emoji: "\u{1F43A}",
    group: "Tr\u00edos y grupos", description: "Raikou, Entei y Suicune.",
    match: range(243, 245),
  },
  {
    slug: "trio-regis", name: "Gigante Regi favorito", emoji: "\u{1F5FF}",
    group: "Tr\u00edos y grupos", description: "Regirock, Regice, Registeel, Regigigas, Regieleki y Regidrago.",
    match: anyOf(377, 378, 379, 486, 894, 895),
  },
  {
    slug: "eeveelucion", name: "Eeveeluci\u00f3n favorita", emoji: "\u{1F98A}",
    group: "Tr\u00edos y grupos", description: "Eevee y sus ocho evoluciones.",
    match: anyOf(133, 134, 135, 136, 196, 197, 470, 471, 700),
  },
  {
    slug: "ultraente", name: "Ultra Ente favorito", emoji: "\u{1F6F8}",
    group: "Especiales", description: "Los Ultra Entes de la s\u00e9ptima generaci\u00f3n.",
    match: (p) => (p.dex >= 793 && p.dex <= 799) || (p.dex >= 803 && p.dex <= 806),
  },
  {
    slug: "paradoja", name: "Pok\u00e9mon parad\u00f3jico favorito", emoji: "\u{1F300}",
    group: "Especiales", description: "Las formas del pasado y del futuro de Paldea.",
    match: inRanges([984, 995], [1005, 1006], [1009, 1010], [1020, 1023]),
  },
  {
    slug: "mega", name: "Mega-Evoluci\u00f3n favorita", emoji: "\u{1F48E}",
    group: "Especiales", description: "Las 48 Mega-Evoluciones. No son legales en VGC 2024: su uso se estima.",
    match: (p) => p.form === "mega",
  },
  {
    slug: "gigamax", name: "Forma Gigamax favorita", emoji: "\u{1F3D7}\uFE0F",
    group: "Especiales", description: "Formas Gigamax de Galar. Su uso tambi\u00e9n se estima.",
    match: (p) => p.form === "gmax",
  },
  {
    slug: "regional", name: "Forma regional favorita", emoji: "\u{1F5FA}\uFE0F",
    group: "Especiales", description: "Variantes de Alola, Galar, Hisui y Paldea. Es la \u00fanica categor\u00eda donde aparecen, salvo las aves de Galar.",
    match: (p) => p.form === "regional",
  },
  {
    slug: "veloz", name: "Barrendero veloz favorito", emoji: "\u{1F4A8}",
    group: "Perfil", description: "Velocidad base de 100 o m\u00e1s: solo el 18.9% del cat\u00e1logo lo logra.",
    match: (p) => p.speed >= 100,
  },
  {
    slug: "muro", name: "Muro defensivo favorito", emoji: "\u{1F6E1}\uFE0F",
    group: "Perfil",
    description: "S\u00F3lido por las dos v\u00EDas: 90 o m\u00e1s de Defensa y de Defensa especial.",
    // Exigir ambas defensas evita que entren atacantes fr\u00e1giles por una sola cara.
    match: (p) => p.defense >= 90 && p.spDef >= 90,
  },
  {
    slug: "atacante-fisico", name: "Atacante f\u00edsico favorito", emoji: "\u{1F44A}",
    group: "Perfil", description: "Perfil f\u00edsico con ataque de 110 o m\u00e1s.",
    match: (p) => p.profile === "fisico" && p.attack >= 110,
  },
  {
    slug: "atacante-especial", name: "Atacante especial favorito", emoji: "\u{1F32A}\uFE0F",
    group: "Perfil", description: "Perfil especial con ataque especial de 110 o m\u00e1s.",
    match: (p) => p.profile === "especial" && p.spAtk >= 110,
  },
  {
    slug: "monotipo", name: "Monotipo favorito", emoji: "\u{1F7E6}",
    group: "Perfil", description: "Especies de un solo tipo elemental (48.8% de la muestra).",
    match: (p) => !p.type2,
  },
  ...GENS.map(([key, num, region]) => ({
    slug: `gen-${key}`,
    name: `Favorito de generaci\u00f3n ${num}`,
    emoji: "\u{1F3AE}",
    group: "Generaciones",
    description: `Una forma por especie introducida en ${region}: sin Megas, Gigamax ni formas especiales.`,
    match: base((p) => p.generation === `generation-${key}`),
  })),
  ...TYPES.map(([key, es, emoji]) => ({
    slug: `tipo-${key}`,
    name: `Favorito de tipo ${es}`,
    emoji,
    group: "Tipos",
    description: `Cualquier especie con ${es} como tipo primario o secundario.`,
    match: (p) => p.type1 === key || p.type2 === key,
  })),
];

// Las formas regionales solo compiten en "Forma regional favorita". Las aves de
// Galar son la excepcion pedida: tambien cuentan como legendarios y como trio.
const REGIONAL_HOME = new Set(["regional"]);
const GALAR_BIRD_HOMES = new Set(["legendario", "trio-aves"]);

export const CATEGORIES = BASE_CATEGORIES.map((c) => ({
  ...c,
  match: (p) => {
    if (p.form === "regional" && !REGIONAL_HOME.has(c.slug)) {
      if (!(GALAR_BIRD_HOMES.has(c.slug) && GALAR_BIRDS.includes(p.slug))) return false;
    }
    return c.match(p);
  },
}));
