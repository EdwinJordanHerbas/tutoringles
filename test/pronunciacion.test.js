// Tests del servicio de pronunciación figurada.
// Ejecutar:  npm test
//
// Lo que se prueba aquí no es la conversión de sonidos (eso es respelling.test)
// sino el comportamiento en frase: qué palabras se acentúan, cuáles se reducen
// y qué pasa con las que no están en el diccionario.

const test   = require('node:test');
const assert = require('node:assert');
const pron   = require('../lib/pronunciacion');

// Diccionario mínimo con las formas FUERTES, que es lo que trae el de verdad.
const DIC = {
  a: 'ˈeɪ', an: 'ˈæn', the: 'ðˈiː', to: 'tˈuː', of: 'ˈɒv', and: 'ˈænd',
  are: 'ˈɑː', you: 'jˈuː', your: 'jˈɔː', for: 'fˈɔː', is: 'ˈɪz',
  size: 'sˈaɪz', looking: 'lˈʊkɪŋ', apple: 'ˈæpəl', small: 'smˈɔːl',
  bit: 'bˈɪt', runs: 'ɹˈʌnz', it: 'ˈɪt', eat: 'ˈiːt',
  gift: 'ɡˈɪft', wrap: 'ɹˈæp', receipt: 'ɹɪsˈiːt',
};
const buscar = (k) => (DIC[k] ? { ipa: DIC[k] } : null);
const fig = (t) => pron.figurarTexto(t, buscar).texto;

test('trocear conserva la puntuación y los espacios', () => {
  const piezas = pron.trocear("Here's your change, please.");
  assert.strictEqual(piezas.map((p) => p.original).join(''), "Here's your change, please.");
  assert.ok(piezas.some((p) => p.tipo === 'signo'));
  // Las contracciones no se parten: "Here's" es una palabra
  assert.ok(piezas.some((p) => p.clave === "here's"));
});

test('las palabras funcionales se reducen dentro de la frase', () => {
  // El diccionario da /eɪ/ para "a" porque es su forma aislada. En frase es /ə/.
  const r = fig('It runs a bit small');
  // Nota: \b no vale aquí, ə no cuenta como carácter de palabra en regex.
  assert.ok(r.split(/\s+/).includes('ə'), `"a" debería reducirse a ə: ${r}`);
  assert.ok(!/EI/.test(r), `"a" no puede salir como EI: ${r}`);
  // …y las palabras con contenido sí conservan su golpe de voz
  assert.ok(/RANS/.test(r) && /SMOOL/.test(r), `el ritmo se pierde: ${r}`);
});

test('las palabras funcionales no llevan el golpe de voz', () => {
  const p = pron.figurarTexto('What size are you looking for', buscar);
  const porClave = Object.fromEntries(
    p.piezas.filter((z) => z.tipo === 'palabra').map((z) => [z.clave, z]));
  assert.strictEqual(porClave.are.atona, true);
  assert.strictEqual(porClave.you.atona, true);
  assert.strictEqual(porClave.looking.atona, false);
  // Una palabra átona se escribe en minúscula; una con contenido, no
  assert.strictEqual(porClave.are.fig, porClave.are.fig.toLowerCase());
  assert.ok(/[A-Z]/.test(porClave.looking.fig), 'looking debería llevar tónica');
});

test('una palabra suelta conserva su forma fuerte', () => {
  // Si buscas "your" en el diccionario, quieres saber cómo se dice de verdad,
  // no cómo queda comida en mitad de una frase.
  assert.ok(/[A-Z]/.test(fig('your')), 'sola, "your" lleva acento');
  assert.notStrictEqual(fig('to'), fig('to eat').split(' ')[0]);
});

test('"the" y "to" cambian delante de vocal', () => {
  const conVocal = pron.figurarTexto('the apple', buscar);
  const conCons  = pron.figurarTexto('the size', buscar);
  const theVocal = conVocal.piezas.find((z) => z.clave === 'the').fig;
  const theCons  = conCons.piezas.find((z) => z.clave === 'the').fig;
  assert.notStrictEqual(theVocal, theCons, `"the" debería cambiar ante vocal: ${theVocal} / ${theCons}`);
});

test('las palabras compuestas se resuelven por trozos', () => {
  const r = pron.figurarPalabra('gift-wrap', buscar);
  assert.ok(r, 'debería resolver gift-wrap aunque no esté entera en el diccionario');
  assert.ok(r.texto.includes('-'), `debería unir las dos partes: ${r.texto}`);
  assert.strictEqual(r.parcial, true);
});

test('una palabra que no está en el diccionario no rompe la frase', () => {
  const p = pron.figurarTexto('the flurmble size', buscar);
  const rara = p.piezas.find((z) => z.clave === 'flurmble');
  assert.strictEqual(rara.fig, null);
  assert.ok(p.cobertura < 1 && p.cobertura > 0, `cobertura parcial esperada: ${p.cobertura}`);
  // El resto de la frase sigue figurada
  assert.ok(p.piezas.find((z) => z.clave === 'size').fig);
});

test('la cobertura es 1 cuando están todas', () => {
  assert.strictEqual(pron.figurarTexto('the size of it', buscar).cobertura, 1);
});

test('la leyenda no repite el mismo sonido dos veces', () => {
  const p = pron.figurarTexto('the size of the receipt', buscar);
  const fonemas = p.leyenda.map((l) => l.fonema);
  assert.strictEqual(fonemas.length, new Set(fonemas).size, 'hay sonidos repetidos en la leyenda');
});

test('las palabras reducidas no arrastran avisos de letras mudas', () => {
  // "would" tiene la L muda, pero avisarlo cuando la palabra va comida en
  // mitad de la frase distrae de lo que de verdad importa ahí.
  const p = pron.figurarTexto('are you looking for a bit', buscar);
  for (const z of p.piezas.filter((x) => x.atona)) {
    assert.deepStrictEqual(z.avisos, [], `${z.original} no debería avisar nada estando reducida`);
  }
});

test('aguanta textos vacíos y raros', () => {
  assert.strictEqual(pron.figurarTexto('', buscar).texto, '');
  assert.strictEqual(pron.figurarTexto(null, buscar).texto, '');
  assert.strictEqual(pron.figurarTexto('!!! ¿¿¿ 123', buscar).texto, '!!! ¿¿¿ 123');
});
