import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `Falta la variable de entorno ${name}. Copia .env.example a .env.local y completala.`,
    );
  }
  return value;
}

/**
 * Cliente de servidor. Usa la service role key, de modo que ignora RLS: es el
 * unico camino por el que se escribe y el unico que puede leer `picks`.
 * Nunca debe importarse desde un componente cliente.
 */
export function admin(): SupabaseClient {
  return createClient(
    required(url, "NEXT_PUBLIC_SUPABASE_URL"),
    required(process.env.SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

let browserClient: SupabaseClient | null = null;

/**
 * Cliente de navegador. Solo se usa para suscribirse a Realtime sobre las tres
 * tablas publicas; los datos de verdad llegan por las route handlers.
 */
export function browser(): SupabaseClient {
  if (!browserClient) {
    browserClient = createClient(
      required(url, "NEXT_PUBLIC_SUPABASE_URL"),
      required(anonKey, "NEXT_PUBLIC_SUPABASE_ANON_KEY"),
      { auth: { persistSession: false }, realtime: { params: { eventsPerSecond: 10 } } },
    );
  }
  return browserClient;
}
