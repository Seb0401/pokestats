// Carga el catalogo directamente en Supabase usando la service role key de
// .env.local. Alternativa a pegar supabase/seed.sql en el SQL Editor.
//
//   node --env-file=.env.local scripts/upload-seed.mjs

import { createClient } from "@supabase/supabase-js";
import { buildData, pokemonRow } from "./build-seed.mjs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key || key.includes("...")) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

async function upsert(table, rows, onConflict, size = 500) {
  for (let i = 0; i < rows.length; i += size) {
    const { error } = await db.from(table).upsert(rows.slice(i, i + size), { onConflict });
    if (error) throw new Error(`${table}: ${error.message}`);
  }
  console.log(`  ${table}: ${rows.length} filas`);
}

const { mons, cats, members } = await buildData();

await upsert("pokemon", mons.map(pokemonRow), "slug");
await upsert("categories", cats.map((c) => ({
  slug: c.slug, name: c.name, emoji: c.emoji, grp: c.group,
  description: c.description, pool_size: c.poolSize,
})), "slug");

// Las relaciones se reemplazan enteras: una categoria pudo perder miembros.
const { error } = await db.from("category_pokemon").delete().neq("category_slug", "");
if (error) throw new Error(`category_pokemon: ${error.message}`);
await upsert("category_pokemon",
  members.map(([c, p]) => ({ category_slug: c, pokemon_slug: p })),
  "category_slug,pokemon_slug", 1000);

console.log("Catalogo cargado.");
