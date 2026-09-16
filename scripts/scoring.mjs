// Puntaje de efectividad competitiva (0-100).
//
// Fundamento: el informe "Uso competitivo de los Pokemon en el formato VGC 2024"
// concluye que el predictor mas solido del uso real es el poder total (BST),
// chi2(3) = 79.22, p < .001, V de Cramer = .516, seguido de la elegibilidad
// reglamentaria (chi2(2) = 11.83, p = .003). La velocidad muestra un ascenso
// monotono pero sin significancia (p = .162), por eso pesa menos.
//
//   score = 0.55 * uso + 0.45 * (stats * elegibilidad)
//
// El uso observado es fuertemente asimetrico (62.3% de la muestra en cero), de
// modo que se comprime en escala logaritmica antes de normalizar.

export const USAGE_WEIGHT = 0.55;
export const STAT_WEIGHT = 0.45;

// Techo de referencia: el uso maximo observado en la base es 60.39 (Smogon 2022).
const USAGE_CEILING = 60;
const LOG_CEILING = Math.log1p(USAGE_CEILING);

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const norm = (x, lo, hi) => clamp01((x - lo) / (hi - lo)) * 100;

/** Mezcla Smogon (ladder, mayor volumen) con Worlds (alto nivel, menor volumen). */
export function blendUsage(smogon, worlds) {
  return 0.65 * (smogon ?? 0) + 0.35 * (worlds ?? 0);
}

export function usageToScore(usagePct) {
  return (100 * Math.log1p(Math.max(0, usagePct))) / LOG_CEILING;
}

/** Componentes de stats, cada uno 0-100. Los rangos son los observados en la base. */
export function statComponents(p) {
  return {
    power: norm(p.total, 175, 720),
    offense: norm(Math.max(p.attack, p.spAtk), 10, 190),
    speed: norm(p.speed, 5, 180),
    bulk: norm(p.hp + p.defense + p.spDef, 60, 450),
  };
}

export function statScore(p) {
  const c = statComponents(p);
  return 0.42 * c.power + 0.22 * c.offense + 0.2 * c.speed + 0.16 * c.bulk;
}

/**
 * Factor de elegibilidad reglamentaria. El informe observa 0.0% de uso en los
 * miticos porque el reglamento oficial los excluye del circuito: su potencia
 * bruta no se traduce en presencia real, asi que se descuenta del componente
 * de stats (el de uso ya vale cero por si mismo).
 */
export function eligibilityFactor(p) {
  if (p.mythical) return 0.6;
  return 1;
}

/**
 * Modelo de estimacion para formas sin uso definido (Mega, Gigamax): no
 * compitieron en VGC 2024, de modo que su 0 no es un cero medido sino un dato
 * ausente. Se estima a partir de la relacion BST -> uso medio observada en las
 * propias especies elegibles de esta base.
 */
export function buildUsageEstimator(eligible) {
  const BIN = 50;
  const bins = new Map();
  for (const p of eligible) {
    const k = Math.floor(p.total / BIN);
    if (!bins.has(k)) bins.set(k, []);
    bins.get(k).push(p.usageScore);
  }
  const means = new Map();
  for (const [k, vals] of bins) {
    means.set(k, vals.reduce((a, b) => a + b, 0) / vals.length);
  }
  // Suavizado con los vecinos para que los extremos poco poblados no salten.
  const smoothed = new Map();
  for (const k of means.keys()) {
    const near = [k - 1, k, k + 1].filter((i) => means.has(i));
    smoothed.set(k, near.reduce((a, i) => a + means.get(i), 0) / near.length);
  }

  return (p) => {
    const k = Math.floor(p.total / BIN);
    const keys = [...smoothed.keys()].sort((a, b) => a - b);
    const nearest = keys.reduce((best, i) =>
      Math.abs(i - k) < Math.abs(best - k) ? i : best, keys[0]);
    const base = smoothed.get(k) ?? smoothed.get(nearest) ?? 0;
    // Ajuste por reparto de stats: dentro de un mismo BST, ofensiva y velocidad
    // son lo que distingue a una amenaza real de un poste estadistico.
    const c = statComponents(p);
    const quality = (c.offense + c.speed) / 200; // 0-1
    return Math.max(0, base * (0.7 + 0.6 * quality));
  };
}

export function finalScore({ usageScore, statScoreValue, eligibility }) {
  return USAGE_WEIGHT * usageScore + STAT_WEIGHT * (statScoreValue * eligibility);
}
