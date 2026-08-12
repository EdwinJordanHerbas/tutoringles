// TutorIngles — lib/fsrs.js
// FSRS (Free Spaced Repetition Scheduler), extraído del servidor para poder
// probarlo de forma aislada.
//
// Modela la memoria con tres variables:
//   · stability      (S) — días que aguanta el recuerdo antes de caer al 90%
//   · difficulty     (D) — lo que cuesta esa carta en concreto, de 1 a 10
//   · retrievability (R) — probabilidad de acertar ahora, derivada de S y del
//                          tiempo transcurrido
//
// Necesita entre un 20% y un 30% menos de repasos que SM-2 para la misma
// retención (benchmark sobre ~500 millones de repasos reales de Anki).

// Pesos por defecto de FSRS-5, entrenados sobre el corpus público de Anki.
// Se pueden reoptimizar por usuario a partir de review_log cuando haya historial.
const W = [
  0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046,
  1.54575, 0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898,
  0.51655, 0.6621,
];

const DECAY  = -0.5;
const FACTOR = Math.pow(0.9, 1 / DECAY) - 1;   // ≈ 19/81
const TARGET_RETENTION = 0.9;                  // 90% de aciertos buscados
const MAX_INTERVAL = 3650;

/** Probabilidad de recordar tras `elapsed` días con estabilidad `s`. */
const retrievability = (elapsed, s) =>
  Math.pow(1 + FACTOR * Math.max(0, elapsed) / s, DECAY);

/** Intervalo que deja la recuperabilidad justo en TARGET_RETENTION. */
const interval = (s) => {
  const days = (s / FACTOR) * (Math.pow(TARGET_RETENTION, 1 / DECAY) - 1);
  return Math.min(MAX_INTERVAL, Math.max(1, Math.round(days)));
};

const clampD = (d) => Math.min(10, Math.max(1, d));

/** Estado inicial tras el primer repaso. rating: 1 again · 2 hard · 3 good · 4 easy */
const init = (rating) => ({
  stability:  Math.max(0.1, W[rating - 1]),
  difficulty: clampD(W[4] - Math.exp(W[5] * (rating - 1)) + 1),
});

/** Siguiente estado de una carta ya vista. */
function next(stability, difficulty, elapsedDays, rating) {
  const r = retrievability(elapsedDays, stability);

  // La dificultad sube al fallar y baja al acertar fácil, con reversión a la media.
  const deltaD = -W[6] * (rating - 3);
  const dPrime = difficulty + deltaD * ((10 - difficulty) / 9);
  const difficulty2 = clampD(W[7] * init(4).difficulty + (1 - W[7]) * dPrime);

  let stability2;
  if (rating === 1) {
    // Olvido: la estabilidad se desploma, pero no se pierde del todo.
    stability2 = W[11]
      * Math.pow(difficulty2, -W[12])
      * (Math.pow(stability + 1, W[13]) - 1)
      * Math.exp((1 - r) * W[14]);
    stability2 = Math.min(stability2, stability);
  } else {
    // Acierto: cuanto más cerca del olvido estabas, más consolida el repaso.
    const hardPenalty = rating === 2 ? W[15] : 1;
    const easyBonus   = rating === 4 ? W[16] : 1;
    stability2 = stability * (1 + Math.exp(W[8])
      * (11 - difficulty2)
      * Math.pow(stability, -W[9])
      * (Math.exp((1 - r) * W[10]) - 1)
      * hardPenalty * easyBonus);
  }

  return {
    stability:  Math.min(MAX_INTERVAL, Math.max(0.1, stability2)),
    difficulty: difficulty2,
  };
}

module.exports = { W, DECAY, FACTOR, TARGET_RETENTION, MAX_INTERVAL,
                   retrievability, interval, init, next, clampD };
