// TutorIngles — lib/respelling.js
// Pronunciación figurada: AFI británico → letras que un español ya sabe leer.
//
// El problema que resuelve: la app tenía siete pistas de pronunciación para 209
// palabras, y estaban escritas en AFI (`rɪˈsiːt`). Un alfabeto que hay que
// aprender aparte no ayuda a nadie a hablar mañana en el mostrador.
//
// La tentación es españolizar del todo —receipt → "risít"— pero eso destruye
// justo lo que hay que aprender: ship y sheep acabarían escritos igual. Así que
// el sistema es "aumentado": se lee como español salvo en los sonidos que el
// español no tiene, que van marcados y explicados en la leyenda.
//
//   MAYÚSCULAS  el golpe de voz (sílaba tónica)
//   ii uu aa oo vocal larga — se estira de verdad, no es adorno
//   ëë          e larga con la boca floja (bird, work)
//   i u         vocal corta y floja (ship, book)
//   ə           sonido neutro, boca en reposo — el más frecuente del inglés
//   æ           entre a y e, boca muy abierta (cat)
//   sh zh dj    no existen en español
//   v z(s) r h  existen parecidos pero se articulan distinto
//
// La ə NUNCA se escribe en mayúscula, ni dentro de una sílaba tónica. Es una
// regla de lectura, no un capricho de estilo: "Ə" no parece una letra y hacía
// ilegible justo la sílaba que hay que leer con fuerza. Además es verdad
// fonéticamente — la schwa no lleva el peso ni cuando acompaña a la vocal que
// sí lo lleva (here /hɪə/ → HIəS: la fuerza está en la i, no en el ruidito).
//
// Aprovecha una ventaja del español de España que otros hispanohablantes no
// tienen: /θ/ es nuestra z de zapato y /ð/ es nuestra d de cada. Salen gratis.

