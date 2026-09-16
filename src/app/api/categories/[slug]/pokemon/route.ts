import { admin } from "@/lib/supabase";
import { GameError } from "@/lib/game";
import { CATALOG_CACHE, handle } from "@/lib/http";
import type { Pokemon } from "@/lib/types";

// Dinamica en el servidor, cacheada en el CDN: el pool de una categoria es fijo.
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  return handle(async () => {
    const { slug } = await ctx.params;
    const db = admin();

    const { data: links, error } = await db
      .from("category_pokemon")
      .select("pokemon:pokemon_slug(*)")
      .eq("category_slug", slug);
    if (error) throw new GameError(error.message, 500);
    if (!links?.length) throw new GameError("Esa categoria no tiene candidatos.", 404);

    // Orden de Pokedex: es como la gente busca, no por puntaje.
    const pokemon = links
      .map((l) => l.pokemon as unknown as Pokemon)
      .filter(Boolean)
      .sort((a, b) => a.dex - b.dex || a.slug.localeCompare(b.slug));

    return { pokemon };
  }, CATALOG_CACHE);
}
