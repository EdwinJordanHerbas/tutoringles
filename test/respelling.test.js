// Tests del motor de pronunciación figurada.
// Ejecutar:  npm test
//
// No comprueban transcripciones concretas por gusto, sino las propiedades sin
// las cuales la figurada engaña al que la lee: que las distinciones que el
// español no tiene se sigan viendo, que el golpe de voz esté marcado y que las
// letras se lean como un español espera leerlas.

const test   = require('node:test');
const assert = require('node:assert');
const resp   = require('../lib/respelling');

const fig = (ipa, palabra) => resp.desdeIpa(ipa, palabra).texto;

test('la vocal larga y la corta NO se escriben igual — es la razón de ser del sistema', () => {
  // Si esto falla, la figurada está mintiendo: ship y sheep son dos palabras.
  const ship  = fig('/ʃˈɪp/',  'ship');
  const sheep = fig('/ʃˈiːp/', 'sheep');
  assert.notStrictEqual(ship, sheep, `ship y sheep no pueden dar "${ship}" los dos`);

  const pares = [
    ['/lˈɪv/', 'live', '/lˈiːv/', 'leave'],
    ['/fˈʊl/', 'full', '/fˈuːl/', 'fool'],
    ['/bˈæd/', 'bad',  '/bˈɛd/',  'bed'],
  ];
  for (const [a, pa, b, pb] of pares) {
    assert.notStrictEqual(fig(a, pa), fig(b, pb), `${pa} y ${pb} salen iguales`);
  }
});

test('el golpe de voz va en mayúsculas y solo en una sílaba', () => {
  const r = resp.desdeIpa('/ɹɪsˈiːt/', 'receipt');
  const tonicas = r.silabas.filter((s) => s.tonica);
  assert.strictEqual(tonicas.length, 1, `${r.texto} tiene ${tonicas.length} tónicas`);
  assert.strictEqual(tonicas[0].texto, tonicas[0].texto.toUpperCase());
  assert.ok(/[A-ZÆƏ]/.test(r.texto), `${r.texto} no marca ninguna tónica`);
});

test('siempre marca una tónica, aunque el diccionario no la traiga', () => {
  const r = resp.desdeIpa('/kætəlɒɡ/', 'catalogue');
  assert.ok(r.silabas.some((s) => s.tonica), 'sin acento en el AFI debería marcar la primera');
});

test('la g se escribe "gu" ante e/i para que no se lea como jota', () => {
  // "get" escrito GET se leería "jet" en español: sería peor que no poner nada.
  assert.match(fig('/ɡˈɛt/',  'get'),  /GUET/);
  assert.match(fig('/ɡˈɪft/', 'gift'), /GUIFT/);
  // Ante a/o/u no hace falta y no debe aparecer
  assert.ok(!fig('/ɡˈɒt/', 'got').includes('gu'), 'got no necesita diéresis ni u');
});

test('los sonidos que no existen en español se marcan y se explican', () => {
  const r = resp.desdeIpa('/ʃˈɛlf/', 'shelf');
  const sh = r.silabas[0].tokens.find((t) => t.f === 'ʃ');
  assert.strictEqual(sh.clase, 'ajeno');
  assert.ok(r.leyenda.some((l) => l.fonema === 'ʃ' && l.nota), 'la sh debería salir en la leyenda');

  // La r inglesa avisa de que no vibra: es el error que más delata
  const red = resp.desdeIpa('/ɹˈɛd/', 'red');
  assert.ok(red.leyenda.some((l) => /vibra/i.test(l.nota || '')));
});

test('la z y la d castellanas se dan por buenas: son exactamente el sonido inglés', () => {
  // Ventaja del español de España. Si se marcasen como "ajenas" haríamos
  // dudar al usuario de algo que ya hace bien.
  const think = resp.desdeIpa('/θˈɪŋk/', 'think');
  assert.match(think.texto, /^ZI/, `think debería empezar por Z, da ${think.texto}`);
  assert.strictEqual(think.silabas[0].tokens[0].clase, 'ok');

  const the = resp.desdeIpa('/ðə/', 'the');
  assert.strictEqual(the.silabas[0].tokens[0].t, 'd');
  assert.strictEqual(the.silabas[0].tokens[0].clase, 'ok');
});

