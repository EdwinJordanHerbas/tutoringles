// Tests del test de nivel del francés.
// Ejecutar:  npm test
//
// Lo que se protege: que la respuesta no salga del servidor, que el test esté
// equilibrado entre franjas, y que el nivel no se pueda inventar con aciertos
// sueltos o adivinando.

const test   = require('node:test');
const assert = require('node:assert');
const t      = require('../lib/test-frances');

test('seis preguntas por franja, con ids únicos', () => {
  for (const f of t.FRANJAS) {
    assert.strictEqual(t.PREGUNTAS.filter((q) => q.franja === f).length, t.POR_FRANJA, f);
  }
  assert.strictEqual(new Set(t.PREGUNTAS.map((q) => q.id)).size, t.PREGUNTAS.length);
});

test('cada pregunta tiene cuatro opciones distintas y la buena está entre ellas', () => {
  for (const q of t.PREGUNTAS) {
    assert.strictEqual(q.opciones.length, 4, `pregunta ${q.id}`);
    assert.strictEqual(new Set(q.opciones).size, 4, `opciones repetidas en ${q.id}`);
    assert.ok(q.opciones.includes(q.correcta), `la buena no está en ${q.id}`);
    assert.ok(q.enunciado.includes('___'), `sin hueco en ${q.id}`);
  }
});

test('al cliente no le llega la respuesta, y sí la opción de no saberlo', () => {
  const texto = JSON.stringify(t.preguntasParaCliente());
  assert.ok(!texto.includes('"correcta"'), 'la respuesta correcta no puede salir del servidor');
  for (const q of t.preguntasParaCliente()) assert.strictEqual(q.opciones.at(-1), t.NO_LO_SE);
});

test('la buena no va siempre en el mismo sitio', () => {
  // Escritas a mano, la buena era siempre la primera opción: el test medía
  // quién se daba cuenta, no el francés.
  const posiciones = new Set();
  for (let i = 0; i < 20; i++) {
    for (const q of t.preguntasParaCliente()) {
      const original = t.PREGUNTAS.find((p) => p.id === q.id);
      posiciones.add(q.opciones.indexOf(original.correcta));
    }
  }
  assert.deepStrictEqual([...posiciones].sort(), [0, 1, 2, 3]);
  // Y en una sola tanda, no pueden ir todas en la misma posición.
  const una = t.preguntasParaCliente().map((q) =>
    q.opciones.indexOf(t.PREGUNTAS.find((p) => p.id === q.id).correcta));
  assert.ok(new Set(una).size > 1);
});

test('todo bien es C1 y todo "No lo sé" es por debajo de A2', () => {
  const todoBien = t.PREGUNTAS.map((q) => ({ id: q.id, response: q.correcta }));
  assert.strictEqual(t.corregir(todoBien).nivel, 'C1');
  const nada = t.PREGUNTAS.map((q) => ({ id: q.id, response: t.NO_LO_SE }));
  const r = t.corregir(nada);
  assert.strictEqual(r.nivel, 'A1');
  assert.strictEqual(r.aciertos, 0);
});

test('el nivel es la franja más alta superada SIN saltos', () => {
  assert.strictEqual(t.nivelDesdeFranjas({ A2: 6, B1: 5, B2: 2, C1: 6 }), 'B1',
    'un C1 perfecto no cuenta si B2 no está superado');
  assert.strictEqual(t.nivelDesdeFranjas({ A2: 3, B1: 6, B2: 6, C1: 6 }), 'A1');
  assert.strictEqual(t.nivelDesdeFranjas({ A2: 4, B1: 4, B2: 4, C1: 3 }), 'B2');
});

test('las respuestas que no llegan cuentan como fallo', () => {
  const r = t.corregir([{ id: 1, response: 'suis' }]);
  assert.strictEqual(r.aciertos, 1);
  assert.strictEqual(r.total, 24);
  assert.strictEqual(r.porFranja.A2.aciertos, 1);
});

test('adivinar al azar casi nunca da más de A2', () => {
  // Con 4 opciones, 4 de 6 por suerte en una franja es poco probable, y
  // encadenar dos franjas, rarísimo. Se simula para que el umbral no se
  // relaje sin darse cuenta.
  let x = 7;
  const rnd = () => { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; };
  let alto = 0;
  for (let i = 0; i < 2000; i++) {
    const r = t.corregir(t.PREGUNTAS.map((q) => ({ id: q.id, response: q.opciones[Math.floor(rnd() * 4)] })));
    if (r.nivel !== 'A1' && r.nivel !== 'A2') alto++;
  }
  assert.ok(alto / 2000 < 0.02, `adivinando sale B1 o más en el ${(alto / 20).toFixed(1)} % de los casos`);
});
