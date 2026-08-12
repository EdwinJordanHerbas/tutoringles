// TutorIngles — lib/ipa-uk.js
// Pasa una transcripción AFI americana a británica.
//
// Por qué hace falta: el diccionario británico abierto (ipa-dict en_UK) tiene
// 65.000 entradas pero le faltan justo las palabras más frecuentes — no trae
// "put", "get" ni "public", aunque sí "putative" y "publican". Sobre el
// contenido real de la app cubre el 90,2 %. El americano tiene 125.927 entradas
// y sí las trae; convertido, la cobertura sube al 99,8 %.
//
// El contenido a aprender es inglés británico porque es el del Cambridge, así
// que el americano solo se usa de respaldo y siempre pasado por aquí.

// Palabras del grupo BATH: el sur de Inglaterra alarga la a donde el americano
// dice /æ/. Se comparan por raíz para pillar plurales y derivados.
const BATH = [
  'ask', 'answer', 'aunt', 'after', 'afternoon', 'advantage', 'advance',
  'bath', 'basket', 'branch', 'brass',
  "can't", 'cast', 'castle', 'chance', 'chant', 'class', 'craft',
  'dance', 'daft', 'demand', 'disaster', 'draft', 'draught',
  'example', 'fast', 'father', 'france', 'glass', 'graph', 'grasp', 'grass',
  'half', 'laugh', 'last', 'mask', 'master', 'nasty',
  'pass', 'past', 'path', 'plant', 'staff', 'task',
  'rather', 'sample', 'shaft', 'slant', 'vast',
];

// Grupo PALM: aquí el americano escribe la misma /ɑ/ que en "hot", pero el
// británico no la redondea, la alarga. Sin esta lista, father saldría FO-də.
const PALM = [
  'father', 'calm', 'palm', 'balm', 'psalm', 'spa', 'bra', 'drama', 'pasta',
  'llama', 'lager', 'plaza', 'garage', 'facade', 'tomato', 'banana', 'kebab',
];

/** ¿Es una palabra del grupo BATH? (compara por raíz, para plurales y derivados) */
function esBath(palabra) {
  const p = String(palabra || '').toLowerCase();
  return BATH.some((b) => p === b || p.startsWith(b));
}

/** ¿Lleva /ɑː/ larga donde el americano pone la /ɑ/ de "hot"? */
function esPalm(palabra) {
  const p = String(palabra || '').toLowerCase();
  return PALM.some((b) => p === b || p.startsWith(b));
}

const V = 'aeiouɪʊəæʌɐɛɒɔɑɜ';

/**
 * Decide la longitud de las "i" y "u" sueltas, que el americano escribe igual
 * en los tres casos pero el británico distingue:
 *   tónica         → larga    receipt /ɹiˈsit/ → /ɹɪˈsiːt/
 *   átona interior → corta    (la primera i de receipt)
 *   final átona    → corta    very, money — se queda corta, no "VE-rii"
 */
function ajustarIU(s) {
  let out = '', acento = false;
  for (let k = 0; k < s.length; k++) {
    const c = s[k];
    if (c === 'ˈ' || c === 'ˌ') { acento = true; out += c; continue; }
    if ((c === 'i' || c === 'u') && s[k + 1] !== 'ː' && s[k + 1] !== 'ə') {
      const alFinal = k === s.length - 1;
      if (acento)       out += c + 'ː';
      else if (alFinal) out += c;
      else              out += (c === 'i' ? 'ɪ' : 'ʊ');
      acento = false;
      continue;
    }
    if (V.includes(c)) acento = false;
    out += c;
  }
  return out;
}

/**
 * Convierte AFI americano (formato ipa-dict en_US) a británico.
 * `palabra` es opcional; solo se usa para el grupo BATH.
 */
function aBritanico(ipa, palabra) {
  let s = String(ipa || '').replace(/[/[\]]/g, '').trim();
  if (!s) return '';

  // ── Símbolos que solo usa la notación americana ──
  s = s.replace(/ɫ/g, 'l');        // l velarizada: en británico es l normal
  s = s.replace(/ɝ/g, 'ɜː');       // bird, research
  s = s.replace(/ɚ/g, 'ə');        // butter — la r final no se pronuncia
  s = s.replace(/oʊ/g, 'əʊ');      // go: el británico arranca en neutro
  s = s.replace(/ɔ(?![ːɪ])/g, 'ɔː');

  s = ajustarIU(s);

  // ── No rótico: la r solo suena si le sigue una vocal ──
  // Antes de borrarla hay que recolocar la vocal que la precede.
  s = s.replace(new RegExp(`ɑɹ(?![${V}])`, 'g'),  'ɑː');   // car
  s = s.replace(new RegExp(`ɔːɹ(?![${V}])`, 'g'), 'ɔː');   // for
  s = s.replace(new RegExp(`iːɹ(?![${V}])`, 'g'), 'ɪə');   // here
  s = s.replace(new RegExp(`ɪɹ(?![${V}])`, 'g'),  'ɪə');   // beer
  s = s.replace(new RegExp(`ɛɹ(?![${V}])`, 'g'),  'eə');   // hair
  s = s.replace(new RegExp(`uːɹ(?![${V}])`, 'g'), 'ʊə');   // tour
  s = s.replace(new RegExp(`ʊɹ(?![${V}])`, 'g'),  'ʊə');
  s = s.replace(new RegExp(`ɜːɹ(?![${V}])`, 'g'), 'ɜː');   // work
  s = s.replace(new RegExp(`ɹ(?![${V}])`, 'g'),   '');     // el resto se cae

  // ── LOT: el americano no redondea, el británico sí ──
  // La secuencia larga /ɑː/ (car) se aparta para que no la pille la regla.
  s = s.replace(/ɑː/g, '@@');
  s = esPalm(palabra) ? s.replace(/ɑ/g, 'ɑː') : s.replace(/ɑ/g, 'ɒ');
  s = s.replace(/@@/g, 'ɑː');

  // ── La schwa tónica del americano es nuestra /ʌ/: public → PA-blik ──
  // El acento puede ir pegado a la vocal o delante del arranque de la sílaba.
  s = s.replace(new RegExp(`([ˈˌ][^${V}]*)ə(?!ʊ)`, 'g'), '$1ʌ');

  // ── Grupo BATH: ask, laugh, class… ──
  if (esBath(palabra)) s = s.replace(/æ/g, 'ɑː');

  return s.replace(/ːː+/g, 'ː');
}

module.exports = { aBritanico, esBath, esPalm, ajustarIU, BATH, PALM };