test('detecta las letras mudas', () => {
  const casos = [
    ['/ɹɪsˈiːt/', 'receipt', 'P'],
    ['/ˈaɪəl/',   'aisle',   'S'],
    ['/nˈəʊ/',    'know',    'K'],
    ['/ˈaʊə/',    'hour',    'H'],
  ];
  for (const [ipa, palabra, letra] of casos) {
    const r = resp.desdeIpa(ipa, palabra);
    assert.ok(r.avisos.some((a) => a.tipo === 'muda' && a.texto.includes(letra)),
      `${palabra} debería avisar de la ${letra} muda; avisó: ${JSON.stringify(r.avisos)}`);
  }
});

test('no inventa letras mudas donde solo hay un dígrafo', () => {
  // "the" tiene una t que no suena, pero es el dígrafo th, no una letra muda.
  const the = resp.desdeIpa('/ðə/', 'the');
  assert.deepStrictEqual(the.avisos.filter((a) => a.tipo === 'muda'), [],
    `"the" no tiene letras mudas: ${JSON.stringify(the.avisos)}`);

  const shop = resp.desdeIpa('/ʃˈɒp/', 'shop');
  assert.deepStrictEqual(shop.avisos.filter((a) => a.tipo === 'muda'), []);
});

test('avisa de la "e" fantasma delante de s líquida', () => {
  // school → "escuul" es el error más marcado de un hispanohablante.
  for (const [ipa, palabra] of [['/skˈuːl/', 'school'], ['/spˈeɪn/', 'Spain'], ['/stˈɒp/', 'stop']]) {
    const r = resp.desdeIpa(ipa, palabra);
    assert.ok(r.avisos.some((a) => a.tipo === 'e-fantasma'), `${palabra} debería avisar`);
  }
  // Pero no cuando la s va seguida de vocal
  assert.ok(!resp.desdeIpa('/sˈeɪl/', 'sale').avisos.some((a) => a.tipo === 'e-fantasma'));
});

test('la schwa se conserva: es el sonido más frecuente del inglés', () => {
  const r = resp.desdeIpa('/tɹˈaʊsəz/', 'trousers');
  assert.ok(r.texto.includes('ə'), `${r.texto} debería conservar la schwa`);
});

test('la ɐ del diccionario es la misma schwa y se pinta igual', () => {
  // El diccionario escribe la vocal neutra unas veces ə y otras ɐ. Si la ɐ se
  // traduce por "a", sale "KA-la" y se lee con una a española bien marcada,
  // justo el error que la figurada existe para evitar.
  for (const [ipa, palabra] of [['/kˈʌlɐ/', 'colour'], ['/pˈeɪpɐ/', 'paper'],
                                ['/bɐnˈɑːnɐ/', 'banana'], ['/kˈʌstəmɐ/', 'customer']]) {
    const t = resp.desdeIpa(ipa, palabra).texto;
    assert.ok(!/a$/.test(t), `${palabra} acaba en "a" española: ${t}`);
    assert.ok(t.includes('ə'), `${palabra} debería llevar schwa: ${t}`);
  }
  // banana es el caso de manual: dos schwas y una sola vocal de verdad
  assert.strictEqual(resp.desdeIpa('/bɐnˈɑːnɐ/', 'banana').texto, 'bə-NAA-nə');
});

