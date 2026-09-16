# PokéStats

Juego web multijugador en vivo, al estilo Quizizz, donde cada jugador llena un
**cuadro de doble entrada** de Pokémon favoritos por categoría. Un anfitrión marca
el ritmo —abre una categoría, la cierra y revela las elecciones de todos, pasa a la
siguiente— y al final se **sortean al azar** algunas categorías para la batalla.

Gana quien haya elegido al Pokémon **más efectivo en competitivo**, medido sobre la
base `pokemon_competitive_analysis.csv` (PokéAPI + estadísticas de uso de Smogon VGC
2022-2024) y con el criterio que estableció el informe de Estadística Aplicada que
acompaña al proyecto.

```
Anfitrión                        Jugador
┌───────────────────────┐        ┌───────────────────────┐
│ Categoría 3 de 8      │        │ 🥚 Inicial favorito   │
│ 🥚 Inicial favorito   │        │ [ buscar…          ]  │
│                       │        │ ▣ ▢ ▢ ▢ ▢ ▢           │
│      4/5 ya eligieron │        │ ▢ ▢ ▢ ▢ ▢ ▢           │
│ [Revelar] [Siguiente] │        │ Tu elección: Rillaboom│
└───────────────────────┘        └───────────────────────┘
                      ↓ al cerrar todas
          🎲 sorteo de 3 categorías → batalla → tabla de posiciones
```

---

## Cómo se calcula quién gana

Cada una de las **1303 formas** de la base tiene un puntaje de 0 a 100:

```
puntaje = 0.55 · uso_VGC_2024  +  0.45 · (stats_base × elegibilidad)
```

**Uso (55 %).** Mezcla `0.65 · Smogon + 0.35 · Worlds` del año 2024, sostenida en un
20 % por el mejor registro histórico de 2022-2023. Se comprime en escala logarítmica
porque la distribución original es fuertemente asimétrica: el 62.3 % de la muestra
del informe no registra uso alguno y el máximo observado es 60.4 %.

**Stats (45 %).** `0.42 · BST + 0.22 · mejor ataque + 0.20 · velocidad + 0.16 · dureza`,
cada componente normalizado sobre el rango real de la base. Los pesos siguen la
jerarquía que encontró el informe: el poder total es el predictor más sólido
(χ²(3) = 79.22, *p* < .001, V de Cramér = .516) y la velocidad, aunque sube de forma
monótona, no alcanza significancia (*p* = .162), por eso pesa menos.

**Elegibilidad.** El informe halla asociación significativa entre la condición de la
especie y el uso (χ²(2) = 11.83, *p* = .003): los legendarios elegibles registran uso
en el 63.6 % de los casos, pero **ningún mítico aparece en el formato** porque el
reglamento los excluye. Los míticos multiplican por `0.6` su componente de stats: su
potencia bruta no se traduce en presencia real.

**Dato faltante vs. dato cero.** Un `NoUsage` en una especie elegible significa 0 % de
uso y se trata como tal. Pero las **Mega-Evoluciones y las formas Gigamax no compiten
en VGC 2024**: su uso no está medido, es un dato ausente. En vez de asumir cero, se
estima con el modelo `BST → uso medio` ajustado sobre las especies elegibles de esta
misma base, ajustado ±30 % según el reparto de ofensiva y velocidad de la forma.
La interfaz marca esos casos como *estimado*.

El ranking resultante reproduce el meta real: Flutter Mane, Incineroar, Zacian
Coronado, Calyrex Jinete Espectral y Ogerpon encabezan la tabla.

### Puntos de la competencia

Por cada ronda de batalla revelada, cada jugador suma el puntaje de su Pokémon
redondeado, más **25 puntos de bonificación** si gana la ronda. En caso de empate en
el máximo, todos los empatados cobran la bonificación.

---

## Puesta en marcha

### 1. Base de datos (Supabase)

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. En **SQL Editor**, ejecuta primero `supabase/schema.sql`.
3. Carga el catálogo (1303 Pokémon + 46 categorías). Lo más cómodo, una vez
   completado `.env.local` (paso 2):
   ```bash
   npm run seed:upload
   ```
   Alternativa: pegar `supabase/seed.sql` (~0.4 MB) en el SQL Editor, o con `psql`:
   ```bash
   psql "$DATABASE_URL" -f supabase/seed.sql
   ```
4. En **Database → Replication**, confirma que la publicación `supabase_realtime`
   incluye `rooms`, `room_categories` y `players`. El `schema.sql` ya las agrega.

### 2. Variables de entorno

Copia `.env.example` a `.env.local` y complétalo con **Project Settings → API**:

| Variable | De dónde sale | Visible en el navegador |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL | sí |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` `public` | sí |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` `secret` | **no, nunca** |

### 3. Local

```bash
npm install
npm run dev     # http://localhost:3000
```

### 4. Vercel

```bash
vercel
```

Carga las tres variables en **Settings → Environment Variables**. `SUPABASE_SERVICE_ROLE_KEY`
va **sin** el prefijo `NEXT_PUBLIC_`: solo la leen las route handlers del servidor.

---

## Cómo se juega

1. El anfitrión entra a `/crear`, elige entre 2 y 20 categorías de un catálogo de 46,
   las ordena y decide cuántas irán al sorteo final. Recibe un código de 6 dígitos.
2. Los jugadores entran desde la portada con ese código y un apodo. Sin registro.
3. El anfitrión pulsa **Empezar**. Se abre la primera categoría.
4. Cada jugador busca y elige su Pokémon. Puede cambiarlo mientras la categoría
   siga abierta. El anfitrión solo ve el contador `4/5 ya eligieron`.
5. **Revelar** destapa la fila del cuadro. **Siguiente categoría** avanza.
6. Cerradas todas, **Sortear** elige al azar las categorías de batalla.
7. El anfitrión revela una ronda a la vez; cada una muestra el desglose del puntaje
   del ganador y la tabla de posiciones se actualiza.

---

## Arquitectura

```
src/
  app/
    page.tsx                      portada: entrar a una sala
    crear/page.tsx                armado de la partida
    host/[code]/page.tsx          consola del anfitrión
    play/[code]/page.tsx          vista del jugador
    api/
      rooms/route.ts              POST  crear sala
      rooms/[code]/join           POST  entrar con apodo
      rooms/[code]/state          GET   estado filtrado según quién pregunta
      rooms/[code]/pick           POST  elegir Pokémon
      rooms/[code]/host           POST  acciones del anfitrión
      categories/…                GET   catálogo (cacheado en el CDN)
  lib/
    game.ts                       toda la lógica de partida (solo servidor)
    scoring → scripts/scoring.mjs puntaje competitivo (fuente única)
    client.ts                     fetch + estado en vivo
  components/
    PickGrid.tsx                  el cuadro de doble entrada
    Battle.tsx                    rondas de batalla
    PokemonPicker.tsx             buscador dentro de la categoría
scripts/
  categories.mjs                  las 46 categorías y sus filtros
  scoring.mjs                     el modelo de puntaje
  build-seed.mjs                  CSV → supabase/seed.sql
```

### Por qué las elecciones no se filtran

La tabla `picks` **no tiene política de `select`**: es inalcanzable con la clave
anónima. Los clientes se suscriben por Realtime a `rooms`, `room_categories` y
`players`, que solo llevan estado público —incluido el contador `picked_count`, que
permite mostrar «4 de 5 ya eligieron» sin revelar *qué* eligieron—. Cualquier cambio
dispara un `GET /api/rooms/[code]/state`, y es el servidor, con la `service_role`
key, quien decide qué puede ver cada quien: las categorías ya reveladas, más siempre
la elección propia. Abrir las herramientas de desarrollo no adelanta nada.

Las filas de `rooms` y `players` sí son legibles, pero **sus credenciales no**: el
esquema retira el `select` de tabla y lo concede columna por columna, dejando fuera
`rooms.host_token` y `players.token`. Sin eso, cualquiera con la clave anónima
—que es pública por diseño— podría suplantar al anfitrión o a otro jugador.

Las escrituras pasan todas por route handlers que validan el token de anfitrión o de
jugador; ninguna tabla tiene política de `insert`/`update`/`delete`.

Un sondeo de respaldo cada 6 segundos cubre la caída del websocket.

---

## Regenerar la base

Si cambias los pesos en `scripts/scoring.mjs` o las categorías en
`scripts/categories.mjs`:

```bash
npm run seed:build     # reescribe supabase/seed.sql
```

Después vuelve a ejecutar `supabase/seed.sql` en Supabase — empieza con un `truncate`,
así que es idempotente y no toca las partidas en curso… salvo que las haya, en cuyo
caso el `cascade` las borra. Regenera entre partidas.

El script cachea el índice de nombres de PokéAPI en `scripts/.pokeapi-ids.json` para
poder regenerar sin conexión; bórralo para volver a descargarlo.

---

## Datos

- `data/pokemon_competitive_analysis.csv` — 1303 formas, 23 columnas.
- Sprites: [PokéAPI/sprites](https://github.com/PokeAPI/sprites), carpeta
  `other/home`, que cubre Megas, Gigamax y variantes regionales.
- `Trabajo Aplicativo - Documento formal.pdf` — el informe del que sale el modelo.
