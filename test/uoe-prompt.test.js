// Tests del despiece del enunciado de Use of English (uoePartes, en src/js/exam.js).
// Ejecutar:  npm test
//
// Por qué existe este fichero: el banco guarda la transformación entera en una
// sola cadena —"original" || segunda con ____ [KEY]— y el test de nivel la
// pintaba en crudo. Salía el `||` y el `[HAVE]` a la vista y no decía que sólo
// hay que escribir el trozo del hueco, así que quien contestaba la frase entera
// fallaba aunque se la supiera. Seis de las veinticuatro preguntas del
// diagnóstico son de este tipo: eso no mide el nivel, mide la pantalla.
//
// exam.js es un script clásico de navegador (no hay require ni módulos), así que
// se evalúa en un contexto de vm. Sólo declara funciones y constantes al
// cargarse: no toca `document` hasta que se llama a alguna.

const test   = require('node:test');
const assert = require('node:assert');
const fs     = require('node:fs');
const path   = require('node:path');
const vm     = require('node:vm');

const ctx = vm.createContext({});
vm.runInContext(
  fs.readFileSync(path.join(__dirname, '..', 'src', 'js', 'exam.js'), 'utf8'),
  ctx, { filename: 'exam.js' });

// Se leen evaluando su nombre en el mismo contexto, no como propiedades del
// objeto global: un `const` de nivel superior no cuelga de window. Ese es
// justamente el ámbito que comparten los <script> clásicos de index.html, que es
// como diagnostico.js llega a estas dos funciones.
const uoePartes = vm.runInContext('uoePartes', ctx);
const uoeHueco  = vm.runInContext('uoeHueco', ctx);

// Enunciado real de la base (migration_06).
const TRANSFORMACION = {
  part: 'key_word_transformation',
  prompt: '"They will probably cancel the outdoor concert." || The outdoor concert ____ cancelled. [LIKELY]',
  answer: 'is likely to be',
  given_word: 'LIKELY',
};

test('la transformación se parte en las dos frases', () => {
  const p = uoePartes(TRANSFORMACION);
  assert.strictEqual(p.intro, '"They will probably cancel the outdoor concert."');
  assert.strictEqual(p.frase, 'The outdoor concert ____ cancelled.');
});

test('ni el separador ni la palabra entre corchetes llegan a la pantalla', () => {
  const p = uoePartes(TRANSFORMACION);
  for (const trozo of [p.intro, p.frase]) {
    assert.ok(!trozo.includes('||'), `el separador no debe verse: ${trozo}`);
    assert.ok(!/\[[^\]]+\]/.test(trozo), `la clave no debe verse entre corchetes: ${trozo}`);
  }
});

test('la palabra clave se saca de los corchetes y se muestra aparte', () => {
  assert.strictEqual(uoePartes(TRANSFORMACION).clave, 'LIKELY');
});

test('dice cuánto hay que escribir, que es lo que decide si se acierta', () => {
  // La corrección compara la cadena exacta contra "is likely to be": sin este
  // aviso, contestar la frase entera cuenta como fallo.
  assert.match(uoePartes(TRANSFORMACION).ayuda, /3-6 palabras/);
});

test('si falta el corchete tira de given_word en vez de quedarse sin clave', () => {
  const p = uoePartes({ ...TRANSFORMACION, prompt: '"Original." || Segunda ____ frase.' });
  assert.strictEqual(p.clave, 'LIKELY');
});

test('word_formation enseña la base y open_cloze pide una sola palabra', () => {
  const wf = uoePartes({ part: 'word_formation', prompt: 'a largely ____ coastline. (POPULATE)', given_word: 'POPULATE' });
  assert.strictEqual(wf.clave, 'POPULATE');
  assert.strictEqual(wf.intro, '');

  const oc = uoePartes({ part: 'open_cloze', prompt: 'No sooner ____ she arrived...' });
  assert.strictEqual(oc.clave, '');
  assert.match(oc.ayuda, /una sola palabra/);
});

test('el mc_cloze pasa la frase entera sin tocarla', () => {
  const p = uoePartes({ part: 'mc_cloze', prompt: 'The committee reached a ____ decision.' });
  assert.strictEqual(p.frase, 'The committee reached a ____ decision.');
  assert.strictEqual(p.intro, '');
});

test('aguanta una pregunta rota sin reventar el render entero', () => {
  for (const roto of [{}, { part: 'key_word_transformation' }, { part: 'open_cloze', prompt: null }]) {
    const p = uoePartes(roto);
    assert.strictEqual(typeof p.frase, 'string');
    assert.strictEqual(typeof p.clave, 'string');
  }
});

test('el hueco se resalta, y sólo el hueco', () => {
  assert.strictEqual(uoeHueco('a ____ b'), 'a <span class="quiz-gap">____</span> b');
  assert.strictEqual(uoeHueco('sin hueco'), 'sin hueco');
});
