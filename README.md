# PokéStats

Juego web multijugador en vivo, al estilo Quizizz, con interfaz de Pokédex. Cada
entrenador llena un **cuadro de doble entrada** de Pokémon favoritos por categoría,
al ritmo que marca un anfitrión, y después todos compiten en un **torneo por llaves**
con duelos de equipos de 6.

Gana el equipo **más efectivo en competitivo**, medido sobre la base
`pokemon_competitive_analysis.csv` (PokéAPI + estadísticas de uso de Smogon VGC
2022-2024) y con el criterio que estableció el informe *Uso competitivo de los Pokémon
en el formato VGC 2024 según su generación, tipo primario y condición legendaria*
(Estadística Aplicada, Universidad La Salle, 2026).

```
1. Elección            2. Llaves (2^n)           3. Duelos 6 vs 6
┌──────────────────┐   Ash ──┐                   Ash          Misty
│ Inicial favorito │         ├─ Ash ──┐          Incineroar   Zacian
│ [buscar…]        │   Bot ──┘        │          Dragonite    Kyogre
│ 4/5 ya eligieron │   Misty ─┐       ├─ ?       …            …
└──────────────────┘          ├─ … ───┘          promedio  <  promedio
   el anfitrión avanza  Brock ┘                            gana Misty
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

Los puntajes **no se muestran a los jugadores**: ni en la pantalla, ni en las
respuestas de la API, ni consultando Supabase con la clave anónima. Solo el
anfitrión los ve, para explicar cada resultado.

### El torneo

- **Llaves de 2ⁿ.** Si los entrenadores no llegan a una potencia de 2, se agregan
  bots hasta la siguiente (5 entrenadores → llaves de 8 con 3 bots). En la primera
  ronda cada bot enfrenta a un humano, nunca a otro bot.
- **Bots.** Eligen al azar dentro de cada categoría.
- **Formas especiales.** Las categorías de generación y los grupos legendarios usan
  una forma por especie. Las formas regionales solo compiten en «Forma regional
  favorita», salvo las aves de Galar, que también cuentan en «Legendario» y en
  «Trío de aves».
- **Elecciones faltantes.** Quien no elige antes de que se cierre una categoría, o
  entra tarde, recibe un Pokémon sorteado de esa categoría. Se marca con un dado.
- **Duelos 6 vs 6.** Con 6 categorías o menos en la sala, ambos pelean con todos sus
  Pokémon. Con más, en cada duelo se sortean 6 categorías por entrenador, distintas
  para cada lado y nuevas en cada ronda.
- **Resultado.** Gana el mayor promedio de puntaje del equipo; un empate exacto se
  resuelve al azar. El resultado se calcula al crear el duelo y queda oculto hasta que
  el anfitrión lo revela.

---

## Puesta en marcha

### 1. Base de datos (Supabase)

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. En **SQL Editor**, ejecuta primero `supabase/schema.sql`. Si tu base viene de la
   versión anterior (sorteo de rondas con marcador), actualízala sin cortar el servicio:
   1. `supabase/migrations/002_torneo.sql`: solo agrega; la versión vieja sigue andando.
   2. Despliega la versión nueva.
   3. `supabase/migrations/003_limpieza.sql`: retira las columnas que ya nadie usa.
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

1. El anfitrión entra a `/crear`, elige entre 2 y 20 categorías de un catálogo de 60
   y las ordena. Recibe un código de 6 dígitos.
2. Los jugadores entran desde la portada con ese código y un apodo. Sin registro.
3. **Empezar** abre la primera categoría. Cada jugador busca y elige; puede cambiar
   mientras siga abierta. El anfitrión solo ve el contador `4/5 ya eligieron`.
4. **Revelar** destapa la fila del cuadro; **Siguiente categoría** avanza. Al cerrar
   una categoría se sortea un Pokémon para quien no eligió.
5. Cerradas todas, **Armar llaves** crea los bots necesarios y los cruces.
6. **Revelar duelo** muestra cada enfrentamiento con los dos equipos. Terminada la
   ronda, se pasa a la siguiente hasta **Coronar campeón**.

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
      rooms/[code]/state          GET   estado filtrado según quién pregunta (sin puntajes para jugadores)
      rooms/[code]/pick           POST  elegir Pokémon
      rooms/[code]/host           POST  acciones del anfitrión
      categories/…                GET   catálogo (cacheado en el CDN)
  lib/
    game.ts                       partida, llaves, bots y duelos (solo servidor)
    scoring → scripts/scoring.mjs puntaje competitivo (fuente única)
    client.ts                     fetch + estado en vivo
  components/
    PickGrid.tsx                  el cuadro de doble entrada
    Bracket.tsx                   llaves, arena de duelo y campeón
    Dex.tsx                       carcasa y pantallas de la Pokédex
    icons.tsx                     iconos SVG propios (categorías, tipos, interfaz)
    PokemonPicker.tsx             buscador dentro de la categoría
scripts/
  categories.mjs                  las 60 categorías y sus filtros
  scoring.mjs                     el modelo de puntaje
  build-seed.mjs                  CSV → supabase/seed.sql
```

