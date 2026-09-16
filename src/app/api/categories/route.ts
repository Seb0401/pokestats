import { NextResponse } from "next/server";
import { admin } from "@/lib/supabase";
import { CATALOG_CACHE, handle } from "@/lib/http";

// Dinamica en el servidor (necesita la service role key en ejecucion), pero se
// cachea en el CDN: el catalogo es identico para todos.
export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    const { data, error } = await admin()
      .from("categories")
      .select("*")
      .order("grp")
      .order("name");
    if (error) throw new Error(error.message);
    return { categories: data ?? [] };
  }, CATALOG_CACHE);
}