// ── INVENTARIO DE FONEMAS ────────────────────────────────
// clase: cómo se pinta y si entra en la leyenda.
//   'ok'    → suena igual que en español, sin marca
//   'ajeno' → no existe en español o se articula distinto: se resalta
//   'larga' → vocal larga
//   'floja' → vocal corta y relajada, la que más delata a un hispanohablante
const FONEMAS = {
  // Consonantes que salen gratis
  p: { t: 'p',  clase: 'ok' },
  b: { t: 'b',  clase: 'ok' },
  t: { t: 't',  clase: 'ok' },
  d: { t: 'd',  clase: 'ok' },
  k: { t: 'k',  clase: 'ok' },
  'ɡ': { t: 'g', clase: 'ok' },
  f: { t: 'f',  clase: 'ok' },
  m: { t: 'm',  clase: 'ok' },
  n: { t: 'n',  clase: 'ok' },
  l: { t: 'l',  clase: 'ok' },
  s: { t: 's',  clase: 'ok' },
  'tʃ': { t: 'ch', clase: 'ok' },
  j:  { t: 'y',  clase: 'ok', nota: 'como la y de "ya"' },

  // La ventaja del castellano: estos dos ya los tenemos
  'θ': { t: 'z', clase: 'ok', nota: 'la z de "zapato" — exactamente igual' },
  'ð': { t: 'd', clase: 'ok', nota: 'la d de "cada", suave, la lengua asoma' },

  // Consonantes que hay que aprender
  v:   { t: 'v',  clase: 'ajeno', nota: 'labio de abajo contra los dientes — NO es una b' },
  z:   { t: 's',  clase: 'ajeno', nota: 's zumbada, con voz — como una abeja' },
  'ʃ': { t: 'sh', clase: 'ajeno', nota: 'el "shhh" de mandar callar' },
  'ʒ': { t: 'zh', clase: 'ajeno', nota: 'la sh con voz — la j francesa de "bonjour"' },
  'dʒ': { t: 'dj', clase: 'ajeno', nota: 'la ch con voz — la j de John' },
  'ŋ': { t: 'ng', clase: 'ajeno', nota: 'la n de "tengo", sin llegar a tocar con la lengua' },
  'ɹ': { t: 'r',  clase: 'ajeno', nota: 'la r inglesa NUNCA vibra — la lengua no toca nada' },
  r:   { t: 'r',  clase: 'ajeno', nota: 'la r inglesa NUNCA vibra — la lengua no toca nada' },
  w:   { t: 'u',  clase: 'ajeno', nota: 'labios redondeados, como en "hueso"' },
  // La h va marcada porque en español no suena nada: hay que avisar de que aquí
  // SÍ suena. Antes se escribía "j" y era peor el remedio que la enfermedad —
  // "JÆV" invita a la jota de "jamón", que es exactamente el error que hay que
  // evitar. Con la h en color, el que no la lee no la dice (fallo pequeño); con
  // la j, todo el mundo la raspaba (fallo grande y muy audible).
  h:   { t: 'h',  clase: 'ajeno', nota: 'un soplo de aire, NO es muda y NO es la j de "jamón"' },
  x:   { t: 'h',  clase: 'ajeno', nota: 'un soplo de aire, NO es muda y NO es la j de "jamón"' },

  // Vocales largas — la longitud distingue palabras, no es opcional
  'iː': { t: 'ii', clase: 'larga', nota: 'i larga y tensa (sheep)' },
  'uː': { t: 'uu', clase: 'larga', nota: 'u larga (food)' },
  'ɑː': { t: 'aa', clase: 'larga', nota: 'a larga y de atrás (car)' },
  'ɔː': { t: 'oo', clase: 'larga', nota: 'o larga y cerrada (law)' },
  // /ɜː/ es tónica casi siempre (work, first, shirt, bird), así que escribirla
  // "əə" la mandaba a mayúsculas y salía "SHƏƏT": ilegible justo donde va la
  // fuerza. "ëë" se lee: una e larga y floja, y la diéresis avisa de que no es
  // la e española de "mesa".
  'ɜː': { t: 'ëë', clase: 'larga', nota: 'e larga con la boca floja, sin mover nada (bird, work)' },

  // Vocales cortas y flojas — el fallo más típico del hispanohablante
  'ɪ': { t: 'i', clase: 'floja', nota: 'i corta y floja, tirando a e (ship)' },
  'ʊ': { t: 'u', clase: 'floja', nota: 'u corta y floja (book)' },
  'ə': { t: 'ə', clase: 'floja', nota: 'sonido neutro: la boca no hace nada' },
  'æ': { t: 'æ', clase: 'ajeno', nota: 'entre a y e, boca bien abierta (cat)' },
  'ʌ': { t: 'a', clase: 'floja', nota: 'a corta, hecha en la garganta (cup)' },
  // El diccionario escribe la misma vocal neutra de dos formas: ə y ɐ. Son el
  // mismo sonido —la ɐ es cómo suena la schwa a final de palabra— y hay que
  // pintarlas igual. Traduciéndola por "a" salía "KA-la" en vez de "KA-lə", y
  // eso hace leer una a española clara donde no hay ninguna vocal de verdad.
  // Afecta a 7.596 entradas del diccionario: casi todo lo acabado en -er/-or/-a.
  'ɐ': { t: 'ə', clase: 'floja', nota: 'sonido neutro: la boca no hace nada' },

  // Vocales cortas que sí tenemos
  e:   { t: 'e', clase: 'ok' },
  'ɛ': { t: 'e', clase: 'ok' },
  'ɒ': { t: 'o', clase: 'ok', nota: 'o corta y abierta' },
  'ɔ': { t: 'o', clase: 'ok' },
  a:   { t: 'a', clase: 'ok' },
  'ɑ': { t: 'a', clase: 'ok' },
  i:   { t: 'i', clase: 'ok' },
  u:   { t: 'u', clase: 'ok' },

  // Diptongos
  'aɪ': { t: 'ai', clase: 'ok' },
  'eɪ': { t: 'ei', clase: 'ok' },
  'ɔɪ': { t: 'oi', clase: 'ok' },
  'aʊ': { t: 'au', clase: 'ok' },
  'əʊ': { t: 'ou', clase: 'ok', nota: 'empieza en neutro, no en o cerrada' },
  'ɪə': { t: 'iə', clase: 'floja', nota: 'i corta que cae al neutro (here)' },
  'eə': { t: 'eə', clase: 'floja', nota: 'e que cae al neutro (hair)' },
  'ʊə': { t: 'uə', clase: 'floja', nota: 'u corta que cae al neutro' },
};

