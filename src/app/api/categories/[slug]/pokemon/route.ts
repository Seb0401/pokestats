import { admin } from "@/lib/supabase";
import { GameError, publicPokemon } from "@/lib/game";
import { CATALOG_CACHE, handle } from "@/lib/http";
import type { Pokemon } from "@/lib/types";

// Dinamica en el servidor, cacheada en el CDN: el pool de una categoria es fijo.
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  return handle(async () => {
    const { slug } = await ctx.params;
    const { data: links, error } = await admin()
      .from("category_pokemon")
      .select("pokemon:pokemon_slug(*)")
      .eq("category_slug", slug);
    if (error) throw new GameError(error.message, 500);
    if (!links?.length) throw new GameError("Esa categoria no tiene candidatos.", 404);

    // Sin puntaje: es lo que decide los duelos y lo consulta quien esta eligiendo.
    // Orden de Pokedex, que es como la gente busca.
    const pokemon = links
      .map((l) => l.pokemon as unknown as Pokemon)
      .filter(Boolean)
      .sort((a, b) => a.dex - b.dex || a.slug.localeCompare(b.slug))
      .map(publicPokemon);

    return { pokemon };
  }, CATALOG_CACHE);
}
