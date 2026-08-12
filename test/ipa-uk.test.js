// Tests del conversor de AFI americano a británico.
// Ejecutar:  npm test
//
// El contenido a aprender es inglés británico porque es el del Cambridge. Estas
// pruebas fijan las cuatro diferencias que de verdad cambian cómo suena una
// palabra: la r que no se pronuncia, la o redondeada, la a larga del sur de
// Inglaterra y la longitud de las íes.

const test   = require('node:test');
const assert = require('node:assert');
const { aBritanico, esBath, esPalm } = require('../lib/ipa-uk');

test('el británico no pronuncia la r salvo delante de vocal', () => {
  assert.strictEqual(aBritanico('/ˈkɑɹ/', 'car'),   'ˈkɑː');
  assert.strictEqual(aBritanico('/ˈfɔɹ/', 'for'),   'ˈfɔː');
  assert.strictEqual(aBritanico('/ˈwɝk/', 'work'),  'ˈwɜːk');
  assert.strictEqual(aBritanico('/ˈbətɚ/', 'butter'), 'ˈbʌtə');
  // …pero delante de vocal sí suena: very, sorry
  assert.ok(aBritanico('/ˈvɛɹi/', 'very').includes('ɹ'), 'la r de very sí se pronuncia');
});

test('la r final convierte la vocal en diptongo', () => {
  assert.strictEqual(aBritanico('/ˈhiɹ/', 'here'), 'ˈhɪə');
  assert.strictEqual(aBritanico('/ˈhɛɹ/', 'hair'), 'ˈheə');
  assert.strictEqual(aBritanico('/ˈʃʊɹ/', 'sure'), 'ˈʃʊə');
});

test('la o de "hot" se redondea en británico', () => {
  assert.strictEqual(aBritanico('/ˈwɑnt/', 'want'), 'ˈwɒnt');
  assert.strictEqual(aBritanico('/ˈsɑɹi/', 'sorry'), 'ˈsɒɹi');
  // …salvo en el grupo PALM, donde se alarga en vez de redondearse
  assert.strictEqual(aBritanico('/ˈfɑðɚ/', 'father'), 'ˈfɑːðə');
  assert.strictEqual(aBritanico('/ˈkɑm/', 'calm'), 'ˈkɑːm');
});

test('la schwa tónica del americano es la /ʌ/ británica', () => {
  // public escrito /ˈpəblɪk/ daría "PƏ-blik", que no es como suena.
  assert.strictEqual(aBritanico('/ˈpəbɫɪk/', 'public'), 'ˈpʌblɪk');
  assert.strictEqual(aBritanico('/ˈməni/', 'money'), 'ˈmʌni');
  // La schwa átona se queda como está: es el sonido más común del inglés
  assert.ok(aBritanico('/əˈbaʊt/', 'about').startsWith('ə'), 'la schwa átona no se toca');
  // …y no debe romper el diptongo /əʊ/
  assert.strictEqual(aBritanico('/ˈɡoʊ/', 'go'), 'ˈɡəʊ');
});

test('la longitud de la i depende de si lleva el acento', () => {
  assert.strictEqual(aBritanico('/ɹiˈsit/', 'receipt'), 'ɹɪˈsiːt');  // átona corta, tónica larga
  assert.strictEqual(aBritanico('/ˈvɛɹi/', 'very'),   'ˈvɛɹi');     // final átona: corta
  assert.strictEqual(aBritanico('/ˈɹɛdi/', 'ready'),  'ˈɹɛdi');
});

test('el grupo BATH alarga la a en el inglés del sur', () => {
  assert.strictEqual(aBritanico('/ˈæsk/', 'ask'), 'ˈɑːsk');
  assert.ok(esBath('asked') && esBath('classes'), 'debería reconocer derivados');
  assert.ok(!esBath('cat') && !esPalm('cat'), 'cat no pertenece a ninguno de los dos grupos');
  // Una palabra fuera del grupo conserva su /æ/
  assert.strictEqual(aBritanico('/ˈkæt/', 'cat'), 'ˈkæt');
});

test('la l velarizada americana es una l normal', () => {
  assert.strictEqual(aBritanico('/ˈʃɛɫf/', 'shelf'), 'ˈʃɛlf');
});

test('no deja símbolos americanos sin convertir', () => {
  const americanos = /[ɫɝɚ]/;
  for (const [w, ipa] of [['work', '/ˈwɝk/'], ['butter', '/ˈbətɚ/'], ['full', '/ˈfʊɫ/'],
                          ['farther', '/ˈfɑɹðɚ/'], ['world', '/ˈwɝɫd/']]) {
    const uk = aBritanico(ipa, w);
    assert.ok(!americanos.test(uk), `${w} conserva notación americana: ${uk}`);
  }
});

test('aguanta entradas vacías o rotas', () => {
  assert.strictEqual(aBritanico('', 'x'), '');
  assert.strictEqual(aBritanico(null), '');
  assert.strictEqual(typeof aBritanico('/???/', 'x'), 'string');
});
