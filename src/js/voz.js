// TutorIngles — voz.js
// Todo el audio de la app pasa por aquí: el grabado y el sintético.
//
// Antes esta lógica estaba copiada en cuatro sitios (pron.js, speak.js,
// work.js, listening.js) y los cuatro tenían el mismo fallo: llamaban a
// `getVoices()` y usaban lo que devolviera. En Chrome, Android y iOS la
// PRIMERA llamada devuelve un array VACÍO —la lista se carga aparte y avisa
// con el evento `voiceschanged`—, así que la primera vez que se pulsaba
// ESCUCHAR no se asignaba ninguna voz y el móvil locutaba el inglés con su
// voz por defecto: la española. De ahí que sonara tan mal.
//
// Orden de preferencia:
//   1. Audio grabado por una persona/modelo (src/audio/frase-<id>.mp3)
//   2. Voz sintética del sistema, eligiendo la mejor disponible
//
// El audio grabado no se descubre probando URLs (cada frase sin audio sería
// un 404): se lee una vez el manifiesto src/audio/index.json que escribe
// tools/cortar-audio.js. Ficheros e índice viajan juntos en el repo, así que
// no hay forma de que se desincronicen.

// ── VOCES DEL SISTEMA ────────────────────────────────────

// Cómo se puntúa una voz. Los nombres no son adorno: en el mismo móvil
// conviven voces neuronales y voces "compact" de hace quince años, y la lista
// no viene ordenada por calidad.
const VOZ_PREMIO = [
  [/neural|natural|premium|enhanced|wavenet/i, 60],   // la marca de las buenas
  [/google uk english/i,                       50],
  [/\b(sonia|libby|ryan|abbi|alfie|elliot|olivia|maisie|thomas)\b/i, 40], // Microsoft en-GB
  [/\b(daniel|serena|kate|stephanie|oliver|arthur|martha)\b/i, 35],  // iOS y macOS en-GB
  [/\b(samantha|alex|ava|allison|nicky|aaron)\b/i,    25],  // iOS y macOS en-US, buenas
  [/\b(hazel|george|susan)\b/i,                       10],  // viejas pero pasables
];

// Apple mete en la lista un puñado de voces de broma —Albert, Bubbles, Zarvox,
// y una llamada literalmente Whisper— que salen por `getVoices()` como
// cualquier otra. Sin castigarlas, en un iPhone donde ninguna voz coincidía con
// los premios TODAS empataban a cero y ganaba la primera del array: **Albert**,
// que suena bajo y deformado. Eso era el "susurro" que se oía en el móvil.
const VOZ_CASTIGO = [
  [/compact|espeak|pico|android speech|low.?quality/i, -90],
  [/\b(albert|bad news|good news|bahh|bells|boing|bubbles|cellos|deranged|jester|organ|superstar|trinoids|whisper|wobble|zarvox|hysterical|princess|junior|ralph|fred|kathy|bruce|agnes|vicki|victoria)\b/i, -200],
];

let _vozElegida = null;
let _vozAvisada = false;

// Voz elegida a mano en Ajustes, si la hay. Manda sobre la puntuación: por
// buena que sea la heurística, el que oye el resultado es el usuario, y en
// iPhone conviven voces que suenan muy distinto con nombres casi iguales.
const VOZ_GUARDADA = 'voz_preferida';

const vozGuardada = () => { try { return localStorage.getItem(VOZ_GUARDADA); } catch { return null; } };

/** Fija (o quita, con null) la voz preferida. */
function vozElegir(voiceURI) {
  try {
    if (voiceURI) localStorage.setItem(VOZ_GUARDADA, voiceURI);
    else localStorage.removeItem(VOZ_GUARDADA);
  } catch {}
  _vozElegida = null;
  return mejorVoz();
}

/** Todas las voces inglesas del aparato, la mejor primero. */
function vozListar() {
  if (!('speechSynthesis' in window)) return [];
  return window.speechSynthesis.getVoices()
    .filter((v) => /^en/i.test((v.lang || '').replace('_', '-')))
    .map((v) => ({ voz: v, p: puntuarVoz(v) }))
    .sort((a, b) => b.p - a.p)
    .map((x) => x.voz);
}

function puntuarVoz(v) {
  const lang = (v.lang || '').replace('_', '-');
  if (!/^en/i.test(lang)) return -Infinity;      // que no sea inglesa la descarta
  let p = /^en-GB/i.test(lang) ? 30 : 0;         // el objetivo es británico
  const n = `${v.name || ''} ${v.voiceURI || ''}`;
  for (const [re, v2] of VOZ_PREMIO) if (re.test(n)) { p += v2; break; }
  for (const [re, v2] of VOZ_CASTIGO) if (re.test(n)) p += v2;
  return p;
}

