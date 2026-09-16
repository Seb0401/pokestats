import { NextResponse } from "next/server";
import { GameError } from "./game";

export const HOST_HEADER = "x-host-token";
export const PLAYER_HEADER = "x-player-token";

/** Cabecera para el catalogo, que es identico para todos y no cambia entre partidas. */
export const CATALOG_CACHE = {
  "cache-control": "public, s-maxage=86400, stale-while-revalidate=604800",
};

/** Envuelve una route handler y traduce GameError a una respuesta con codigo. */
export async function handle<T>(fn: () => Promise<T>, headers?: HeadersInit) {
  try {
    return NextResponse.json(await fn(), headers ? { headers } : undefined);
  } catch (e) {
    if (e instanceof GameError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    const message = e instanceof Error ? e.message : "Error inesperado.";
    console.error("[pokestats]", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export function normalizeCode(code: string) {
  const clean = code.replace(/\D/g, "");
  if (clean.length !== 6) throw new GameError("El codigo de sala son 6 digitos.", 400);
  return clean;
}

export async function body<T extends Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new GameError("Cuerpo de la peticion invalido.", 400);
  }
}
