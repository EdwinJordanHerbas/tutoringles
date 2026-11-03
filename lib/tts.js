// TutorIngles — lib/tts.js
// Audio de verdad para el alemán: un mp3 que el móvil reproduce como cualquier
// audio, sin depender de la voz del sistema.
//
// Por qué existe (3-nov-2026): en el iPhone la voz del sistema no sonaba en
// CONVERSAR. Puede callarse por el modo silencio, por no tener voz alemana o por
// el dictado, y desde la web no se puede saber cuál de las tres es. Un <audio>
// suena en todos esos casos.
//
// Usa el lector de Google Translate, que no es un servicio oficial y no pide
// clave: puede dejar de funcionar. Por eso voz.js cae a la voz del sistema si
// esto falla, y lo pide el servidor, no el móvil: así no hay problemas de CORS.
// Lo que se manda a Google es sólo la frase que hay que leer.

const LARGO_TROZO = 190;     // el lector corta a los 200 caracteres
const LARGO_MAX = 1200;
const TIEMPO_MS = 10000;
const CACHE_MAX = 200;
const cache = new Map();

/** Parte un texto en trozos que quepan, por frases y, si no, por palabras. */
function trocear(texto, max = LARGO_TROZO) {
  const frases = String(texto).replace(/\s+/g, ' ').trim().match(/[^.!?]+[.!?]*\s*/g) || [];
  const trozos = [];
  let actual = '';
  const meter = (t) => {
    if (actual && (actual.length + t.length) > max) { trozos.push(actual.trim()); actual = ''; }
    actual += t;
  };
  for (const f of frases) {
    if (f.length <= max) { meter(f); continue; }
    for (const p of f.split(' ')) meter(`${p} `);
  }
  if (actual.trim()) trozos.push(actual.trim());
  return trozos;
}

async function pedirTrozo(texto, lang, pedir) {
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${lang}&q=${encodeURIComponent(texto)}`;
  const r = await pedir(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(TIEMPO_MS),
  });
  if (!r.ok) throw new Error(`lector: HTTP ${r.status}`);
  const tipo = r.headers.get('content-type') || '';
  if (!/audio|mpeg/.test(tipo)) throw new Error(`lector: respuesta ${tipo || 'sin tipo'}`);
  return Buffer.from(await r.arrayBuffer());
}

/** Devuelve el mp3 de un texto. Las frases repetidas no se vuelven a pedir. */
async function audioDe(texto, lang = 'de', pedir = fetch) {
  const limpio = String(texto || '').trim().slice(0, LARGO_MAX);
  if (!limpio) throw new Error('texto vacío');
  const clave = `${lang}|${limpio}`;
  if (cache.has(clave)) return cache.get(clave);
  const partes = [];
  for (const t of trocear(limpio)) partes.push(await pedirTrozo(t, lang, pedir));
  const audio = Buffer.concat(partes);
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(clave, audio);
  return audio;
}

module.exports = { audioDe, trocear };
