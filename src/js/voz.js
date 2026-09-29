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
//
// DOS IDIOMAS (27-sep-2026). Todo lo de aquí va ahora por idioma: la voz se
// elige y se puntúa para el idioma de lo que se lee, y la preferida se guarda
// una por idioma. El audio grabado (Emily) es SÓLO inglés: el índice se busca
// por texto, y sin este filtro la palabra francesa "table" habría sonado con
// la grabación inglesa de "table".

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

// Lo mismo para el francés. Ojo con Amélie y Chantal: en iOS son de Quebec
// (fr-CA), y el acento canadiense no es el que va a oír en Lausana. Por eso el
// fr-CA puntúa por debajo del fr-FR aunque la voz sea buena. Ariane y Fabrice
// son las voces neuronales suizas de Microsoft (fr-CH): si el aparato las
// tiene, son las mejores posibles para lo que viene.
const VOZ_PREMIO_FR = [
  [/neural|natural|premium|enhanced|wavenet/i, 60],
  [/\b(ariane|fabrice)\b/i,                         55],  // Microsoft fr-CH
  [/google fran[cç]ais/i,                          50],
  [/\b(denise|henri|eloise|vivienne|remy|brigitte|alain|jacqueline)\b/i, 40], // Microsoft fr-FR
  [/\b(thomas|audrey|aur[eé]lie|marie|daniel)\b/i,  35],  // iOS y macOS fr-FR
];

// Qué variante del idioma se prefiere, a igualdad de calidad.
const VOZ_VARIANTE = {
  en: [[/^en-GB/i, 30]],
  fr: [[/^fr-CH/i, 35], [/^fr-FR/i, 30], [/^fr-BE/i, 15], [/^fr-CA/i, 0]],
};

/** 'fr-FR' → 'fr'. Lo que no se reconozca, inglés. */
const vozBase = (lang) => (/^fr/i.test(lang || '') ? 'fr' : 'en');

/** La etiqueta del idioma activo, si app.js ya la tiene. */
const vozLangActivo = () => (typeof idiomaVoz === 'function' ? idiomaVoz() : 'en-GB');

// Apple mete en la lista un puñado de voces de broma —Albert, Bubbles, Zarvox,
// y una llamada literalmente Whisper— que salen por `getVoices()` como
// cualquier otra. Sin castigarlas, en un iPhone donde ninguna voz coincidía con
// los premios TODAS empataban a cero y ganaba la primera del array: **Albert**,
// que suena bajo y deformado. Eso era el "susurro" que se oía en el móvil.
const VOZ_CASTIGO = [
  [/compact|espeak|pico|android speech|low.?quality/i, -90],
  [/\b(albert|bad news|good news|bahh|bells|boing|bubbles|cellos|deranged|jester|organ|superstar|trinoids|whisper|wobble|zarvox|hysterical|princess|junior|ralph|fred|kathy|bruce|agnes|vicki|victoria)\b/i, -200],
];

// Voz elegida por idioma: { en: SpeechSynthesisVoice, fr: … }.
const _vozElegida = {};
const _vozAvisada = {};

// Voz elegida a mano en Ajustes, si la hay. Manda sobre la puntuación: por
// buena que sea la heurística, el que oye el resultado es el usuario, y en
// iPhone conviven voces que suenan muy distinto con nombres casi iguales.
// La del inglés conserva la clave de siempre para no perder la que ya había.
const VOZ_GUARDADA = { en: 'voz_preferida', fr: 'voz_preferida_fr' };

const vozGuardada = (base) => {
  try { return localStorage.getItem(VOZ_GUARDADA[base]); } catch { return null; }
};

/** Fija (o quita, con null) la voz preferida de un idioma. */
function vozElegir(voiceURI, lang = vozLangActivo()) {
  const base = vozBase(lang);
  try {
    if (voiceURI) localStorage.setItem(VOZ_GUARDADA[base], voiceURI);
    else localStorage.removeItem(VOZ_GUARDADA[base]);
  } catch {}
  delete _vozElegida[base];
  return mejorVoz(lang);
}