/** La voz elegida a mano, o la mejor que tenga el aparato. */
function mejorVoz() {
  if (_vozElegida) return _vozElegida;
  if (!('speechSynthesis' in window)) return null;
  const voces = window.speechSynthesis.getVoices();
  if (!voces || !voces.length) return null;      // todavía no ha cargado la lista

  // Lo que haya elegido el usuario gana siempre, mientras siga instalada.
  const guardada = vozGuardada();
  if (guardada) {
    const suya = voces.find((v) => v.voiceURI === guardada);
    if (suya) { _vozElegida = suya; return suya; }
  }

  let mejor = null, mejorP = -Infinity;
  for (const v of voces) {
    const p = puntuarVoz(v);
    if (p > mejorP) { mejorP = p; mejor = v; }
  }
  _vozElegida = mejorP === -Infinity ? null : mejor;
  return _vozElegida;
}

// Se pide la lista al arrancar y se vuelve a mirar cuando el navegador avisa
// de que ya la tiene. Sin esto, la primera pulsación siempre sale sin voz.
if ('speechSynthesis' in window) {
  mejorVoz();
  window.speechSynthesis.addEventListener?.('voiceschanged', () => {
    _vozElegida = null;
    mejorVoz();
  });
}

/** ¿Hay alguna voz inglesa instalada? Sirve para avisar en vez de sonar mal. */
function hayVozInglesa() {
  if (!('speechSynthesis' in window)) return false;
  const voces = window.speechSynthesis.getVoices();
  return !voces.length || voces.some((v) => /^en/i.test(v.lang || ''));
}

// ── AUDIO GRABADO ────────────────────────────────────────

let _manifiesto = null;        // Set con los ids de frase que tienen mp3
let _porTexto   = null;        // palabra normalizada -> id de word-<id>.mp3
let _manifiestoPedido = false;

/**
 * Clave con la que se busca una palabra en el índice.
 * Tiene que dar exactamente lo mismo que `clavePalabra` de
 * tools/cortar-audio.js, que es quien escribe el índice.
 */
const clavePalabra = (s) => String(s || '')
  .toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9' ]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

/** Carga una sola vez la lista de frases y palabras con audio grabado. */
async function cargarManifiestoAudio() {
  if (_manifiestoPedido) return _manifiesto;
  _manifiestoPedido = true;
  try {
    const r = await fetch('src/audio/index.json', { cache: 'no-cache' });
    if (!r.ok) throw new Error(String(r.status));
    const j = await r.json();
    _manifiesto = new Set((j.frases || []).map(String));
    _porTexto   = j.porTexto || {};
  } catch {
    _manifiesto = new Set();   // sin audio grabado se tira de voz sintética
    _porTexto   = {};
  }
  return _manifiesto;
}
cargarManifiestoAudio();

/** ¿Esta frase tiene audio de verdad? */
function tieneAudioReal(id) {
  return !!(_manifiesto && id != null && _manifiesto.has(String(id)));
}

/** Id del mp3 de una palabra suelta, o null si no está grabada. */
function audioDePalabra(texto) {
  if (!_porTexto) return null;
  const id = _porTexto[clavePalabra(texto)];
  return id == null ? null : id;
}

// ── REPRODUCCIÓN ─────────────────────────────────────────

let _audio = null;             // <audio> en curso, para poder cortarlo
let _guardia = null;           // temporizador del apaño de Chrome

