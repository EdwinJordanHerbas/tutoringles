// Tests del plan del francés por fases.
// Ejecutar:  npm test
//
// Lo importante: que ninguna fase se dé por hecha sin datos, y que un objetivo
// que la app todavía no puede medir no cuente ni a favor ni en contra.

const test   = require('node:test');
const assert = require('node:assert');
const { fasesFrances } = require('../lib/fases');

const vacio = {
  palabras: {
    chunk:    { total: 40, consolidadas: 0 },
    suisse:   { total: 35, consolidadas: 0 },
    work:     { total: 55, consolidadas: 0 },
    general:  { total: 35, consolidadas: 0 },
    academic: { total: 35, consolidadas: 0 },
  },
  situaciones: { A2: { total: 5, hechas: 0 }, B1: { total: 5, hechas: 0 }, B2: { total: 2, hechas: 0 } },
  gramatica:   { B1: { total: 4, hechas: 0 }, B2: { total: 3, hechas: 0 }, C1: { total: 1, hechas: 0 } },
};

test('al empezar, la fase actual es la primera y ninguna está hecha', () => {
  const f = fasesFrances(vacio);
  assert.deepStrictEqual(f.map((x) => x.estado), ['actual', 'siguiente', 'siguiente']);
  assert.strictEqual(f[0].pct, 0);
});

test('una categoría se cumple al 80 % consolidado, no al 100 %', () => {
  const d = structuredClone(vacio);
  d.palabras.chunk.consolidadas = 32;          // 80 % de 40
  const f = fasesFrances(d);
  assert.strictEqual(f[0].objetivos[0].pct, 100);
});

test('se pasa a la fase 2 sólo con los tres objetivos de la 1 cumplidos', () => {
  const d = structuredClone(vacio);
  d.palabras.chunk.consolidadas = 40;
  d.palabras.suisse.consolidadas = 35;
  let f = fasesFrances(d);
  assert.strictEqual(f[0].estado, 'actual', 'faltan las situaciones A2');

  d.situaciones.A2.hechas = 5;
  f = fasesFrances(d);
  assert.deepStrictEqual(f.map((x) => x.estado), ['hecha', 'actual', 'siguiente']);
});

test('un objetivo sin contenido no se da por cumplido', () => {
  // Sin situaciones cargadas, meta 0 NO es 100 %: sería una fase regalada.
  const d = structuredClone(vacio);
  d.palabras.chunk.consolidadas = 40;
  d.palabras.suisse.consolidadas = 35;
  d.situaciones = {};
  const f = fasesFrances(d);
  assert.strictEqual(f[0].estado, 'actual');
  assert.strictEqual(f[0].objetivos[2].pct, 0);
});

test('los simulacros del DALF, que aún no existen, no cuentan en el porcentaje', () => {
  const d = structuredClone(vacio);
  d.palabras.academic.consolidadas = 35;
  d.gramatica.B2.hechas = 3;
  d.gramatica.C1.hechas = 1;
  const f = fasesFrances(d)[2];
  assert.strictEqual(f.pct, 100);
  assert.ok(f.objetivos.some((o) => o.pendienteApp));
});

test('sin datos no revienta', () => {
  const f = fasesFrances();
  assert.strictEqual(f.length, 3);
  assert.strictEqual(f[0].estado, 'actual');
});
