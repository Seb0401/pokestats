-- Migracion 2 de 2: retira lo que solo usaba la version anterior.
--
-- Aplicar DESPUES de desplegar la version del torneo por llaves: la version
-- anterior de la app escribe en estas columnas y dejaria de funcionar.

-- Salas de la version anterior que ya pasaron a su batalla: no tienen llaves que
-- mostrar. Las que siguen en lobby o eligiendo continuan con el torneo nuevo.
delete from public.rooms
where phase = 'battle' or (phase = 'finished' and bracket_size = 0);

alter table public.rooms
  drop column if exists battle_rounds,
  drop column if exists battle_categories,
  drop column if exists battle_revealed;

alter table public.rooms drop constraint if exists rooms_phase_check;
alter table public.rooms add constraint rooms_phase_check
  check (phase in ('lobby','picking','bracket','finished'));
