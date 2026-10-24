// Tests de las pantallas de IA (src/js/ia.js y su cableado en index.html y sw.js).
// Ejecutar:  npm test
//
// Lo que protegen, por orden de lo que costaría descubrirlo en el móvil:
//
//  - Que los <script> de index.html cargan JUNTOS. Comparten un único ámbito
//    global: dos `const` con el mismo nombre en dos ficheros revientan el
//    segundo entero con "has already been declared", y el síntoma no apunta al
//    culpable (una pantalla entera deja de existir).
//  - Que el service worker conoce los ficheros nuevos (si no, sin conexión la
//    app arranca sin la IA) y que /ia no se cachea nunca.
//  - Que todo lo que pinta la IA sale escapado. Claude cita lo que el alumno
//    dictó o escribió: un `<img onerror>` acabaría ejecutándose.
//  - Que `via: 'voz'` sólo sale del micrófono: es lo que decide si se marca HABLAR.

const test   = require('node:test');
const assert = require('node:assert');
const fs     = require('node:fs');
const path   = require('node:path');
const vm     = require('node:vm');

const RAIZ = path.join(__dirname, '..');
const leer = (...p) => fs.readFileSync(path.join(RAIZ, ...p), 'utf8');
const HTML = leer('index.html');
const SW   = leer('sw.js');
const SCRIPTS = [...HTML.matchAll(/<script src="(src\/js\/[^"]+)"/g)].map((m) => m[1]);
const HOJAS   = [...HTML.matchAll(/<link rel="stylesheet" href="(src\/css\/[^"]+)"/g)].map((m) => m[1]);

// ── Cableado ──────────────────────────────────────────────

test('los scripts de index.html cargan todos juntos y en orden, sin nombres repetidos', () => {
  // Un objeto que acepta cualquier cosa: sustituye al DOM, que un script sólo
  // debería tocar dentro de funciones, no al cargarse.
  const cualquiera = () => new Proxy(function () {}, {
    get: (t, k) => (k === Symbol.toPrimitive ? () => '' : k === 'then' ? undefined : cualquiera()),
    apply: () => cualquiera(), construct: () => cualquiera(), set: () => true, has: () => true,
  });
  const ctx = {
    console: { log() {}, warn() {}, error() {}, info() {} },
    setTimeout: () => 0, setInterval: () => 0, clearTimeout() {}, clearInterval() {},
    URLSearchParams, Intl, AbortController,
  };
  for (const k of ['window', 'document', 'navigator', 'localStorage', 'sessionStorage', 'location', 'fetch',
    'speechSynthesis', 'Notification', 'Audio', 'SpeechSynthesisUtterance', 'matchMedia',
    'requestAnimationFrame', 'AbortSignal', 'history', 'screen', 'performance']) ctx[k] = cualquiera();
  vm.createContext(ctx);
  for (const s of SCRIPTS) {
    assert.doesNotThrow(() => vm.runInContext(leer(s), ctx, { filename: s }), `${s} no carga junto a los demás`);
  }
  assert.ok(SCRIPTS.includes('src/js/ia.js') && SCRIPTS.includes('src/js/charla.js'));
  // ia.js usa escaparHtml, que vive en pron.js: tiene que ir detrás.
  assert.ok(SCRIPTS.indexOf('src/js/ia.js') > SCRIPTS.indexOf('src/js/pron.js'));
});

test('el service worker precachea cada script y cada hoja de index.html, y nunca cachea /ia', () => {
  for (const f of [...SCRIPTS, ...HOJAS]) {
    assert.ok(SW.includes(`'/${f}'`), `falta /${f} en PRECACHE de sw.js`);
  }
  const prefijos = SW.slice(SW.indexOf('API_PREFIXES'), SW.indexOf('];', SW.indexOf('API_PREFIXES')));
  assert.match(prefijos, /'\/ia'/, '/ia tiene que estar en API_PREFIXES');
});