/** Todas las voces de un idioma que tiene el aparato, la mejor primero. */
function vozListar(lang = vozLangActivo()) {
  if (!('speechSynthesis' in window)) return [];
  const base = vozBase(lang);
  return window.speechSynthesis.getVoices()
    .filter((v) => (v.lang || '').replace('_', '-').toLowerCase().startsWith(base))
    .map((v) => ({ voz: v, p: puntuarVoz(v, base) }))
    .sort((a, b) => b.p - a.p)
    .map((x) => x.voz);
}

function puntuarVoz(v, base = 'en') {
  const lang = (v.lang || '').replace('_', '-');
  if (!lang.toLowerCase().startsWith(base)) return -Infinity;   // otro idioma: fuera
  let p = 0;
  for (const [re, v2] of VOZ_VARIANTE[base] || []) if (re.test(lang)) { p += v2; break; }
  const n = `${v.name || ''} ${v.voiceURI || ''}`;
  for (const [re, v2] of (base === 'fr' ? VOZ_PREMIO_FR : VOZ_PREMIO)) if (re.test(n)) { p += v2; break; }
  for (const [re, v2] of VOZ_CASTIGO) if (re.test(n)) p += v2;
  return p;
}

/** La voz elegida a mano para ese idioma, o la mejor que tenga el aparato. */
function mejorVoz(lang = vozLangActivo()) {
  const base = vozBase(lang);
  if (_vozElegida[base]) return _vozElegida[base];
  if (!('speechSynthesis' in window)) return null;
  const voces = window.speechSynthesis.getVoices();
  if (!voces || !voces.length) return null;      // todavía no ha cargado la lista

  // Lo que haya elegido el usuario gana siempre, mientras siga instalada.
  const guardada = vozGuardada(base);
  if (guardada) {
    const suya = voces.find((v) => v.voiceURI === guardada);
    if (suya) { _vozElegida[base] = suya; return suya; }
  }

  let mejor = null, mejorP = -Infinity;
  for (const v of voces) {
    const p = puntuarVoz(v, base);
    if (p > mejorP) { mejorP = p; mejor = v; }
  }
  if (mejorP === -Infinity) return null;
  _vozElegida[base] = mejor;
  return mejor;
}

// Se pide la lista al arrancar y se vuelve a mirar cuando el navegador avisa
// de que ya la tiene. Sin esto, la primera pulsación siempre sale sin voz.
if ('speechSynthesis' in window) {
  mejorVoz('en-GB');
  window.speechSynthesis.addEventListener?.('voiceschanged', () => {
    delete _vozElegida.en;
    delete _vozElegida.fr;
    mejorVoz('en-GB');
  });
}

/** ¿Hay alguna voz de ese idioma instalada? Sirve para avisar en vez de sonar mal. */
function hayVozDe(lang = vozLangActivo()) {
  if (!('speechSynthesis' in window)) return false;
  const base = vozBase(lang);
  const voces = window.speechSynthesis.getVoices();
  return !voces.length || voces.some((v) => (v.lang || '').toLowerCase().startsWith(base));
}
const hayVozInglesa = () => hayVozDe('en-GB');

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

