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
  correos:     { total: 5, hechas: 0 },
  dalf:        { total: 4, hechas: 0 },
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

test('la comprensión del DALF, que aún no existe, no cuenta en el porcentaje', () => {
  const d = structuredClone(vacio);
  d.palabras.academic.consolidadas = 35;
  d.gramatica.B2.hechas = 3;
  d.gramatica.C1.hechas = 1;
  d.dalf.hechas = 4;
  const f = fasesFrances(d)[2];
  assert.strictEqual(f.pct, 100);
  assert.ok(f.objetivos.some((o) => o.pendienteApp));
});

test('la fase 3 no se cumple sin escribir las tareas del DALF', () => {
  const d = structuredClone(vacio);
  d.palabras.academic.consolidadas = 35;
  d.gramatica.B2.hechas = 3;
  d.gramatica.C1.hechas = 1;
  const f = fasesFrances(d)[2];
  assert.ok(f.pct < 100);
  const obj = f.objetivos.find((o) => /DALF escritos/.test(o.texto));
  assert.deepStrictEqual([obj.hechas, obj.meta, obj.pct], [0, 4, 0]);
});

test('la fase 2 incluye escribir los correos del día a día', () => {
  const d = structuredClone(vacio);
  d.palabras.work.consolidadas = 55;
  d.palabras.general.consolidadas = 35;
  d.situaciones.B1.hechas = 5;
  d.situaciones.B2.hechas = 2;
  d.gramatica.B1.hechas = 4;
  assert.ok(fasesFrances(d)[1].pct < 100, 'sin correos no está completa');
  d.correos.hechas = 5;
  assert.strictEqual(fasesFrances(d)[1].pct, 100);
});

test('sin datos no revienta', () => {
  const f = fasesFrances();
  assert.strictEqual(f.length, 3);
  assert.strictEqual(f[0].estado, 'actual');
});