### Por qué las elecciones no se filtran

Las tablas `picks` y `matches` **no tienen política de `select`**: son inalcanzables
con la clave anónima. Los clientes se suscriben por Realtime a `rooms`, `room_categories` y
`players`, que solo llevan estado público —incluido el contador `picked_count`, que
permite mostrar «4 de 5 ya eligieron» sin revelar *qué* eligieron—. Cualquier cambio
dispara un `GET /api/rooms/[code]/state`, y es el servidor, con la `service_role`
key, quien decide qué puede ver cada quien: las categorías ya reveladas, más siempre
la elección propia. Abrir las herramientas de desarrollo no adelanta nada.

Las filas de `rooms` y `players` sí son legibles, pero **sus credenciales no**: el
esquema retira el `select` de tabla y lo concede columna por columna, dejando fuera
`rooms.host_token` y `players.token`. Sin eso, cualquiera con la clave anónima
—que es pública por diseño— podría suplantar al anfitrión o a otro jugador. Lo
mismo con `pokemon`: las columnas de puntaje no se conceden, y el catálogo que usa el
buscador se sirve sin ellas.

Una advertencia honesta: el modelo y el seed están en este repositorio público, así
que alguien decidido puede reconstruir los puntajes fuera del juego. La protección
evita que se filtren *durante* la partida, no que existan.

Las escrituras pasan todas por route handlers que validan el token de anfitrión o de
jugador; ninguna tabla tiene política de `insert`/`update`/`delete`.

Un sondeo de respaldo cada 6 segundos cubre la caída del websocket.

---

## Regenerar la base

Si cambias los pesos en `scripts/scoring.mjs` o las categorías en
`scripts/categories.mjs`:

```bash
npm run seed:build     # reescribe supabase/seed.sql
npm run seed:upload    # carga el catálogo con la service role key de .env.local
npm run seed:check     # imprime el ganador por categoría, para revisar el modelo
```

`seed:upload` actualiza las filas sin tocar las partidas. Pegar `supabase/seed.sql`
en el SQL Editor también funciona, pero empieza con un `truncate … cascade` que borra
las partidas en curso: úsalo entre partidas.

El script cachea el índice de nombres de PokéAPI en `scripts/.pokeapi-ids.json` para
poder regenerar sin conexión; bórralo para volver a descargarlo.

---

## Datos

- `data/pokemon_competitive_analysis.csv` — 1303 formas, 23 columnas.
- Sprites: [PokéAPI/sprites](https://github.com/PokeAPI/sprites), carpeta
  `other/home`, que cubre Megas, Gigamax y variantes regionales.
- El informe del que sale el modelo no se incluye en el repositorio; las cifras
  citadas arriba provienen de sus tablas de contingencia (tablas 11 y 12) y
  conclusiones.