// Se prueban de más largo a más corto para que 'iː' gane a 'i' y 'tʃ' a 't'.
const SIMBOLOS = Object.keys(FONEMAS).sort((a, b) => b.length - a.length);

const VOCALES = new Set(Object.keys(FONEMAS).filter((f) =>
  /[aeiouɪʊəæʌɐɛɒɔɑɜ]/.test(f[0])));

// Grupos consonánticos que el inglés admite al empezar una sílaba. Se usan para
// repartir las consonantes entre dos vocales: lo que quepa aquí va con la
// sílaba siguiente, el resto cierra la anterior.
const ONSETS = new Set([
  'pl','pɹ','pj','bl','bɹ','bj','tɹ','tw','tj','dɹ','dw','dj',
  'kl','kɹ','kw','kj','ɡl','ɡɹ','ɡw','ɡj','fl','fɹ','fj',
  'θɹ','θw','θj','ʃɹ','sp','st','sk','sl','sm','sn','sw','sf','sj',
  'vj','mj','nj','lj','hj','hw',
  'spl','spɹ','spj','stɹ','stj','skɹ','skw','skj','sm','sn',
]);

/** Trocea una cadena AFI en fonemas, marcando cuál lleva el golpe de voz. */
function aFonemas(ipa) {
  const limpio = String(ipa || '').replace(/[/\[\]\s]/g, '').normalize('NFC')
    // La r inglesa se escribe ɹ en el diccionario y r en las correcciones a
    // mano. Sin unificarlas, grupos como "fr" no se reconocen y la palabra se
    // parte mal: afraid saldría "əf-REID" en vez de "ə-FREID".
    .replace(/r/g, 'ɹ');
  const out = [];
  let acento = null;          // 'primario' | 'secundario' — se aplica al siguiente núcleo
  let i = 0;

  while (i < limpio.length) {
    const c = limpio[i];
    if (c === 'ˈ') { acento = 'primario';   i++; continue; }
    if (c === 'ˌ') { acento = 'secundario'; i++; continue; }
    if (c === '.' || c === '-') { i++; continue; }

    const sim = SIMBOLOS.find((s) => limpio.startsWith(s, i));
    if (!sim) { i++; continue; }             // diacríticos sueltos: se ignoran

    const esVocal = VOCALES.has(sim);
    out.push({ f: sim, vocal: esVocal, acento: esVocal ? acento : null });
    // El acento del diccionario va justo antes del núcleo, así que en cuanto
    // se consume una vocal deja de estar pendiente.
    if (esVocal) acento = null;
    i += sim.length;
  }
  return out;
}

/** Agrupa los fonemas en sílabas usando la regla de onset máximo. */
function silabificar(fonemas) {
  const nucleos = [];
  fonemas.forEach((f, i) => { if (f.vocal) nucleos.push(i); });

  // Sin vocales no hay sílabas que formar (siglas, símbolos sueltos)
  if (!nucleos.length) return fonemas.length ? [fonemas] : [];

  const silabas = [];
  for (let n = 0; n < nucleos.length; n++) {
    const nucleo   = nucleos[n];
    const anterior = n === 0 ? -1 : nucleos[n - 1];

    // Consonantes entre la vocal anterior y esta: hay que repartirlas.
    let desde;
    if (n === 0) {
      desde = 0;                                   // todo el arranque de palabra
    } else {
      const entre = fonemas.slice(anterior + 1, nucleo);
      // Se prueba el grupo más largo posible como onset de esta sílaba.
      let corte = entre.length;                    // por defecto, todas aquí
      if (entre.length > 1) {
        corte = 0;
        for (let k = Math.min(3, entre.length); k >= 1; k--) {
          const grupo = entre.slice(entre.length - k).map((x) => x.f).join('');
          if (ONSETS.has(grupo)) { corte = k; break; }
        }
        if (corte === 0) corte = 1;                // al menos una acompaña a la vocal
      }
      desde = nucleo - corte;
    }

    // Hasta dónde llega: hasta justo antes del onset de la sílaba siguiente,
    // o hasta el final de la palabra si es la última.
    const hasta = n === nucleos.length - 1 ? fonemas.length : nucleos[n + 1];
    silabas.push(fonemas.slice(desde, hasta));
  }

  // La coda de cada sílaba se recorta en la pasada siguiente: aquí se corrige
  // el solapamiento dejando que cada sílaba acabe donde empieza la siguiente.
  for (let n = 0; n < silabas.length - 1; n++) {
    const inicioSig = fonemas.indexOf(silabas[n + 1][0], nucleos[n]);
    const inicioAct = fonemas.indexOf(silabas[n][0]);
    silabas[n] = fonemas.slice(inicioAct, inicioSig);
  }

  return silabas.filter((s) => s.length);
}

