import fs from "node:fs";
import { CATEGORIES, markCanonical } from "./categories.mjs";

const sql = fs.readFileSync("supabase/seed.sql", "utf8");
const lines = sql.split("\n");

// Reconstruye las filas de pokemon desde el seed generado.
const start = lines.findIndex((l) => l.startsWith("insert into public.pokemon"));
const rows = lines.filter((l) => l.startsWith("(") && l.includes("'generation-"));
const COLS = ["slug","dex","name","form","type1","type2","ability1","ability_hidden","hp","attack","defense","sp_atk","sp_def","speed","total","legendary","mythical","generation","profile","dual","sprite_id","usage","usage_hist","estimated","usage_score","stat_score","elig","score","rank"];

const mons = rows.map((l) => {
  const body = l.replace(/^\(/, "").replace(/\)[,;]?$/, "");
  const cells = []; let cur = ""; let inStr = false;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c === "'") { if (inStr && body[i+1] === "'") { cur += "'"; i++; } else inStr = !inStr; continue; }
    if (c === "," && !inStr) { cells.push(cur); cur = ""; continue; }
    cur += c;
  }
  cells.push(cur);
  const o = {};
  COLS.forEach((k, i) => { o[k] = cells[i]; });
  for (const k of ["dex","hp","attack","defense","sp_atk","sp_def","speed","total","usage","usage_score","stat_score","elig","score","rank"]) {
    o[k] = o[k] === "null" ? null : Number(o[k]);
  }
  o.legendary = o.legendary === "true"; o.mythical = o.mythical === "true";
  o.estimated = o.estimated === "true"; o.dual = o.dual === "true";
  o.type2 = o.type2 === "null" ? null : o.type2;
  return o;
});

markCanonical(mons);
console.log(`Parseados ${mons.length} pokemon del seed.\n`);
const bad = mons.filter((m) => !Number.isFinite(m.score) || m.score < 0 || m.score > 100);
console.log(bad.length ? `!! ${bad.length} puntajes fuera de rango` : "Todos los puntajes en [0,100].");

console.log("\nGanador por categoria (lo que decidiria una batalla):");
for (const c of CATEGORIES) {
  const pool = mons.filter((p) => c.match({ ...p, spAtk: p.sp_atk, spDef: p.sp_def }));
  if (pool.length < 2) continue;
  const top = [...pool].sort((a, b) => b.score - a.score);
  const w = top[0], r = top[1];
  console.log(
    `  ${(c.emoji + " " + c.name).padEnd(36)} ${String(pool.length).padStart(4)} cand.  ` +
    `-> ${w.name.padEnd(22)} ${w.score.toFixed(1).padStart(5)}   (2do: ${r.name}, ${r.score.toFixed(1)})`
  );
}