// ── CÁMARA LENTA ─────────────────────────────────────────
//
// Ralentizar sirve para oír lo que va DEMASIADO RÁPIDO, no para separar dos
// sonidos parecidos. Los dos motores además se portan al revés:
//
// - En el mp3 el navegador hace time-stretch (mantiene el tono y alarga la
//   señal). Con vocales, que son estacionarias, sale limpio. 0,7 es el suelo:
//   por debajo los artefactos ya se oyen.
// - En la voz del sistema el `rate` RE-SINTETIZA, y por debajo de 0,85 los
//   sintetizadores de móvil estiran los fonemas y suenan a robot. Así que
//   aquí lento significa mucho menos lento.
//
// Y `preservesPitch` se queda en true SIEMPRE. Bajar el tono desplaza las
// formantes, y las formantes son lo que define qué vocal oyes: una /ɪ/
// ralentizada "a lo cinta" puede percibirse como otra vocal distinta. En una
// app de fonética eso es enseñar el sonido equivocado con mucho aplomo.
const VOZ_LENTO_MP3 = 0.7;
const VOZ_LENTO_TTS = 0.85;

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
  const { veces = 1, btn = null, sinGrabado = false, lento = false } = opciones;
  // Sin idioma explícito se lee en el que se está estudiando. Lo que es
  // siempre inglés (SONIDOS, listening) lo pide explícitamente.
  const lang = opciones.lang || vozLangActivo();
  const base = vozBase(lang);
  const rate = opciones.rate ?? (lento ? VOZ_LENTO_TTS : 0.9);
  // Volumen de la voz del sistema (0-1). Lo usa el modo noche: una pista tiene
  // que oírse apenas. En iOS el volumen de un <audio> no se puede tocar desde
  // la página, pero el de la voz sintética sí se respeta.
  const volumen = Math.max(0, Math.min(1, opciones.volumen ?? 1));

  // Si esa palabra está grabada, se oye la grabada. Se comprueba AQUÍ y no en
  // cada pantalla a propósito: VOCABULARIO, SONIDOS y la sesión llaman todas a
  // `pronDecir(texto)` sin conocer ningún id, así que buscando por texto las
  // tres pasan a sonar con la misma voz sin tocar una línea de ellas. Y de paso
  // desaparece el problema de iOS con los enunciados de una sola palabra, que
  // es justo donde se notaba.
  //
  // La búsqueda ya no depende de `veces`. Antes era `veces === 1 && …`, así que
  // pedir dos repeticiones de una palabra grabada devolvía la voz del móvil en
  // vez de la de la app: cambiaba de voz a mitad de ejercicio, justo cuando se
  // está intentando afinar el oído. Nadie llamaba con veces>1 todavía, así que
  // nunca llegó a verse.
  const idPal = sinGrabado || base !== 'en' ? null : audioDePalabra(texto);
  if (idPal != null) return vozReproducir(`src/audio/word-${idPal}.mp3`, btn, texto, opciones);

  if (!('speechSynthesis' in window)) {
    if (typeof toast === 'function') toast('Este navegador no lee en voz alta', 'error');
    return false;
  }
  vozParar();

  const voz = mejorVoz(lang);
  // Sin voz del idioma el móvil lo leería con la voz española. Es mejor
  // decirlo que dejar que suene mal y que parezca culpa de la app.
  if (!voz && !hayVozDe(lang) && !_vozAvisada[base]) {
    _vozAvisada[base] = true;
    if (typeof toast === 'function') {
      toast(`Tu móvil no tiene voz ${base === 'fr' ? 'francesa' : 'inglesa'} instalada: sonará raro`, 'error');
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
    u.volume = volumen;           // explícito: que nadie lo herede a medias
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
  const { veces = 1, lento = false } = opciones;
  vozParar();
  const a = new Audio(url);
  _audio = a;
  let quedan = Math.max(1, veces);

  const soltar = () => {
    if (btn) btn.classList.remove('anim-pulse');
    a.pause();
    a.removeAttribute('src');
    a.load();
    if (_audio === a) _audio = null;
  };

  // Se aplica dos veces —ahora y al llegar los metadatos— porque algunos
  // navegadores reinician `playbackRate` al cargar el fichero, y entonces la
  // cámara lenta se pierde justo la primera vez que se usa.
  const aplicarVelocidad = () => {
    a.preservesPitch = true;
    a.webkitPreservesPitch = true;    // Safari lo llevó con prefijo mucho tiempo
    a.playbackRate = lento ? VOZ_LENTO_MP3 : 1;
  };
  aplicarVelocidad();
  a.onloadedmetadata = aplicarVelocidad;

  if (btn) btn.classList.add('anim-pulse');
  a.onended = () => {
    if (--quedan <= 0) return soltar();
    // Una pausa entre repeticiones: pegadas se oyen como una sola palabra larga.
    setTimeout(() => {
      if (_audio !== a) return;        // lo han cortado mientras esperábamos
      aplicarVelocidad();
      a.currentTime = 0;
      a.play().catch(soltar);
    }, 350);
  };
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
  // Las grabaciones son todas del inglés (Emily). Una frase francesa nunca
  // tiene mp3, y así ni se consulta el índice.
  const lang = opciones.lang || vozLangActivo();
  if (vozBase(lang) === 'en' && tieneAudioReal(id)) {
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
