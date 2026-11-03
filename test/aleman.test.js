// El alemán, la tercera lengua (3-nov-2026): que entre por las mismas puertas
// que las otras dos y que nada caiga al inglés sin querer.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const { IDIOMAS, esIdioma, normalizarIdioma, claveNivel, NIVEL_REAL } = require('../lib/idiomas');
const { dentroDeLaFranja, arrancarDespierto } = require('../lib/despierto');
const { NOMBRE_IDIOMA, mensajeConversacion } = require('../lib/ia-prompts');

const raiz = path.join(__dirname, '..');
const leer = (f) => fs.readFileSync(path.join(raiz, f), 'utf8');

test('de es un idioma de la app, con su voz', () => {
  assert.ok(esIdioma('de'));
  assert.strictEqual(IDIOMAS.de.voz, 'de-DE');
  assert.strictEqual(normalizarIdioma('de'), 'de');
  assert.strictEqual(NOMBRE_IDIOMA.de, 'alemán');
});

test('cada idioma guarda su nivel aparte y el alemán no hereda el del inglés', () => {
  assert.strictEqual(claveNivel('en'), 'nivel_medido');
  assert.strictEqual(claveNivel('fr'), 'nivel_medido_fr');
  assert.strictEqual(claveNivel('de'), 'nivel_medido_de');
  assert.match(NIVEL_REAL.de, /principiante/i);
});

test('el prompt de conversación lleva el idioma y el nivel real', () => {
  const m = mensajeConversacion({
    lang: 'de', situacion: 'x', papel: 'y', nivel: NIVEL_REAL.de, historial: [], mensaje: '', perfil: null,
  });
  assert.match(m, /alemán/);
  assert.match(m, /principiante/);
});

test('el cliente conoce el alemán en todas las piezas que deciden idioma', () => {
  assert.match(leer('src/js/app.js'), /de: \{ nombre: 'alemán'/);
  assert.match(leer('src/js/voz.js'), /\/\^de\/i\.test/);
  assert.match(leer('src/js/charla.js'), /\/\^de\/i\.test/);
  assert.match(leer('src/js/pron.js'), /_idioma === 'de'/);
  assert.match(leer('src/js/exam.js'), /_idioma === 'de'/);
  assert.match(leer('src/js/diagnostico.js'), /_idioma === 'de'/);
});

test('las escenas de alemán e inglés entran en lo que admite el servidor y tienen grupo', () => {
  const fuente = leer('src/js/charla.js');
  const m = fuente.match(/const CHARLA_ESCENARIOS = (\{[\s\S]*?\n\});?\n/);
  assert.ok(m, 'no se encuentra CHARLA_ESCENARIOS');
  const escenas = vm.runInNewContext(`(${m[1]})`);
  assert.ok(escenas.de.length >= 3);
  for (const lang of ['de', 'en']) {
    for (const e of escenas[lang]) {
      assert.ok(e.escenario.length <= 300, `${e.titulo}: escenario de ${e.escenario.length}`);
      assert.ok(e.papel.length <= 200, `${e.titulo}: papel de ${e.papel.length}`);
    }
  }
  assert.strictEqual(escenas.de[0].grupo, 'entrevista');
});

test('la escena de HOY cabe en lo que admite el servidor', () => {
  const m = leer('src/js/plan.js').match(/const ENTREVISTA_ESCENA = (\{[\s\S]*?\n\});/);
  const e = vm.runInNewContext(`(${m[1]})`);
  assert.ok(e.escenario.length <= 300);
  assert.ok(e.papel.length <= 200);
  assert.strictEqual(e.lang, 'de');
});

test('los pares de sonidos del alemán tienen las cuatro piezas', () => {
  const m = leer('src/js/sons.js').match(/const SONS_DE = (\[[\s\S]*?\n\]);/);
  const sons = vm.runInNewContext(`(${m[1]})`);
  assert.strictEqual(sons.length, 7);
  for (const s of sons) for (const p of s.pares) assert.strictEqual(p.length, 4, s.slug);
});

test('la app sólo se mantiene despierta dentro de la franja', () => {
  assert.strictEqual(dentroDeLaFranja(new Date('2026-11-03T04:59:00Z')), false);
  assert.strictEqual(dentroDeLaFranja(new Date('2026-11-03T05:00:00Z')), true);
  assert.strictEqual(dentroDeLaFranja(new Date('2026-11-03T22:59:00Z')), true);
  assert.strictEqual(dentroDeLaFranja(new Date('2026-11-03T23:00:00Z')), false);
});

test('sin dirección pública no se arranca el temporizador', () => {
  assert.strictEqual(arrancarDespierto({ url: '' }), null);
});