test('los globales nuevos de la IA llevan el prefijo ia o charla', () => {
  for (const f of ['src/js/ia.js', 'src/js/charla.js']) {
    const nombres = [...leer(f).matchAll(/^(?:async\s+)?(?:function\s*\*?\s*|const\s+|let\s+|var\s+|class\s+)([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]);
    assert.ok(nombres.length > 0 || f.endsWith('charla.js'), `${f} sin declaraciones`);
    for (const n of nombres) assert.match(n, /^(ia|IA_|charla|CHARLA_)/, `${f}: «${n}» no lleva prefijo`);
  }
});

test('en HOY no hay más botón primario que EMPEZAR', () => {
  const hoy = HTML.slice(HTML.indexOf('id="sec-hoy"'), HTML.indexOf('id="sec-work"'));
  assert.strictEqual((hoy.match(/btn-primary/g) || []).length, 1);
  // El plan se pinta dentro de HOY.
  assert.ok(!/btn-primary/.test(leer('src/js/plan.js')), 'plan.js pinta un primario en HOY');
});

// ── ia.js ─────────────────────────────────────────────────

// ia.js en un contexto con lo mínimo que usa de los demás scripts. escaparHtml
// y escaparAttr se sacan de pron.js tal cual, para probar los de verdad.
function cargarIa({ onLine = true } = {}) {
  const pron = leer('src/js/pron.js');
  const escapar = pron.match(/^const escaparHtml = [\s\S]*?;\r?\nconst escaparAttr = .*$/m);
  assert.ok(escapar, 'no encuentro escaparHtml/escaparAttr en pron.js');
  const ctx = vm.createContext({
    console: { log() {}, warn() {}, error() {}, info() {} },
    navigator: { onLine },
    AbortController, setTimeout, clearTimeout,
  });
  vm.runInContext(`${escapar[0]}
    const IDIOMA_INFO = { en: { voz: 'en-GB' }, fr: { voz: 'fr-FR' } };
    const idiomaVoz = () => 'fr-FR';
    function ico(n, s) { return '<img src="src/img/icons/' + n + '.png" class="ico">'; }`, ctx);
  vm.runInContext(leer('src/js/ia.js'), ctx, { filename: 'ia.js' });
  return (expr) => vm.runInContext(expr, ctx);
}

const MALO = '<img src=x onerror="alert(1)">';
// Escapado = no queda ninguna etiqueta del atacante. El texto "onerror=" puede
// seguir ahí, pero dentro de &lt;…&gt; es sólo texto.
const sinEtiquetas = (html) => !/<img src=x|<script/i.test(html);

test('todo lo que pinta la IA sale escapado', () => {
  const ia = cargarIa();
  const pron = ia('iaHtmlPronunciacion')({
    puntuacion: 50, entendido: false, resumen: MALO, ejercicio: MALO,
    palabras: [{ palabra: MALO, oido: MALO, problema: MALO, consejo: MALO, figurada: MALO }],
    tarjetas: [{ word: MALO }], coste: 0.01,
  }, 'fr');
  assert.ok(sinEtiquetas(pron), pron);
  assert.ok(sinEtiquetas(ia('iaHtmlCorrecciones')([{ original: MALO, corregido: MALO, explicacion: MALO, tipo: 'gramatica' }])));
  assert.ok(sinEtiquetas(ia('iaHtmlCorrecciones')([{ dijiste: MALO, mejor: MALO }])));
  assert.ok(sinEtiquetas(ia('iaHtmlLista')([MALO], { decir: 'fr' })));
  assert.ok(sinEtiquetas(ia('iaHtmlParrafos')(`${MALO}\n\n${MALO}`)));
  assert.ok(sinEtiquetas(ia('iaHtmlPlegable')(MALO, 'x')));
  assert.ok(sinEtiquetas(ia('iaHtmlError')({ codigo: 'api', message: MALO })));
  assert.ok(sinEtiquetas(ia('iaHtmlCargando')(MALO)));
  // Un nivel que no es un nivel no llega a la clase CSS.
  assert.strictEqual(ia('iaHtmlNivel')('B1" onclick="x'), '');
  assert.match(ia('iaHtmlNivel')('B1'), /badge-b1/);
});

test('el altavoz lleva el texto en data-*, a salvo de apóstrofos y comillas', () => {
  const ia = cargarIa();
  const frase = 'S\'il vous plaît, "deux" croissants <b>';
  const html = ia('iaHtmlBotonDecir')(frase, 'fr');
  const m = html.match(/data-ia-decir="([^"]*)"/);
  assert.ok(m, html);
  const vuelta = m[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  assert.strictEqual(vuelta, frase);
  assert.match(html, /onclick="iaDecirBoton\(this\)"/);
  assert.strictEqual(ia('iaVozDe')('fr'), 'fr-FR');
  assert.strictEqual(ia('iaVozDe')('en'), 'en-GB');
  assert.strictEqual(ia('iaVozDe')('otra cosa'), 'fr-FR');   // el idioma activo
});

test('via es "voz" sólo si lo enviado es exactamente lo que dio el micrófono', () => {
  const via = cargarIa()('iaViaDe');
  assert.strictEqual(via('je voudrais une baguette', 'je voudrais une baguette'), 'voz');
  assert.strictEqual(via('  je voudrais  une baguette ', 'je voudrais une baguette'), 'voz');
  assert.strictEqual(via('je voudrais une baguette, merci', 'je voudrais une baguette'), 'texto');
  assert.strictEqual(via('je voudrais une baguette', ''), 'texto');
  assert.strictEqual(via('je voudrais une baguette', null), 'texto');
  assert.strictEqual(via('', ''), 'texto');
});

test('los errores se enseñan con una frase, nunca con "HTTP 502"', () => {
  const ia = cargarIa();
  const txt = ia('iaTextoError');
  const conCodigo = Object.assign(new Error('Este mes ya se han gastado 15,00 $'), { codigo: 'tope', status: 402 });
  assert.strictEqual(txt(conCodigo), 'Este mes ya se han gastado 15,00 $');
  const de400 = Object.assign(new Error('Escribe al menos 15 palabras'), { status: 400 });
  assert.strictEqual(txt(de400), 'Escribe al menos 15 palabras');
  assert.match(txt(Object.assign(new Error('HTTP 502'), { status: 502 })), /No se ha podido hablar con la IA/);
  assert.match(txt(new TypeError('Failed to fetch')), /No se ha podido hablar con la IA/);
  assert.match(cargarIa({ onLine: false })('iaTextoError')(conCodigo), /Sin conexión/);
  // Los que se arreglan en Ajustes llevan el botón; los demás, no.
  assert.match(ia('iaHtmlError')({ codigo: 'sin_clave', message: 'x' }), /AJUSTES/);
  assert.doesNotMatch(ia('iaHtmlError')({ codigo: 'rechazo', message: 'x' }), /AJUSTES/);
});

test('las alternativas del reconocedor se leen con su confianza, como mucho cinco', () => {
  const alts = cargarIa()('iaAlternativasDe');
  const res = Object.assign(
    [' ship ', 'sheep', '', 'chip', 'shop', 'shape', 'sip'].map((t, i) => ({ transcript: t, confidence: 0.9 - i / 10 })),
    { isFinal: true });
  const r = alts(res);
  assert.strictEqual(r.length, 4);   // de las 5 primeras, una venía vacía
  assert.deepStrictEqual(JSON.parse(JSON.stringify(r[0])), { transcript: 'ship', confidence: 0.9 });
  assert.strictEqual(alts(undefined).length, 0);
});

test('Ajustes nunca vuelve a enseñar la clave', () => {
  const html = cargarIa()('iaHtmlAjustes')({
    disponible: true, origen_clave: 'ajustes', clave_final: 'ab12', sin_token: false, modelo: 'claude-opus-5-5',
    modelos: [{ id: 'claude-opus-5-5', nombre: 'Claude Opus 5.5', entrada: 4, salida: 20 }],
    tope_mes: 15, gasto_mes: 1.84, gasto_total: 3.12, credito: 100, credito_restante: 96.88, llamadas_mes: 143,
  });
  const campo = html.match(/<input[^>]*id="ia-clave"[^>]*>/);
  assert.ok(campo, 'falta el campo de la clave');
  assert.match(campo[0], /type="password"/);
  assert.doesNotMatch(campo[0], /\svalue=/, 'el campo de la clave no se rellena nunca');
  assert.doesNotMatch(html, /sk-ant-[A-Za-z0-9]/);
  assert.match(html, /…ab12/);
  // Con la clave en Render no hay campo: allí manda la variable de entorno.
  const render = cargarIa()('iaHtmlAjustes')({ disponible: true, origen_clave: 'entorno', clave_final: 'zz99', modelos: [] });
  assert.doesNotMatch(render, /id="ia-clave"/);
});
