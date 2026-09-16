"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { browser } from "./supabase";
import type { Category, GameState, Pokemon } from "./types";

// --- Credenciales -----------------------------------------------------------

const hostKey = (code: string) => `pokestats:host:${code}`;
const playerKey = (code: string) => `pokestats:player:${code}`;

type Store = "local" | "session";

const storage = (kind: Store): Storage | null => {
  try { return kind === "local" ? window.localStorage : window.sessionStorage; } catch { return null; }
};
const read = (kind: Store, k: string) => {
  try { return storage(kind)?.getItem(k) ?? null; } catch { return null; }
};
const write = (kind: Store, k: string, v: string) => {
  try { storage(kind)?.setItem(k, v); } catch { /* modo privado */ }
};

// El anfitrion es uno por sala: su credencial vive en localStorage para que
// sobreviva a recargas y a abrir la consola en otra pestaña.
export const getHostToken = (code: string) => read("local", hostKey(code));
export const setHostToken = (code: string, t: string) => write("local", hostKey(code), t);

// Cada pestaña es un jugador distinto: localStorage lo comparten todas las
// pestañas del navegador, y un segundo jugador pisaba la credencial del primero.
// La credencial vive en sessionStorage (por pestaña). La copia en localStorage
// solo sirve para recuperar la sesion si se cierra la pestaña y se vuelve a abrir.
export const getPlayerToken = (code: string) =>
  read("session", playerKey(code)) ?? read("local", playerKey(code));
export const setPlayerToken = (code: string, t: string) => {
  write("session", playerKey(code), t);
  write("local", playerKey(code), t);
};

/** Quien mira la sala. Cada pantalla envia solo la credencial de su rol. */
export type Role = "host" | "player";

// --- Fetch ------------------------------------------------------------------

export class ApiError extends Error {}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(json?.error ?? `Error ${res.status}`);
  return json as T;
}

/**
 * Enviar ambas credenciales hacia que una pestaña de jugador, abierta en el mismo
 * navegador donde se creo la sala, recibiera la vista del anfitrion con puntajes.
 */
function authHeaders(code: string, role: Role): Record<string, string> {
  const h: Record<string, string> = { "content-type": "application/json" };
  const credential = role === "host" ? getHostToken(code) : getPlayerToken(code);
  if (credential) h[role === "host" ? "x-host-token" : "x-player-token"] = credential;
  return h;
}

export const api = {
  categories: () => request<{ categories: Category[] }>("/api/categories"),

  pool: (slug: string) =>
    request<{ pokemon: Pokemon[] }>(`/api/categories/${slug}/pokemon`),

  createRoom: (payload: { hostName: string; categories: string[] }) =>
    request<{ code: string; hostToken: string }>("/api/rooms", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }),

  join: (code: string, nickname: string) =>
    request<{ playerId: string; nickname: string; playerToken: string }>(
      `/api/rooms/${code}/join`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nickname }),
      },
    ),

  state: (code: string, role: Role) =>
    request<GameState>(`/api/rooms/${code}/state`, {
      headers: authHeaders(code, role),
      cache: "no-store",
    }),

  pick: (code: string, pokemon: string) =>
    request<{ ok: true }>(`/api/rooms/${code}/pick`, {
      method: "POST",
      headers: authHeaders(code, "player"),
      body: JSON.stringify({ pokemon }),
    }),

  host: (code: string, action: string) =>
    request<Record<string, unknown>>(`/api/rooms/${code}/host`, {
      method: "POST",
      headers: authHeaders(code, "host"),
      body: JSON.stringify({ action }),
    }),
};

// --- Estado en vivo ---------------------------------------------------------

/**
 * Mantiene el estado de la sala sincronizado.
 *
 * Realtime solo avisa de que "algo cambio" en rooms/players/room_categories:
 * el estado real se vuelve a pedir al servidor, que es quien decide que puede
 * ver cada quien. Las elecciones nunca viajan por el canal de Realtime, asi que
 * suscribirse no permite espiar lo que los demas eligieron.
 *
 * El sondeo de respaldo cubre el caso de que el websocket se caiga.
 */
export function useGameState(code: string, role: Role, pollMs = 6000) {
  const [state, setState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const pending = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current) { pending.current = true; return; }
    inFlight.current = true;
    try {
      setState(await api.state(code, role));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar la sala.");
    } finally {
      inFlight.current = false;
      if (pending.current) { pending.current = false; void refresh(); }
    }
  }, [code, role]);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), pollMs);
    return () => clearInterval(timer);
  }, [pollMs, refresh]);

  // La suscripcion espera a conocer el id de la sala para filtrar por ella: sin
  // filtro, cada partida abierta despertaria a todas las demas.
  const roomId = state?.room.id;
  useEffect(() => {
    if (!roomId) return;
    let channel: ReturnType<ReturnType<typeof browser>["channel"]> | null = null;
    try {
      const supabase = browser();
      const filter = `room_id=eq.${roomId}`;
      channel = supabase
        .channel(`sala-${roomId}`)
        .on("postgres_changes",
          { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` },
          () => void refresh())
        .on("postgres_changes",
          { event: "*", schema: "public", table: "room_categories", filter },
          () => void refresh())
        .on("postgres_changes",
          { event: "*", schema: "public", table: "players", filter },
          () => void refresh());
      channel.subscribe();
    } catch {
      // Sin Realtime configurado, el sondeo de arriba mantiene la sala viva.
    }
    return () => { if (channel) void browser().removeChannel(channel); };
  }, [roomId, refresh]);

  return { state, error, refresh };
}