/** Corta cualquier cosa que esté sonando. */
function vozParar() {
  if (_audio) {
    // Igual que al terminar: soltar el elemento, no sólo pausarlo, para que iOS
    // cierre la sesión de media y deje de atenuar la voz del sistema.
    _audio.pause();
    _audio.removeAttribute('src');
    _audio.load();
    _audio = null;
  }
  if (_guardia) { clearInterval(_guardia); _guardia = null; }
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

/**
 * Lee un texto con la voz del sistema.
 *   rate  0.9 por defecto. Por debajo de 0.85 los sintetizadores de móvil
 *         estiran los fonemas y suenan a robot, que es peor que ir rápido.
 *   veces repeticiones seguidas (el entrenador de oído las usa)
 *   btn   botón al que animar mientras suena
 */
function vozDecir(texto, opciones = {}) {
  const { rate = 0.9, veces = 1, btn = null, lang = 'en-GB', sinGrabado = false } = opciones;

  // Si esa palabra está grabada, se oye la grabada. Se comprueba AQUÍ y no en
  // cada pantalla a propósito: VOCABULARIO, SONIDOS y la sesión llaman todas a
  // `pronDecir(texto)` sin conocer ningún id, así que buscando por texto las
  // tres pasan a sonar con la misma voz sin tocar una línea de ellas. Y de paso
  // desaparece el problema de iOS con los enunciados de una sola palabra, que
  // es justo donde se notaba.
  const idPal = (veces === 1 && !sinGrabado) ? audioDePalabra(texto) : null;
  if (idPal != null) return vozReproducir(`src/audio/word-${idPal}.mp3`, btn, texto, opciones);

  if (!('speechSynthesis' in window)) {
    if (typeof toast === 'function') toast('Este navegador no lee en voz alta', 'error');
    return false;
  }
  vozParar();

  const voz = mejorVoz();
  // Sin voz inglesa el móvil leería el inglés con la voz española. Es mejor
  // decirlo que dejar que suene mal y que parezca culpa de la app.
  if (!voz && !hayVozInglesa() && !_vozAvisada) {
    _vozAvisada = true;
    if (typeof toast === 'function') {
      toast('Tu móvil no tiene voz inglesa instalada: sonará raro', 'error');
    }
  }

  // iOS arranca el motor de voz TARDE, y en un enunciado de una sola palabra no
  // le da tiempo: la palabra sale a medio volumen y con la primera sílaba
  // comida. Con una frase entera no se nota, porque para cuando llega a la
  // segunda palabra ya está a pleno. Ése era el "susurro" de PALABRAS y
  // SONIDOS —que leen `receipt`, `size`— frente a la frase del sector o el
  // botón de probar voz de Ajustes, que suenan perfectos con el MISMO código.
  //
  // Se encola delante un enunciado mudo que despierta el motor. Cuando le toca
  // al de verdad, ya está caliente y sale entero.
  if (vozEsIOS() && texto.trim().length < 30) {
    const calienta = new SpeechSynthesisUtterance('.');
    calienta.volume = 0;
    calienta.rate   = 1;
    if (voz) calienta.voice = voz;
    calienta.lang = voz?.lang || lang;
    window.speechSynthesis.speak(calienta);
  }

  for (let i = 0; i < veces; i++) {
    // Un punto al final le da cola al enunciado: sin él, iOS corta también el
    // final de las palabras cortas.
    const u = new SpeechSynthesisUtterance(/[.!?]\s*$/.test(texto) ? texto : `${texto}.`);
    u.lang = voz?.lang || lang;
    u.rate = rate;
    u.volume = 1;                 // explícito: que nadie lo herede a medias
    if (voz) u.voice = voz;
    if (btn && i === 0) btn.classList.add('anim-pulse');
    if (btn && i === veces - 1) {
      u.onend = u.onerror = () => { btn.classList.remove('anim-pulse'); pararGuardia(); };
    }
    window.speechSynthesis.speak(u);
  }

  // Chrome corta la locución a los ~15 s y un pause()+resume() periódico lo
  // evita. Pero en iOS ese mismo apaño es el problema y no la solución: WebKit
  // no tiene el fallo de los 15 s, y en cambio pausar y reanudar a mitad de
  // frase deja la voz apagada y entrecortada. Con el guion de listening —el
  // único texto que pasa de 120 caracteres— se oía "susurrado" en el iPhone
  // mientras en el PC sonaba igual que siempre. Así que el apaño va donde hace
  // falta y en ningún sitio más.
  if (texto.length > 120 && !vozEsIOS()) {
    _guardia = setInterval(() => {
      if (!window.speechSynthesis.speaking) return pararGuardia();
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
    }, 10000);
  }
  return true;
}

// ¿Es un iPhone o iPad? (los iPad modernos se anuncian como Mac).
// Se llama `vozEsIOS` y no `esIOS` porque avisos.js ya declara ese nombre en el
// ámbito global: dos `const` iguales en dos scripts clásicos revientan el
// segundo entero con "has already been declared", y ahí caería la tarjeta que
// activa los avisos sin ningún síntoma que apunte a la voz.
const vozEsIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

function pararGuardia() {
  if (_guardia) { clearInterval(_guardia); _guardia = null; }
}

/**
 * Reproduce un mp3 grabado. Si falla, cae a la voz del sistema para no dejar
 * al usuario sin nada.
 *
 * Al acabar SUELTA el elemento, no lo deja pausado: si se queda vivo, iOS
 * mantiene abierta la sesión de audio de "media" y atenúa la voz del sistema en
 * todo lo que venga después.
 */
function vozReproducir(url, btn, textoRespaldo, opciones = {}) {
  vozParar();
  const a = new Audio(url);
  _audio = a;
  const soltar = () => {
    if (btn) btn.classList.remove('anim-pulse');
    a.pause();
    a.removeAttribute('src');
    a.load();
    if (_audio === a) _audio = null;
  };
  if (btn) btn.classList.add('anim-pulse');
  a.onended = soltar;
  a.onerror = soltar;
  a.play().catch(() => {
    soltar();
    // `sinGrabado` evita volver a entrar aquí y quedarse en bucle.
    vozDecir(textoRespaldo, { ...opciones, btn, sinGrabado: true });
  });
  return 'grabado';
}

/**
 * Reproduce una frase: audio grabado si lo hay, voz del sistema si no.
 * Devuelve 'grabado' | 'sintetico' | null, para poder decirle al usuario qué
 * está oyendo — no es lo mismo imitar a una persona que imitar a una máquina.
 */
function vozFrase(id, texto, opciones = {}) {
  if (tieneAudioReal(id)) {
    return vozReproducir(`src/audio/frase-${id}.mp3`, opciones.btn || null, texto, opciones);
  }
  return vozDecir(texto, opciones) ? 'sintetico' : null;
}

/** Etiqueta para avisar de qué se está oyendo. */
function vozEtiqueta(id) {
  return tieneAudioReal(id)
    ? '<span class="voz-et voz-et-real">voz real</span>'
    : '<span class="voz-et voz-et-tts">voz del móvil</span>';
}
