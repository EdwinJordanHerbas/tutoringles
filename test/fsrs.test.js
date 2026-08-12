// Tests del motor de repetición espaciada.
// Ejecutar:  npm test
//
// No comprueban valores calculados a mano (eso solo verificaría que la fórmula
// es la que es), sino las PROPIEDADES que debe cumplir el algoritmo para no
// arruinar el estudio del usuario.

const test = require('node:test');
const assert = require('node:assert');
const fsrs = require('../lib/fsrs');

test('el primer repaso ordena los intervalos de menor a mayor según el grado', () => {
  const dias = [1, 2, 3, 4].map((r) => fsrs.interval(fsrs.init(r).stability));
  assert.ok(dias[0] <= dias[1], `again (${dias[0]}) debe ser <= hard (${dias[1]})`);
  assert.ok(dias[1] <= dias[2], `hard (${dias[1]}) debe ser <= good (${dias[2]})`);
  assert.ok(dias[2] <  dias[3], `good (${dias[2]}) debe ser < easy (${dias[3]})`);
});

test('"otra vez" en una carta nueva la devuelve al día siguiente', () => {
  assert.strictEqual(fsrs.interval(fsrs.init(1).stability), 1);
});

test('"fácil" en una carta nueva la aleja bastante', () => {
  assert.ok(fsrs.interval(fsrs.init(4).stability) >= 10);
});

test('la dificultad inicial baja cuanto mejor es el grado', () => {
  const d = [1, 2, 3, 4].map((r) => fsrs.init(r).difficulty);
  assert.ok(d[0] > d[1] && d[1] > d[2] && d[2] > d[3],
    `la dificultad debería decrecer: ${d.join(' > ')}`);
});

test('la dificultad se mantiene siempre entre 1 y 10', () => {
  // Diez fallos seguidos no deben desbordar por arriba
  let s = fsrs.init(1);
  for (let i = 0; i < 10; i++) s = fsrs.next(s.stability, s.difficulty, 1, 1);
  assert.ok(s.difficulty <= 10, `difficulty=${s.difficulty} se ha pasado de 10`);

  // Diez aciertos fáciles no deben desbordar por abajo
  let f = fsrs.init(4);
  for (let i = 0; i < 10; i++) f = fsrs.next(f.stability, f.difficulty, 30, 4);
  assert.ok(f.difficulty >= 1, `difficulty=${f.difficulty} ha bajado de 1`);
});

test('acertar aumenta la estabilidad y fallar nunca la aumenta', () => {
  const base = { stability: 10, difficulty: 5 };
  const bien  = fsrs.next(base.stability, base.difficulty, 10, 3);
  const falla = fsrs.next(base.stability, base.difficulty, 10, 1);
  assert.ok(bien.stability > base.stability,
    `acertar debería consolidar: ${base.stability} -> ${bien.stability}`);
  assert.ok(falla.stability <= base.stability,
    `fallar no debe consolidar: ${base.stability} -> ${falla.stability}`);
});

test('la recuperabilidad decae con el tiempo y vale 0.9 justo en el intervalo', () => {
  const s = 10;
  assert.ok(fsrs.retrievability(0, s) > fsrs.retrievability(5, s));
  assert.ok(fsrs.retrievability(5, s) > fsrs.retrievability(50, s));
  // Por definición, al cabo de `s` días la probabilidad de recordar es el 90%
  assert.ok(Math.abs(fsrs.retrievability(s, s) - 0.9) < 0.001,
    `R(s,s) debería ser 0.9, es ${fsrs.retrievability(s, s)}`);
});

test('repasar tarde consolida más que repasar pronto (efecto del espaciado)', () => {
  // Acertar cuando ya casi lo habías olvidado refuerza más que acertar
  // algo que acabas de ver. Es la base de la repetición espaciada.
  const pronto = fsrs.next(10, 5, 1, 3);
  const tarde  = fsrs.next(10, 5, 20, 3);
  assert.ok(tarde.stability > pronto.stability,
    `esperar debería consolidar más: pronto=${pronto.stability} tarde=${tarde.stability}`);
});

test('los intervalos nunca son menores de 1 día ni mayores que el tope', () => {
  assert.strictEqual(fsrs.interval(0.01), 1);
  assert.ok(fsrs.interval(100000) <= fsrs.MAX_INTERVAL);
});

test('una carta bien sabida acaba superando las tres semanas', () => {
  // Es el umbral que usa el servidor para marcarla como "dominada"
  let s = fsrs.init(3);
  for (let i = 0; i < 5; i++) {
    const dias = fsrs.interval(s.stability);
    s = fsrs.next(s.stability, s.difficulty, dias, 3);
  }
  assert.ok(s.stability >= 21,
    `tras cinco aciertos seguidos la estabilidad debería pasar de 21 días, es ${s.stability}`);
});

test('ningún estado produce NaN ni infinito', () => {
  for (const rating of [1, 2, 3, 4]) {
    for (const elapsed of [0, 1, 7, 365]) {
      for (const stability of [0.1, 1, 50, 3650]) {
        for (const difficulty of [1, 5, 10]) {
          const r = fsrs.next(stability, difficulty, elapsed, rating);
          assert.ok(Number.isFinite(r.stability),
            `stability no finita en r=${rating} e=${elapsed} s=${stability} d=${difficulty}`);
          assert.ok(Number.isFinite(r.difficulty),
            `difficulty no finita en r=${rating} e=${elapsed} s=${stability} d=${difficulty}`);
          assert.ok(Number.isFinite(fsrs.interval(r.stability)));
        }
      }
    }
  }
});