/**
 * Pone la sílaba en mayúsculas dejando la ə como está.
 * `'ə'.toUpperCase()` da 'Ə', que no parece una letra: convertía la sílaba
 * fuerte —la única que hay que leer bien— en la más difícil de leer.
 */
const enMayusculas = (s) => String(s)
  .split('')
  .map((c) => (c === 'ə' ? c : c.toUpperCase()))
  .join('');

/** Ajustes para que un lector español lea las letras como toca. */
function ortografiaEspanola(tokens) {
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    const sig = tokens[i + 1];
    if (!sig) continue;

    // La h detrás de s o z formaría los dígrafos "sh" y "zh", que en este
    // sistema son otros sonidos. Ahí —y solo ahí— vuelve a escribirse "j": el
    // soplo demasiado fuerte es mal menor frente a leer una sh que no existe.
    // Pasa en dos apellidos de 147.488 palabras, pero saldría muy mal.
    if (sig.t === 'h' && /[sz]$/.test(tok.t)) { sig.t = 'j'; continue; }

    if (tok.t !== 'g') continue;

    // "get" no puede escribirse GET: en español se leería "jet".
    if (/^[ei]/.test(sig.t))       tok.t = 'gu';
    // /gw/ ante e/i necesita diéresis: language → LÆNG-güidj
    else if (sig.t === 'u' && sig.f === 'w' && /^[ei]/.test(tokens[i + 2]?.t || '')) {
      tok.t = 'g'; sig.t = 'ü';
    }
  }
  return tokens;
}

// Letras que suelen enmudecer, con los fonemas que las delatarían si sonaran.
const MUDAS = {
  p: ['p'], b: ['b'], k: ['k'], g: ['ɡ', 'dʒ', 'ʒ'], l: ['l'], h: ['h'],
  w: ['w'], t: ['t', 'tʃ'], d: ['d', 'dʒ'], n: ['n', 'ŋ'], s: ['s', 'z', 'ʃ', 'ʒ'],
};
// Dígrafos que explican la ausencia de un sonido sin que haya letra muda.
// Ojo: "kn" y "wr" NO van aquí. En know y write la letra sí está muda de
// verdad, y es justo lo que hay que avisar.
const DIGRAFOS = [
  [/th/, ['θ', 'ð']], [/sh/, ['ʃ']], [/ph/, ['f']], [/ch/, ['tʃ', 'ʃ', 'k']],
  [/ck/, ['k']],      [/ng/, ['ŋ']], [/qu/, ['k']], [/wh/, ['w', 'h']],
  [/gh/, ['f']],      [/dg/, ['dʒ']],
  // La w de los diptongos escritos (know, law, new) no es una letra muda.
  [/ow/, ['əʊ', 'aʊ']], [/aw/, ['ɔː', 'ɑː']], [/ew/, ['uː', 'juː']],
];

