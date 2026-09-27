// Tests del modo Tetris.
// Ejecutar:  npm test
//
// Lo que se protege aquí es que el experimento de la noche no mienta: que el
// reparto de palabras sea justo, que una noche sin pistas no cuente como noche
// con pistas y que el veredicto no diga "funciona" con dos noches de datos.

const test   = require('node:test');
const assert = require('node:assert');
const t      = require('../lib/tetris');
const avisos = require('../lib/avisos');

const MADRID = 'Europe/Madrid';

// Generador determinista: los tests no pueden depender de la suerte.
function semilla(n) {
  let x = n;
  return () => { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; };
}

// ── EL DÍA DE ESTUDIO ─────────────────────────────────────

test('el día de estudio no cambia a medianoche sino a las 05:00', () => {
  // 00:30 del 13 en Madrid (22:30 UTC del 12): sigue siendo el día 12, porque
  // quien repasa a esa hora y se duerme tiene que oír lo de SU tarde.
  assert.strictEqual(t.diaDeEstudio(new Date(Date.UTC(2026, 8, 12, 22, 30)), MADRID), '2026-09-12');
  // 04:59 del 13: todavía el 12.
  assert.strictEqual(t.diaDeEstudio(new Date(Date.UTC(2026, 8, 13, 2, 59)), MADRID), '2026-09-12');
  // 05:00 del 13: ya el 13.
  assert.strictEqual(t.diaDeEstudio(new Date(Date.UTC(2026, 8, 13, 3, 0)), MADRID), '2026-09-13');
});

test('la expresión SQL del día usa el mismo corte que el código', () => {
  const sql = t.sqlDiaDeEstudio('rl.reviewed_at', '$2');
  assert.match(sql, /AT TIME ZONE \$2/);
  assert.match(sql, new RegExp(`INTERVAL '${t.CORTE_HORAS} hours'`));
});

// ── EL REPARTO ────────────────────────────────────────────

test('el reparto no pierde ni duplica palabras', () => {
  const palabras = Array.from({ length: 23 }, (_, i) => ({ id: i + 1, peso: (i * 7) % 10 }));
  const { conPista, control } = t.repartirPistas(palabras, semilla(3));
  const ids = [...conPista, ...control].map((p) => p.id).sort((a, b) => a - b);
  assert.deepStrictEqual(ids, palabras.map((p) => p.id));
  assert.ok(Math.abs(conPista.length - control.length) <= 1, 'los grupos van a la par');
});

test('el reparto es estratificado: las difíciles no caen todas en un grupo', () => {
  // Seis palabras muy difíciles y seis muy fáciles. Con un sorteo a pelo, un
  // grupo podía llevarse las seis difíciles y "demostrar" lo que no es.
  const palabras = [
    ...Array.from({ length: 6 }, (_, i) => ({ id: i + 1, peso: 10 })),
    ...Array.from({ length: 6 }, (_, i) => ({ id: i + 7, peso: 1 })),
  ];
  for (let s = 1; s <= 40; s++) {
    const { conPista, control } = t.repartirPistas(palabras, semilla(s));
    const dificiles = (g) => g.filter((p) => p.peso === 10).length;
    assert.strictEqual(dificiles(conPista), 3, `semilla ${s}`);
    assert.strictEqual(dificiles(control), 3, `semilla ${s}`);
  }
});

test('el reparto aguanta listas vacías o de una palabra', () => {
  assert.deepStrictEqual(t.repartirPistas([]), { conPista: [], control: [] });
  const uno = t.repartirPistas([{ id: 9 }], () => 0.1);
  assert.strictEqual(uno.conPista.length + uno.control.length, 1);
});

// ── QUÉ TOCA AHORA ────────────────────────────────────────

const h = (hh, mm = 0) => hh * 60 + mm;

test('por la mañana, si hay test pendiente, va primero el test', () => {
  assert.strictEqual(t.faseTetris({ minutos: h(8), despertarPendiente: true }).fase, 'despertar');
  // Pasadas las 14:00 el test ya no mide lo que dejó la noche: se sigue con el día.
  assert.strictEqual(t.faseTetris({ minutos: h(15), despertarPendiente: true }).fase, 'ronda');
});

test('de día tocan rondas, y al cumplir la meta siguen siendo rondas extra', () => {
  const r = t.faseTetris({ minutos: h(12), rondas: 2, metaRondas: 6 });
  assert.deepStrictEqual(r, { fase: 'ronda', ronda: 3, extra: false });
  assert.strictEqual(t.faseTetris({ minutos: h(18), rondas: 6, metaRondas: 6 }).extra, true);
});

test('por la noche: almohada, luego modo noche, luego nada', () => {
  const base = { minutos: h(22), minAlmohada: h(22, 30), palabrasHoy: 30 };
  assert.strictEqual(t.faseTetris(base).fase, 'almohada', 'una hora antes ya se ofrece');
  assert.strictEqual(t.faseTetris({ ...base, almohadaHecha: true }).fase, 'noche');
  assert.strictEqual(t.faseTetris({ ...base, almohadaHecha: true, nocheEmpezada: true }).fase, 'hecho');
  // De madrugada sigue siendo la noche del mismo día.
  assert.strictEqual(t.faseTetris({ ...base, minutos: h(0, 40) }).fase, 'almohada');
});

test('una almohada pasada la medianoche no convierte el día entero en noche', () => {
  const base = { minAlmohada: h(0, 30), palabrasHoy: 20, rondas: 1 };
  assert.strictEqual(t.faseTetris({ ...base, minutos: h(10) }).fase, 'ronda', 'a media mañana, rondas');
  assert.strictEqual(t.faseTetris({ ...base, minutos: h(21) }).fase, 'ronda', 'a las 21:00 aún no');
  assert.strictEqual(t.faseTetris({ ...base, minutos: h(23, 45) }).fase, 'almohada', 'una hora antes, sí');
  assert.strictEqual(t.faseTetris({ ...base, minutos: h(1, 0) }).fase, 'almohada', 'y de madrugada, también');
});

