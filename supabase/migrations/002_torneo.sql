-- Migracion 1 de 2: agrega lo que necesita el torneo por llaves sin quitar nada.
--
-- Es compatible hacia atras: la version anterior de la app (sorteo de rondas con
-- marcador) sigue funcionando con este esquema, asi que se puede aplicar antes de
-- desplegar. Una vez desplegada la version nueva, aplicar 003_limpieza.sql.
-- Una base nueva solo necesita schema.sql.

-- ---------------------------------------------------------------------------
-- Salas: fase de llaves
-- ---------------------------------------------------------------------------

alter table public.rooms
  add column if not exists bracket_size  int not null default 0,
  add column if not exists current_round int not null default 0;

-- Durante la transicion se aceptan las fases de ambas versiones.
alter table public.rooms drop constraint if exists rooms_phase_check;
alter table public.rooms add constraint rooms_phase_check
  check (phase in ('lobby','picking','battle','bracket','finished'));

-- ---------------------------------------------------------------------------
-- Bots y elecciones sorteadas
-- ---------------------------------------------------------------------------

alter table public.players add column if not exists is_bot boolean not null default false;
alter table public.picks   add column if not exists random boolean not null default false;

-- ---------------------------------------------------------------------------
-- Duelos
-- ---------------------------------------------------------------------------

create table if not exists public.matches (
  room_id       uuid not null references public.rooms(id) on delete cascade,
  -- 1 = primera ronda; la final es log2(bracket_size).
  round         int  not null check (round >= 1),
  slot          int  not null check (slot >= 0),
  player_a      uuid not null references public.players(id) on delete cascade,
  player_b      uuid not null references public.players(id) on delete cascade,
  -- Equipo de cada lado: las categorias sorteadas cuyas elecciones pelean. Con
  -- 6 categorias o menos en la sala, ambos usan todas; si hay mas, cada jugador
  -- recibe 6 al azar, independientes de las del rival.
  team_a        text[] not null,
  team_b        text[] not null,
  -- Promedio del battle_score del equipo; gana el mayor.
  avg_a         numeric not null,
  avg_b         numeric not null,
  -- El resultado se decide al crear el duelo y se oculta hasta revelarlo.
  winner        uuid not null references public.players(id) on delete cascade,
  tiebreak      boolean not null default false,
  revealed      boolean not null default false,
  primary key (room_id, round, slot)
);

-- Sin politica de select: el ganador de un duelo sin revelar es un spoiler.
alter table public.matches enable row level security;

-- ---------------------------------------------------------------------------
-- Permisos de columna
-- ---------------------------------------------------------------------------

-- Las columnas nuevas se suman a las ya concedidas; las de la version anterior
-- se retiran en 003.
grant select (bracket_size, current_round) on public.rooms to anon, authenticated;
grant select (is_bot) on public.players to anon, authenticated;

-- Los jugadores no deben poder consultar el puntaje competitivo: con la clave
-- anonima, que es publica, bastaria una peticion para saber que elegir. La app
-- lee los puntajes con la service role key, asi que ninguna version se afecta.
revoke select on public.pokemon from anon, authenticated;
grant select (slug, dex, name, form, type1, type2, ability1, ability_hidden,
              hp, attack, defense, sp_atk, sp_def, speed, total_stats,
              legendary, mythical, generation, profile, dual_type, sprite_id)
  on public.pokemon to anon, authenticated;