/** Detecta letras mudas y otras trampas comparando la grafía con el sonido. */
function detectarAvisos(palabra, fonemas) {
  const avisos = [];
  const g = String(palabra || '').toLowerCase();
  const presentes = new Set(fonemas.map((f) => f.f));

  // La "e" fantasma: school → "escuul". El error más marcado de un español.
  if (fonemas[0] && !fonemas[0].vocal && fonemas[1] && !fonemas[1].vocal &&
      ['s', 'ʃ'].includes(fonemas[0].f)) {
    avisos.push({ tipo: 'e-fantasma', texto: 'Empieza en S: nada de "e" delante' });
  }

  if (g && /^[a-z'-]+$/.test(g)) {
    // Un dígrafo justifica que falte el sonido de sus letras sueltas.
    const excluidas = new Set();
    for (const [re, fs] of DIGRAFOS) {
      const m = g.match(re);
      if (m && fs.some((f) => presentes.has(f))) for (const ch of m[0]) excluidas.add(ch);
    }

    // -tion, -cial, -cious…: la t y la c no enmudecen, forman la sh.
    if (/(t|c|s)(ion|ial|ious|ien|ian)/.test(g) && (presentes.has('ʃ') || presentes.has('ʒ'))) {
      excluidas.add('t');
    }

    // El pasado -ed suena /t/ o /d/ según lo que venga antes: walked→UOOKT.
    // Es una regla que se enseña aparte, no una letra muda.
    const ultimo = fonemas[fonemas.length - 1]?.f;
    if (/ed$/.test(g) && (ultimo === 't' || ultimo === 'd')) excluidas.add('d');

    // "gh" mudo del todo (thought, bough): un aviso, no dos letras sueltas.
    if (/gh/.test(g) && !presentes.has('f') && !presentes.has('ɡ')) {
      excluidas.add('g'); excluidas.add('h');
      avisos.push({ tipo: 'muda', texto: 'El grupo GH no suena' });
    }

    for (const [letra, fs] of Object.entries(MUDAS)) {
      if (!g.includes(letra) || excluidas.has(letra)) continue;
      if (fs.some((f) => presentes.has(f))) continue;
      avisos.push({ tipo: 'muda', texto: `La ${letra.toUpperCase()} es muda` });
    }
  }
  // Más de dos avisos por palabra es ruido: se queda con los primeros.
  return avisos.slice(0, 3);
}

/**
 * Convierte una transcripción AFI en pronunciación figurada.
 * `palabra` es opcional y solo se usa para detectar letras mudas.
 */
function desdeIpa(ipa, palabra) {
  const fonemas = aFonemas(ipa);
  if (!fonemas.length) return null;

  const silabas = silabificar(fonemas).map((grupo) => {
    const tonica      = grupo.some((f) => f.acento === 'primario');
    const secundaria  = grupo.some((f) => f.acento === 'secundario');
    const tokens = ortografiaEspanola(grupo.map((f) => {
      const info = FONEMAS[f.f] || { t: f.f, clase: 'ok' };
      return { t: info.t, f: f.f, clase: info.clase, nota: info.nota };
    }));
    const texto = tokens.map((t) => t.t).join('');
    return { texto: tonica ? enMayusculas(texto) : texto, tonica, secundaria, tokens };
  });

  // Si el diccionario no marcó el acento, la tónica es la primera sílaba: es
  // el patrón mayoritario del inglés y mejor eso que no marcar ninguna.
  if (silabas.length && !silabas.some((s) => s.tonica)) {
    silabas[0].tonica = true;
    silabas[0].texto  = enMayusculas(silabas[0].texto);
  }

  const usados = new Map();
  for (const s of silabas) {
    for (const t of s.tokens) {
      if (t.nota && !usados.has(t.f)) usados.set(t.f, { simbolo: t.t, clase: t.clase, nota: t.nota });
    }
  }

  return {
    ipa: `/${String(ipa).replace(/[/\[\]]/g, '')}/`,
    texto: silabas.map((s) => s.texto).join('-'),
    silabas,
    leyenda: [...usados.entries()].map(([f, v]) => ({ fonema: f, ...v })),
    avisos: detectarAvisos(palabra, fonemas),
  };
}

module.exports = {
  FONEMAS, ONSETS, aFonemas, silabificar, desdeIpa, detectarAvisos, enMayusculas,
};
