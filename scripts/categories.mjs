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

export const CATEGORIES = [
  {
    slug: "favorito-absoluto", name: "Pok\u00e9mon favorito absoluto", emoji: "\u2B50",
    group: "General", description: "Sin filtros. El que elegir\u00edas sobre todos los dem\u00e1s.",
    match: () => true,
  },
  {
    slug: "inicial", name: "Inicial favorito", emoji: "\u{1F95A}",
    group: "Cl\u00e1sicas", description: "Cualquier miembro de las 27 l\u00edneas iniciales, de Kanto a Paldea.",
    match: inRanges(...STARTER_RANGES),
  },
  {
    slug: "legendario", name: "Legendario favorito", emoji: "\u{1F451}",
    group: "Cl\u00e1sicas", description: "Especies marcadas como legendarias en la base (117 registros).",
    match: (p) => p.legendary && !p.mythical,
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
    slug: "trio-aves", name: "Tr\u00edo de aves legendarias", emoji: "\u{1F985}",
    group: "Tr\u00edos", description: "Articuno, Zapdos y Moltres, incluidas sus formas de Galar.",
    match: range(144, 146),
  },
  {
    slug: "trio-bestias", name: "Tr\u00edo de bestias legendarias", emoji: "\u{1F43A}",
    group: "Tr\u00edos", description: "Raikou, Entei y Suicune.",
    match: range(243, 245),
  },
  {
    slug: "trio-regis", name: "Gigante Regi favorito", emoji: "\u{1F5FF}",
    group: "Tr\u00edos", description: "Regirock, Regice, Registeel, Regigigas, Regieleki y Regidrago.",
    match: anyOf(377, 378, 379, 486, 894, 895),
  },
  {
    slug: "eeveelucion", name: "Eeveeluci\u00f3n favorita", emoji: "\u{1F98A}",
    group: "Tr\u00edos", description: "Eevee y sus ocho evoluciones.",
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
    group: "Especiales", description: "Variantes de Alola, Galar, Hisui y Paldea.",
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
    description: `Especies introducidas en la generaci\u00f3n ${num} (${region}).`,
    match: (p) => p.generation === `generation-${key}`,
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
