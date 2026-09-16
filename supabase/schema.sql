-- PokeStats - esquema de base de datos
-- Ejecutar en Supabase > SQL Editor ANTES de supabase/seed.sql

-- ---------------------------------------------------------------------------
-- Catalogo (solo lectura para los clientes)
-- ---------------------------------------------------------------------------

create table if not exists public.pokemon (
  slug            text primary key,
  dex             int  not null,
  name            text not null,
  form            text not null check (form in ('base','mega','gmax','regional','alt')),
  type1           text not null,
  type2           text,
  ability1        text,
  ability_hidden  text,
  hp              int not null,
  attack          int not null,
  defense         int not null,
  sp_atk          int not null,
  sp_def          int not null,
  speed           int not null,
  total_stats     int not null,
  legendary       boolean not null default false,
  mythical        boolean not null default false,
  generation      text not null,
  profile         text not null check (profile in ('fisico','especial','equilibrado')),
  dual_type       boolean not null default false,
  sprite_id       int not null,
  -- Uso VGC mezclado 0.65 Smogon + 0.35 Worlds. null = forma no elegible,
  -- su uso se estimo a partir del modelo BST -> uso de esta misma base.
  usage_2024      numeric,
  usage_historic  numeric,
  usage_estimated boolean not null default false,
  usage_score     numeric not null,
  stat_score      numeric not null,
  eligibility     numeric not null,
  battle_score    numeric not null,
  rank            int not null
);

create index if not exists pokemon_name_idx  on public.pokemon using gin (to_tsvector('simple', name));
create index if not exists pokemon_score_idx on public.pokemon (battle_score desc);
create index if not exists pokemon_dex_idx   on public.pokemon (dex);

create table if not exists public.categories (
  slug        text primary key,
  name        text not null,
  emoji       text not null,
  grp         text not null,
  description text not null,
  pool_size   int  not null
);

create table if not exists public.category_pokemon (
  category_slug text not null references public.categories(slug) on delete cascade,
  pokemon_slug  text not null references public.pokemon(slug)    on delete cascade,
  primary key (category_slug, pokemon_slug)
);

create index if not exists category_pokemon_cat_idx on public.category_pokemon (category_slug);

-- ---------------------------------------------------------------------------
-- Partida
-- ---------------------------------------------------------------------------

create table if not exists public.rooms (
  id                 uuid primary key default gen_random_uuid(),
  code               text not null unique check (code ~ '^[0-9]{6}$'),
  host_token         text not null,
  host_name          text not null default 'Anfitrion',
  -- lobby -> picking -> battle -> finished
  phase              text not null default 'lobby'
                     check (phase in ('lobby','picking','battle','finished')),
  current_position   int  not null default 0,
  -- Cuantas categorias se sortean para la batalla final.
  battle_rounds      int  not null default 3 check (battle_rounds between 1 and 10),
  -- Categorias sorteadas, en orden de enfrentamiento. Se llena al pasar a 'battle'.
  battle_categories  text[] not null default '{}',
  -- Cuantas rondas de batalla ya se revelaron.
  battle_revealed    int  not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists rooms_code_idx on public.rooms (code);

create table if not exists public.room_categories (
  room_id       uuid not null references public.rooms(id) on delete cascade,
  position      int  not null,
  category_slug text not null references public.categories(slug),
  -- pending: aun no toca | open: aceptando elecciones | revealed: mostrada
  state         text not null default 'pending'
                check (state in ('pending','open','revealed')),
  -- Contador publico: permite mostrar "4/5 ya eligieron" sin filtrar QUE eligieron.
  picked_count  int  not null default 0,
  primary key (room_id, position)
);

create table if not exists public.players (
  id         uuid primary key default gen_random_uuid(),
  room_id    uuid not null references public.rooms(id) on delete cascade,
  nickname   text not null check (char_length(nickname) between 1 and 20),
  token      text not null,
  connected  boolean not null default true,
  joined_at  timestamptz not null default now(),
  unique (room_id, nickname)
);

create index if not exists players_room_idx  on public.players (room_id);
create index if not exists players_token_idx on public.players (token);

create table if not exists public.picks (
  room_id       uuid not null references public.rooms(id) on delete cascade,
  player_id     uuid not null references public.players(id) on delete cascade,
  category_slug text not null references public.categories(slug),
  pokemon_slug  text not null references public.pokemon(slug),
  created_at    timestamptz not null default now(),
  primary key (room_id, player_id, category_slug)
);

create index if not exists picks_room_cat_idx on public.picks (room_id, category_slug);

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- Regla: el catalogo y el estado no sensible se leen con la clave anonima (eso
-- alimenta Realtime). La tabla `picks` NO es legible desde el cliente: revelaria
-- las elecciones antes de tiempo. Toda escritura pasa por las route handlers de
-- Next.js, que usan la service role key y validan el token de anfitrion o de
-- jugador.
-- ---------------------------------------------------------------------------

alter table public.pokemon          enable row level security;
alter table public.categories       enable row level security;
alter table public.category_pokemon enable row level security;
alter table public.rooms            enable row level security;
alter table public.room_categories  enable row level security;
alter table public.players          enable row level security;
alter table public.picks            enable row level security;

drop policy if exists "catalogo legible" on public.pokemon;
create policy "catalogo legible" on public.pokemon for select using (true);

drop policy if exists "categorias legibles" on public.categories;
create policy "categorias legibles" on public.categories for select using (true);

drop policy if exists "relaciones legibles" on public.category_pokemon;
create policy "relaciones legibles" on public.category_pokemon for select using (true);

drop policy if exists "salas legibles" on public.rooms;
create policy "salas legibles" on public.rooms for select using (true);

drop policy if exists "categorias de sala legibles" on public.room_categories;
create policy "categorias de sala legibles" on public.room_categories for select using (true);

drop policy if exists "jugadores legibles" on public.players;
create policy "jugadores legibles" on public.players for select using (true);

-- Sin politica de select: `picks` solo es accesible con la service role key.

-- Las filas de rooms y players son legibles, pero sus credenciales no: con
-- `host_token` o `players.token` cualquiera podria suplantar al anfitrion o a
-- otro jugador. Se retira el select de tabla y se concede columna por columna.
-- Realtime respeta estos permisos y omite las columnas no concedidas.
revoke select on public.rooms   from anon, authenticated;
revoke select on public.players from anon, authenticated;
grant select (id, code, host_name, phase, current_position, battle_rounds,
              battle_categories, battle_revealed, created_at, updated_at)
  on public.rooms to anon, authenticated;
grant select (id, room_id, nickname, connected, joined_at)
  on public.players to anon, authenticated;

-- Ninguna tabla tiene politica de insert/update/delete: las escrituras solo
-- ocurren desde el servidor, que ignora RLS por usar la service role key.

-- ---------------------------------------------------------------------------
-- Realtime: los clientes se suscriben a estas tres tablas y, ante cualquier
-- cambio, vuelven a pedir el estado a /api/rooms/[code]/state.
-- ---------------------------------------------------------------------------

-- Idempotente: volver a ejecutar el esquema no debe fallar por duplicado.
do $$
declare t text;
begin
  foreach t in array array['rooms', 'room_categories', 'players'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- `updated_at` automatico en rooms, para que cualquier cambio dispare un evento.
create or replace function public.touch_room()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists rooms_touch on public.rooms;
create trigger rooms_touch before update on public.rooms
  for each row execute function public.touch_room();