test('de noche sin nada estudiado no hay almohada: toca una ronda', () => {
  const r = t.faseTetris({ minutos: h(23), minAlmohada: h(22, 30), palabrasHoy: 0 });
  assert.strictEqual(r.fase, 'ronda');
});

test('una hora mal escrita no rompe la fase', () => {
  assert.strictEqual(t.minutosDeHora('23:15'), h(23, 15));
  assert.strictEqual(t.minutosDeHora('25:00'), h(22, 30));
  assert.strictEqual(t.minutosDeHora(''), h(22, 30));
});

// ── EL EXPERIMENTO ────────────────────────────────────────

function noche(id, pistas, conPista, control) {
  // conPista/control: listas de puntuaciones 0, 1 o 2
  return [
    ...conPista.map((r) => ({ noche_id: id, pistas, con_pista: true, recordada: r })),
    ...control.map((r) => ({ noche_id: id, pistas, con_pista: false, recordada: r })),
  ];
}

test('los porcentajes cuentan "con dudas" como medio acierto', () => {
  const r = t.resumenNoches(noche(1, 300, [2, 2, 1, 0], [2, 0, 0, 0]), { minNoches: 1 });
  assert.strictEqual(r.conPista.pct, 63);      // 5 de 8 puntos
  assert.strictEqual(r.control.pct, 25);       // 2 de 8
  assert.strictEqual(r.diferencia, 38);
  assert.strictEqual(r.conPista.primera, 2);
});

test('una noche en la que no sonó nada no entra en la comparación', () => {
  const filas = [
    ...noche(1, 300, [2, 2], [0, 0]),
    ...noche(2, 3, [0, 0], [2, 2]),             // la pantalla se bloqueó: 3 pistas
  ];
  const r = t.resumenNoches(filas);
  assert.strictEqual(r.noches, 1);
  assert.strictEqual(r.descartadas, 1);
  assert.strictEqual(r.conPista.pct, 100);
});

test('las palabras aún sin probar no cuentan', () => {
  const r = t.resumenNoches([{ noche_id: 1, pistas: 300, con_pista: true, recordada: null }]);
  assert.strictEqual(r.noches, 0);
  assert.strictEqual(r.conPista.pct, null);
});

test('el veredicto no se pronuncia hasta tener noches suficientes', () => {
  const pocas = t.resumenNoches(noche(1, 300, [2, 2, 2], [0, 0, 0]));
  assert.strictEqual(pocas.suficiente, false);
  assert.match(t.veredicto(pocas), /Faltan \d+ noches/);
  assert.doesNotMatch(t.veredicto(pocas), /funcionando/);
});

test('el veredicto dice también cuando NO funciona', () => {
  const filas = [];
  for (let i = 1; i <= t.MIN_NOCHES; i++) filas.push(...noche(i, 300, [0, 1, 0], [2, 2, 1]));
  const r = t.resumenNoches(filas);
  assert.ok(r.suficiente);
  assert.match(t.veredicto(r), /PEOR/);

  const buenas = [];
  for (let i = 1; i <= t.MIN_NOCHES; i++) buenas.push(...noche(i, 300, [2, 2, 1], [1, 0, 1]));
  assert.match(t.veredicto(t.resumenNoches(buenas)), /funcionando/);

  const iguales = [];
  for (let i = 1; i <= t.MIN_NOCHES; i++) iguales.push(...noche(i, 300, [2, 1], [2, 1]));
  assert.match(t.veredicto(t.resumenNoches(iguales)), /Sin diferencia/);
});

test('sin ninguna noche lo dice en vez de enseñar un 0 %', () => {
  assert.match(t.veredicto(t.resumenNoches([])), /Aún no hay ninguna noche/);
});

// ── LOS AVISOS DEL MODO TETRIS ────────────────────────────

test('el aviso del despertar dice cuántas palabras hay', () => {
  const a = avisos.componerAvisoTetris('despertar', { palabras: 12, idioma: 'fr' });
  assert.match(a.cuerpo, /12 palabras/);
  assert.match(avisos.componerAvisoTetris('despertar', { palabras: 1 }).cuerpo, /1 palabra\b/);
});

test('el de la almohada sin estudio propone una ronda en vez de un repaso vacío', () => {
  const a = avisos.componerAvisoTetris('almohada', { palabras: 0, idioma: 'fr' });
  assert.match(a.cuerpo, /francés/);
  assert.match(a.cuerpo, /ronda/);
  assert.match(avisos.componerAvisoTetris('almohada', { palabras: 20 }).cuerpo, /20 palabras/);
});

test('el aviso diario dice en qué idioma toca', () => {
  assert.match(avisos.componerAviso({ pendientes: 3, meta: 8, idioma: 'fr' }).titulo, /francés/);
  assert.match(avisos.componerAviso({ pendientes: 3, meta: 8 }).titulo, /inglés/);
});

test('sólo son idiomas los que existen, no las propiedades de cualquier objeto', () => {
  const { esIdioma, normalizarIdioma } = require('../lib/idiomas');
  assert.ok(esIdioma('fr') && esIdioma('en'));
  for (const x of ['constructor', 'toString', '__proto__', 'de', '', null, undefined]) {
    assert.strictEqual(esIdioma(x), false, String(x));
  }
  assert.strictEqual(normalizarIdioma('constructor'), 'en');
});
