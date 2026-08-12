// TutorIngles — lib/pronunciacion.js
// Une el motor de figurada con el diccionario: recibe texto en inglés y
// devuelve cómo se lee, palabra por palabra.
//
// No habla con la base de datos a propósito: recibe ya resuelto el mapa
// palabra → AFI. Así se puede probar sin levantar Postgres y el servidor
// decide de dónde saca las transcripciones (lexicon, overrides o caché).

const { desdeIpa } = require('./respelling');

/** Normaliza una palabra para buscarla en el diccionario. */
const clave = (p) => String(p || '').toLowerCase()
  .replace(/[‘’]/g, "'")     // comillas tipográficas → apóstrofe recto
  .replace(/^[^a-z']+|[^a-z']+$/g, '');

/**
 * Parte un texto inglés en piezas, separando palabras de puntuación.
 * Conserva todo para poder reconstruir la frase alineada debajo del original.
 */
function trocear(texto) {
  const piezas = [];
  const re = /([A-Za-z]+(?:['’-][A-Za-z]+)*)|(\s+)|([^A-Za-z\s]+)/g;
  let m;
  while ((m = re.exec(String(texto || '')))) {
    if (m[1])      piezas.push({ tipo: 'palabra', original: m[1], clave: clave(m[1]) });
    else if (m[2]) piezas.push({ tipo: 'espacio', original: m[2] });
    else           piezas.push({ tipo: 'signo',   original: m[3] });
  }
  return piezas;
}

/** Todas las palabras distintas de un texto, listas para buscar en el diccionario. */
function palabrasDe(texto) {
  const set = new Set();
  for (const p of trocear(texto)) {
    if (p.tipo !== 'palabra' || !p.clave) continue;
    set.add(p.clave);
    // Las contracciones a veces no están: se guarda también la parte de antes
    // del apóstrofe (don't → don) y los trozos de las compuestas (gift-wrap).
    if (p.clave.includes("'")) set.add(p.clave.split("'")[0]);
    if (p.clave.includes('-')) for (const t of p.clave.split('-')) if (t) set.add(t);
  }
  return [...set];
}

/**
 * Resuelve la figurada de una palabra suelta.
 * `buscar(clave)` devuelve { ipa, nota } o null.
 */
function figurarPalabra(palabra, buscar) {
  const k = clave(palabra);
  if (!k) return null;

  const directo = buscar(k);
  if (directo?.ipa) {
    const r = desdeIpa(directo.ipa, k);
    if (r) return aplicarNota(r, directo.nota);
  }

  // Palabra compuesta o contracción que no está entera en el diccionario:
  // se resuelve por trozos y se pegan las figuradas.
  const trozos = k.split(/[-']/).filter(Boolean);
  if (trozos.length > 1) {
    const partes = trozos.map((t) => {
      const e = buscar(t);
      return e?.ipa ? desdeIpa(e.ipa, t) : null;
    });
    if (partes.every(Boolean)) {
      return {
        ipa: partes.map((p) => p.ipa.replace(/\//g, '')).join(' '),
        texto: partes.map((p) => p.texto).join('-'),
        silabas: partes.flatMap((p) => p.silabas),
        leyenda: dedupLeyenda(partes.flatMap((p) => p.leyenda)),
        avisos: partes.flatMap((p) => p.avisos).slice(0, 3),
        parcial: true,
      };
    }
  }
  return null;
}

function aplicarNota(r, nota) {
  if (!nota) return r;
  // Una nota escrita a mano sustituye a los avisos automáticos: está revisada.
  return { ...r, avisos: [{ tipo: 'nota', texto: nota }] };
}

function dedupLeyenda(entradas) {
  const m = new Map();
  for (const e of entradas) if (e && !m.has(e.fonema)) m.set(e.fonema, e);
  return [...m.values()];
}

// Formas débiles. Casi todas las palabras funcionales tienen dos
// pronunciaciones: la fuerte, que es la que trae el diccionario, y la débil,
// que es la que se usa de verdad dentro de una frase. Sin esto, "a bit small"
// saldría "EI bit smool" en vez de "ə bit SMOOL": el diccionario da /eɪ/ porque
// es la forma de decir la palabra aislada.
//
// Esta reducción no es un detalle fino: es lo que hace que el inglés suene a
// inglés. Un hispanohablante que pronuncia todas las palabras con su forma
// fuerte suena a robot aunque tenga los sonidos bien.
const DEBILES = {
  a: 'ə', an: 'ən', and: 'ənd', are: 'ə', as: 'əz', at: 'ət',
  be: 'bi', been: 'bɪn', but: 'bət', can: 'kən', could: 'kəd',
  do: 'də', does: 'dəz', for: 'fə', from: 'frəm',
  had: 'həd', has: 'həz', have: 'həv', her: 'hə', him: 'ɪm', his: 'ɪz',
  must: 'məst', of: 'əv', or: 'ə', shall: 'ʃəl', should: 'ʃəd',
  some: 'səm', than: 'ðən', that: 'ðət', the: 'ðə', them: 'ðəm',
  to: 'tə', us: 'əs', was: 'wəz', were: 'wə', will: 'wəl', would: 'wəd',
  you: 'jʊ', your: 'jə',
};
// Ante vocal cambian: "the apple" no es /ðə/ sino /ði/, y "to eat" es /tu/.
const DEBILES_ANTE_VOCAL = { the: 'ði', to: 'tu', a: 'ən' };

// Palabras que dentro de una frase no llevan acento. El inglés apoya la voz en
// las que tienen contenido y se come el resto; marcarlas todas en mayúscula
// haría leer la frase a gritos y con ritmo de español, que es justo el problema.
const ATONAS = new Set([
  'a', 'an', 'the', 'and', 'but', 'or', 'nor', 'so', 'as', 'than', 'that', 'if',
  'of', 'to', 'for', 'from', 'at', 'in', 'on', 'by', 'with', 'into', 'onto',
  'is', 'are', 'was', 'were', 'be', 'been', 'am', "'s", "'re", "'ve", "'ll",
  'do', 'does', 'did', 'have', 'has', 'had',
  'can', 'could', 'will', 'would', 'shall', 'should', 'may', 'might', 'must',
  'he', 'she', 'it', 'we', 'they', 'you', 'i', 'me', 'him', 'her', 'us', 'them',
  'my', 'your', 'his', 'its', 'our', 'their', 'there', 'some', 'any',
]);

/**
 * Figura un texto entero. Devuelve las piezas alineadas con el original más la
 * leyenda de los sonidos que aparecen, para poder explicarlos una sola vez.
 */
function figurarTexto(texto, buscar) {
  const trozos = trocear(texto);
  const nPalabras = trozos.filter((p) => p.tipo === 'palabra').length;

  // La palabra que viene después decide la forma débil de "the", "to" y "a".
  const siguientePalabra = (i) => {
    for (let k = i + 1; k < trozos.length; k++) {
      if (trozos[k].tipo === 'palabra') return trozos[k].clave;
    }
    return '';
  };

  const piezas = trozos.map((p, i) => {
    if (p.tipo !== 'palabra') return p;

    // En una frase, las palabras funcionales van sin golpe de voz. Sueltas sí
    // lo llevan: si buscas "your" en el diccionario, quieres su forma fuerte.
    const atona = nPalabras > 1 && ATONAS.has(p.clave);

    let r = null;
    if (atona) {
      const anteVocal = /^[aeiou]/.test(siguientePalabra(i));
      const debil = (anteVocal && DEBILES_ANTE_VOCAL[p.clave]) || DEBILES[p.clave];
      if (debil) r = desdeIpa(debil, p.clave);
    }
    if (!r) r = figurarPalabra(p.clave, buscar);
    if (!r) return { ...p, fig: null };

    return {
      ...p,
      fig: atona ? r.texto.toLowerCase() : r.texto,
      atona,
      ipa: r.ipa,
      silabas: r.silabas,
      // En forma débil no tiene sentido avisar de letras mudas: la palabra se
      // está diciendo reducida y el aviso distrae de lo que importa.
      avisos: atona ? [] : r.avisos,
    };
  });

  const conFig = piezas.filter((p) => p.fig);
  return {
    piezas,
    texto: piezas.map((p) => (p.tipo === 'palabra' ? (p.fig || p.original) : p.original)).join(''),
    cobertura: piezas.filter((p) => p.tipo === 'palabra').length
      ? conFig.length / piezas.filter((p) => p.tipo === 'palabra').length
      : 1,
    leyenda: dedupLeyenda(conFig.flatMap((p) =>
      (p.silabas || []).flatMap((s) => s.tokens)
        .filter((t) => t.nota)
        .map((t) => ({ fonema: t.f, simbolo: t.t, clase: t.clase, nota: t.nota })))),
  };
}

module.exports = {
  clave, trocear, palabrasDe, figurarPalabra, figurarTexto, dedupLeyenda,
  ATONAS, DEBILES, DEBILES_ANTE_VOCAL,
};