test('la ə NUNCA sale en mayúscula, ni en la sílaba tónica', () => {
  // "Ə" no parece una letra: convertía la sílaba fuerte —la única que hay que
  // leer bien— en la más difícil de leer. Pasaba en el 10 % del diccionario.
  const casos = [
    ['/ʃˈɜːt/',  'shirt'], ['/wˈɜːk/',  'work'],  ['/fˈɜːst/', 'first'],
    ['/bˈɜːd/',  'bird'],  ['/hˈiə/',   'here'],  ['/hˈeə/',   'hair'],
    ['/pˈɜːsən/', 'person'],
  ];
  for (const [ipa, palabra] of casos) {
    const t = resp.desdeIpa(ipa, palabra).texto;
    assert.ok(!t.includes('Ə'), `${palabra} sale con Ə mayúscula: ${t}`);
  }
});

test('la /ɜː/ de work y shirt se escribe ëë, que sí se lee', () => {
  assert.strictEqual(resp.desdeIpa('/wˈɜːk/',  'work').texto,  'UËËK');
  assert.strictEqual(resp.desdeIpa('/ʃˈɜːt/',  'shirt').texto, 'SHËËT');
  assert.strictEqual(resp.desdeIpa('/fˈɜːst/', 'first').texto, 'FËËST');
  // Y sigue siendo distinta de la e corta: "bed" no puede parecerse a "bird"
  assert.notStrictEqual(resp.desdeIpa('/bˈɛd/', 'bed').texto,
                        resp.desdeIpa('/bˈɜːd/', 'bird').texto);
});

test('la h inglesa se escribe h, no j — la j invitaba a raspar', () => {
  assert.strictEqual(resp.desdeIpa('/hˈæv/',  'have').texto, 'HÆV');
  assert.strictEqual(resp.desdeIpa('/hˈænd/', 'hand').texto, 'HÆND');
  // Pero va marcada: en español la h es muda y hay que avisar de que aquí suena
  const have = resp.desdeIpa('/hˈæv/', 'have');
  const h = have.silabas[0].tokens[0];
  assert.strictEqual(h.clase, 'ajeno', 'la h tiene que ir resaltada');
  assert.ok(have.leyenda.some((l) => l.fonema === 'h' && /soplo/i.test(l.nota)));
});

test('la h detrás de s o z no forma un dígrafo falso', () => {
  // "sh" y "zh" son otros sonidos en este sistema: si /s/+/h/ se pegan dentro
  // de la misma sílaba, se leería una sh que no existe.
  const t = resp.desdeIpa('/shˈɛd/', 'shead').texto;
  assert.ok(!/sh/i.test(t), `se ha formado una "sh" falsa: ${t}`);
});

test('separa en sílabas por donde se separan de verdad', () => {
  assert.strictEqual(resp.desdeIpa('/ɹɪsˈiːt/', 'receipt').silabas.length, 2);
  assert.strictEqual(resp.desdeIpa('/ʃˈɪp/', 'ship').silabas.length, 1);
  // El grupo "st" no se parte: "system" es SIS-tem, no SI-stem ni SIST-em
  const sis = resp.desdeIpa('/sˈɪstəm/', 'system');
  assert.strictEqual(sis.silabas.length, 2, `system: ${sis.texto}`);
});

test('no pierde ningún sonido por el camino', () => {
  // Todo fonema de entrada tiene que aparecer en alguna sílaba de salida.
  for (const ipa of ['/ɹɪsˈiːt/', '/stɹˈɛŋθ/', '/ˈɔːlsəʊ/', '/kəmfətəbəl/', '/ˈæktʃuːəli/']) {
    const dentro = resp.aFonemas(ipa).length;
    const fuera  = resp.desdeIpa(ipa).silabas.reduce((n, s) => n + s.tokens.length, 0);
    assert.strictEqual(fuera, dentro, `${ipa}: entran ${dentro} fonemas y salen ${fuera}`);
  }
});

test('aguanta entradas rotas sin reventar', () => {
  assert.strictEqual(resp.desdeIpa('', 'x'), null);
  assert.strictEqual(resp.desdeIpa(null), null);
  assert.strictEqual(resp.desdeIpa('///'), null);
  assert.ok(resp.desdeIpa('/ʔ˩˥/') === null || typeof resp.desdeIpa('/ʔ˩˥/').texto === 'string');
});
