// Lee data/pokemon_competitive_analysis.csv, calcula el puntaje competitivo de
// cada forma, resuelve el id de sprite en PokeAPI y escribe supabase/seed.sql.
//
//   node scripts/build-seed.mjs
//
// Usa una cache local de ids de PokeAPI (scripts/.pokeapi-ids.json) para poder
// regenerar el seed sin conexion.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { CATEGORIES } from "./categories.mjs";
import {
  blendUsage, usageToScore, statComponents, statScore,
  eligibilityFactor, buildUsageEstimator, finalScore,
} from "./scoring.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CSV = path.join(ROOT, "data", "pokemon_competitive_analysis.csv");
const ID_CACHE = path.join(ROOT, "scripts", ".pokeapi-ids.json");
const OUT_SQL = path.join(ROOT, "supabase", "seed.sql");

const SPRITE_BASE =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";

// --- CSV ---------------------------------------------------------------

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const head = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const cells = line.split(",");
    return Object.fromEntries(head.map((h, i) => [h, (cells[i] ?? "").trim()]));
  });
}

const num = (v) => {
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

// --- Nombres y formas --------------------------------------------------

const REGIONS = { alola: "de Alola", galar: "de Galar", hisui: "de Hisui", paldea: "de Paldea" };

const WORD_FIXES = {
  mega: "Mega", gmax: "Gigamax", eternamax: "Eternamax",
  x: "X", y: "Y", f: "Hembra", m: "Macho",
};

function classifyForm(slug) {
  if (slug.includes("-gmax") || slug.includes("-eternamax")) return "gmax";
  if (/-mega(-|$)/.test(slug)) return "mega";
  for (const r of Object.keys(REGIONS)) if (slug.includes("-" + r)) return "regional";
  if (slug.includes("-")) return "alt";
  return "base";
}

const cap = (w) => WORD_FIXES[w] ?? w.replace(/^./, (c) => c.toUpperCase());

function displayName(slug, form) {
  const parts = slug.split("-");
  const head = parts[0].replace(/^./, (c) => c.toUpperCase());
  if (parts.length === 1) return head;
  const rest = parts.slice(1);

  if (form === "regional") {
    const region = rest.find((r) => REGIONS[r]);
    const extra = rest.filter((r) => r !== region);
    const tail = extra.length ? " " + extra.map(cap).join(" ") : "";
    return head + " " + REGIONS[region] + tail;
  }
  return head + " " + rest.map(cap).join(" ");
}

// --- Ids de sprite -----------------------------------------------------

// El CSV usa nombres de forma que no coinciden con el slug de PokeAPI. Los que
// no se resuelven por prefijo se mapean a mano.
const SPRITE_ALIASES = {
  "gastrodon-west": "gastrodon",
  "gastrodon-east": "gastrodon",
  "zygarde-10%": "zygarde-10",
  "zygarde-10%-power-construct": "zygarde-10-power-construct",
  "zygarde-50%-power-construct": "zygarde-50-power-construct",
  "necrozma-dusk-mane": "necrozma-dusk",
  "necrozma-dawn-wings": "necrozma-dawn",
  "calyrex-ice-rider": "calyrex-ice",
  "calyrex-shadow-rider": "calyrex-shadow",
  "oinkologne-f": "oinkologne-female",
  "maushold-four": "maushold-family-of-four",
  "maushold-three": "maushold-family-of-three",
  "ogerpon-teal": "ogerpon",
  nidoranf: "nidoran-f",
  nidoranm: "nidoran-m",
};

/**
 * Resuelve el slug del CSV contra el indice de PokeAPI en tres pasos: alias
 * explicito, coincidencia exacta y, por ultimo, la primera forma que extiende
 * el slug (PokeAPI lista la forma por defecto primero: "aegislash" ->
 * "aegislash-shield", "darmanitan" -> "darmanitan-standard").
 */
function lookupSpriteId(slug, map) {
  const alias = SPRITE_ALIASES[slug];
  if (alias && map[alias] != null) return map[alias];
  if (map[slug] != null) return map[slug];

  const prefix = slug + "-";
  let best = null;
  for (const key of Object.keys(map)) {
    if (!key.startsWith(prefix)) continue;
    if (best === null || map[key] < map[best]) best = key;
  }
  return best ? map[best] : null;
}

async function resolveSpriteIds(entries) {
  let map = {};
  if (fs.existsSync(ID_CACHE)) {
    map = JSON.parse(fs.readFileSync(ID_CACHE, "utf8"));
  } else {
    process.stdout.write("Descargando indice de PokeAPI... ");
    const res = await fetch("https://pokeapi.co/api/v2/pokemon?limit=3000");
    if (!res.ok) throw new Error("PokeAPI respondio " + res.status);
    const json = await res.json();
    for (const r of json.results) {
      map[r.name] = Number(r.url.split("/").filter(Boolean).pop());
    }
    fs.writeFileSync(ID_CACHE, JSON.stringify(map));
    console.log(Object.keys(map).length + " entradas cacheadas");
  }

  const missing = [];
  const out = new Map();
  for (const { slug, dex } of entries) {
    const id = lookupSpriteId(slug, map);
    if (id != null) {
      out.set(slug, id);
    } else {
      // Fallback: el numero de Pokedex siempre tiene sprite, aunque sea el de
      // la forma base. Preferible a dejar la tarjeta sin imagen.
      out.set(slug, dex);
      missing.push(slug);
    }
  }
  if (missing.length) {
    console.warn("  " + missing.length + " formas sin id propio, usan el sprite base:");
    console.warn("  " + missing.slice(0, 12).join(", ") + (missing.length > 12 ? " ..." : ""));
  }
  return out;
}

// --- Normalizacion -----------------------------------------------------

function normalize(row) {
  const slug = row.name;
  const form = classifyForm(slug);
  const type2 = row.type2 && row.type2 !== "No_type" ? row.type2 : null;
  const attack = Number(row.attack);
  const spAtk = Number(row.sp_atk);
  const hi = Math.max(attack, spAtk);
  const lo = Math.min(attack, spAtk);
  // Umbral del 10% para no leer diferencias triviales como especializacion.
  const profile = hi > lo * 1.1 ? (attack > spAtk ? "fisico" : "especial") : "equilibrado";
  const hidden = (row.hidden_ability || "").trim();

  return {
    slug,
    dex: Number(row.index),
    name: displayName(slug, form),
    form,
    type1: row.type1,
    type2,
    ability1: row.ability1 !== "No_ability" ? row.ability1 : null,
    abilityHidden: hidden && hidden !== "None" && hidden !== "No_ability" ? hidden : null,
    hp: Number(row.hp),
    attack,
    defense: Number(row.defense),
    spAtk,
    spDef: Number(row.sp_def),
    speed: Number(row.speed),
    total: Number(row.total_stats),
    legendary: row.legendary === "True",
    mythical: row.mythical === "True",
    generation: row.generation,
    profile,
    dual: Boolean(type2),
    usage: {
      smogon2022: num(row.Smogon_VGC_Usage_2022),
      smogon2023: num(row.Smogon_VGC_Usage_2023),
      smogon2024: num(row.Smogon_VGC_Usage_2024),
      worlds2022: num(row.Worlds_VGC_Usage_2022),
      worlds2023: num(row.Worlds_VGC_Usage_2023),
      worlds2024: num(row.Worlds_VGC_Usage_2024),
    },
  };
}

function computeScores(mons) {
  // Paso 1: uso observado de las formas que si pueden competir en VGC 2024.
  for (const p of mons) {
    const u = p.usage;
    p.usage2024 = blendUsage(u.smogon2024, u.worlds2024);
    p.usageHistoric = Math.max(
      blendUsage(u.smogon2023, u.worlds2023),
      blendUsage(u.smogon2022, u.worlds2022),
    );
    // El ano en curso manda; el historico solo sostiene a quien ya fue relevante.
    p.usageBlend = 0.8 * p.usage2024 + 0.2 * p.usageHistoric;
    p.usageScore = usageToScore(p.usageBlend);
    // Mega y Gigamax no son legales en VGC 2024: su cero no es un cero medido
    // sino un dato ausente, y se estima mas abajo.
    p.usageEstimated = p.form === "mega" || p.form === "gmax";
  }

  // Paso 2: modelo de estimacion ajustado sobre las formas elegibles.
  const estimate = buildUsageEstimator(mons.filter((p) => !p.usageEstimated));

  for (const p of mons) {
    if (p.usageEstimated) {
      p.usageScore = estimate(p);
      p.usageBlend = null;
    }
    p.stats = statComponents(p);
    p.statScore = statScore(p);
    p.eligibility = eligibilityFactor(p);
    p.score = finalScore({
      usageScore: p.usageScore,
      statScoreValue: p.statScore,
      eligibility: p.eligibility,
    });
  }

  // Rank global: sirve de desempate y se muestra como "#12 de 1303".
  const sorted = [...mons].sort((a, b) => b.score - a.score || a.dex - b.dex);
  sorted.forEach((p, i) => { p.rank = i + 1; });
  return mons;
}

// --- SQL ---------------------------------------------------------------

const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

function q(v) {
  if (v === null || v === undefined) return "null";
  if (typeof v === "number") return Number.isFinite(v) ? String(round(v, 4)) : "null";
  if (typeof v === "boolean") return v ? "true" : "false";
  return "'" + String(v).split("'").join("''") + "'";
}

function buildSql(mons, categories, members) {
  const out = [];
  out.push("-- Generado por scripts/build-seed.mjs. No editar a mano.");
  out.push("-- Fuente: data/pokemon_competitive_analysis.csv (PokeAPI + Smogon VGC 2022-2024).");
  out.push("");
  out.push("truncate table public.category_pokemon, public.categories, public.pokemon restart identity cascade;");
  out.push("");

  out.push("insert into public.pokemon");
  out.push("  (slug, dex, name, form, type1, type2, ability1, ability_hidden,");
  out.push("   hp, attack, defense, sp_atk, sp_def, speed, total_stats,");
  out.push("   legendary, mythical, generation, profile, dual_type,");
  out.push("   sprite_id, usage_2024, usage_historic, usage_estimated,");
  out.push("   usage_score, stat_score, eligibility, battle_score, rank)");
  out.push("values");
  out.push(mons.map((p) => "(" + [
    p.slug, p.dex, p.name, p.form, p.type1, p.type2, p.ability1, p.abilityHidden,
    p.hp, p.attack, p.defense, p.spAtk, p.spDef, p.speed, p.total,
    p.legendary, p.mythical, p.generation, p.profile, p.dual,
    p.spriteId, p.usageBlend, p.usageHistoric, p.usageEstimated,
    p.usageScore, p.statScore, p.eligibility, p.score, p.rank,
  ].map(q).join(",") + ")").join(",\n") + ";");
  out.push("");

  out.push("insert into public.categories (slug, name, emoji, grp, description, pool_size)");
  out.push("values");
  out.push(categories.map((c) => "(" + [
    c.slug, c.name, c.emoji, c.group, c.description, c.poolSize,
  ].map(q).join(",") + ")").join(",\n") + ";");
  out.push("");

  out.push("insert into public.category_pokemon (category_slug, pokemon_slug)");
  out.push("values");
  out.push(members.map(([c, p]) => "(" + q(c) + "," + q(p) + ")").join(",\n") + ";");
  out.push("");

  return out.join("\n");
}

// --- Main --------------------------------------------------------------

/** Lee el CSV y devuelve todo lo que va a la base, ya puntuado. */
export async function buildData() {
  const mons = parseCsv(fs.readFileSync(CSV, "utf8")).map(normalize);
  console.log("Leidos " + mons.length + " registros.");

  const ids = await resolveSpriteIds(mons.map((p) => ({ slug: p.slug, dex: p.dex })));
  for (const p of mons) p.spriteId = ids.get(p.slug);

  computeScores(mons);

  const cats = [];
  const members = [];
  for (const c of CATEGORIES) {
    const pool = mons.filter((p) => c.match(p));
    if (pool.length < 2) {
      console.warn('  Categoria "' + c.slug + '" descartada: ' + pool.length + " candidato(s).");
      continue;
    }
    cats.push({ ...c, poolSize: pool.length });
    for (const p of pool) members.push([c.slug, p.slug]);
  }
  return { mons, cats, members };
}

/** Fila de `public.pokemon` tal como la espera el esquema. */
export function pokemonRow(p) {
  const r2 = (n) => (n == null ? null : Math.round(n * 10000) / 10000);
  return {
    slug: p.slug, dex: p.dex, name: p.name, form: p.form,
    type1: p.type1, type2: p.type2, ability1: p.ability1, ability_hidden: p.abilityHidden,
    hp: p.hp, attack: p.attack, defense: p.defense, sp_atk: p.spAtk, sp_def: p.spDef,
    speed: p.speed, total_stats: p.total, legendary: p.legendary, mythical: p.mythical,
    generation: p.generation, profile: p.profile, dual_type: p.dual, sprite_id: p.spriteId,
    usage_2024: r2(p.usageBlend), usage_historic: r2(p.usageHistoric),
    usage_estimated: p.usageEstimated, usage_score: r2(p.usageScore),
    stat_score: r2(p.statScore), eligibility: p.eligibility,
    battle_score: r2(p.score), rank: p.rank,
  };
}

async function main() {
  const { mons, cats, members } = await buildData();

  fs.mkdirSync(path.dirname(OUT_SQL), { recursive: true });
  fs.writeFileSync(OUT_SQL, buildSql(mons, cats, members), "utf8");

  console.log("\nsupabase/seed.sql escrito:");
  console.log("  " + mons.length + " pokemon, " + cats.length + " categorias, " +
    members.length + " relaciones");
  console.log("  " + (fs.statSync(OUT_SQL).size / 1024 / 1024).toFixed(2) + " MB\n");

  console.log("Top 15 por puntaje competitivo:");
  for (const p of [...mons].sort((a, b) => b.score - a.score).slice(0, 15)) {
    const flag = p.usageEstimated ? "~" : " ";
    console.log(
      "  " + String(p.rank).padStart(4) + ". " + p.name.padEnd(24) +
      " score " + round(p.score, 1).toFixed(1).padStart(5) +
      "   uso" + flag + (p.usageBlend ?? 0).toFixed(1).padStart(5) + "%" +
      "   BST " + String(p.total).padStart(3),
    );
  }

  const megas = mons.filter((p) => p.form === "mega").sort((a, b) => b.score - a.score);
  console.log("\nTop 5 Mega-Evoluciones (uso estimado):");
  for (const p of megas.slice(0, 5)) {
    console.log("  #" + String(p.rank).padStart(4) + "  " + p.name.padEnd(24) +
      " score " + round(p.score, 1).toFixed(1).padStart(5) + "   BST " + p.total);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
