#!/usr/bin/env node
// TutorIngles — tools/cortar-audio.js
// Descarga los audios generados en higgsfield.ai y los parte en frases sueltas.
//
//   node tools/cortar-audio.js data/audio/generaciones.json
//
// `generaciones.json` es la salida de `show_generations` del MCP (que solo
// lista y NO gasta créditos). Basta con el array de items o el objeto entero.
//
// Cada bloque se empareja con su generación por el texto del prompt, así que no
// importa el orden en que se generaron. Después se corta por los silencios.
//
// OJO CON EL UMBRAL: la primera versión usaba 1 s, medido sobre una generación
// de tres frases donde Seed Audio dejaba pausas de 1,2-1,4 s. Con seis frases
// el modelo acelera y las pausas bajan a 0,26-0,79 s: con umbral de 1 s no
// detecta ninguna y el bloque entero sale como un solo trozo.
//
// Y hay un segundo problema, que es el de verdad: **el modelo hace la misma
// pausa en cada punto, y muchas frases de la base tienen dos oraciones**
// ("No worries at all. Take your time." es UNA frase). Cortar por pausas da
// oraciones, no frases. Por eso se cuentan las oraciones de cada frase y se
// agrupan los trozos en ese reparto: 9 trozos → frases de 2+2+2+1+1+1.
//
// Si un bloque no cuadra (los trozos no coinciden con las oraciones), NO se
// adivina: se avisa y se deja fuera. Un audio mal asignado enseña a decir mal
// una frase, que es peor que no tener audio.

const fs   = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const RAIZ    = path.join(__dirname, '..');
const DIR_A   = path.join(RAIZ, 'data', 'audio');
const CRUDO   = path.join(DIR_A, 'crudo');
const DESTINO = path.join(RAIZ, 'src', 'audio');

/**
 * Cuántas oraciones tiene una frase. Es lo que decide en cuántos trozos la
 * partirá el modelo, porque hace pausa en cada punto final.
 */
function nOraciones(frase) {
  const trozos = String(frase).split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
  return Math.max(1, trozos.length);
}

const ff = (args) => execFileSync('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });

/**
 * Clave con la que se busca una palabra en el índice de audio.
 * Tiene que dar lo mismo aquí y en src/js/voz.js, porque uno escribe y el otro
 * lee: minúsculas, sin acentos ni puntuación y con los espacios colapsados.
 */
const clavePalabra = (s) => String(s || '')
  .toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9' ]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

// A cuánto se sirve la voz. -16 LUFS es lo estándar en apps y pódcast; Seed
// Audio entrega entre -21 y -24, que en un móvil se oye como si te hablaran al
// oído. La primera versión salió así y el aviso fue literal: "suena como si me
// estuviera susurrando". Los picos venían a -5/-9 dBTP, o sea que había 6-8 dB
// de margen sin tocar nada más.
const LUFS_OBJETIVO = -16;

/** Loudness integrado de un fichero, en LUFS. */
function medirLufs(fichero) {
  const r = spawnSync('ffmpeg',
    ['-i', fichero, '-af', 'loudnorm=print_format=json', '-f', 'null', '-'],
    { encoding: 'utf8' });
  const s = (r.stderr || '') + (r.stdout || '');
  try {
    const j = JSON.parse(s.slice(s.lastIndexOf('{'), s.lastIndexOf('}') + 1));
    const v = Number(j.input_i);
    return Number.isFinite(v) ? v : null;
  } catch { return null; }
}

const duracionDe = (fichero) => Number(execFileSync('ffprobe',
  ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', fichero]).toString().trim());

/** Tramos con voz de un wav para unos umbrales de silencio concretos. */
function tramosConUmbral(fichero, d, dur, RUIDO) {
  // spawnSync y no execFileSync: ffmpeg escribe el análisis en stderr y termina
  // con código 0, así que con execFileSync no hay excepción y el stderr se
  // pierde. El síntoma era un único tramo de la duración entera del fichero.
  const r = spawnSync('ffmpeg',
    ['-hide_banner', '-i', fichero, '-af', `silencedetect=noise=${RUIDO}:d=${d}`, '-f', 'null', '-'],
    { encoding: 'utf8' });
  const salida = (r.stderr || '') + (r.stdout || '');

  const cortes = [];
  const re = /silence_start:\s*([\d.]+)[\s\S]*?silence_end:\s*([\d.]+)/g;
  let m;
  while ((m = re.exec(salida))) cortes.push({ ini: Number(m[1]), fin: Number(m[2]) });

  const tramos = [];
  let desde = 0;
  for (const c of cortes) {
    if (c.ini - desde > 0.25) tramos.push({ desde, hasta: c.ini });
    desde = c.fin;
  }
  if (dur - desde > 0.25) tramos.push({ desde, hasta: dur });
  return tramos;
}

/**
 * Busca los umbrales que parten el audio en exactamente `esperado` trozos, y
 * devuelve esos trozos (o null si ninguna combinación lo consigue).
 *
 * Se busca en vez de fijarlos porque **cada bloque tiene su propio ritmo**: el
 * modelo acelera con los textos largos y acorta las pausas. Con umbral fijo el
 * margen es de centésimas —en el primer bloque sólo 0,25 daba el número bueno,
 * y 0,28 ya se comía una pausa—, así que cualquier valor de tabla habría
 * fallado en la mitad de los bloques.
 *
 * Hacen falta LOS DOS EJES. Con el ruido fijo en -32 dB hay bloques que no dan
 * el número correcto con ningún `d`: en directions__frases_01 el mínimo eran 7
 * trozos para 6 frases, porque una pausa de coma se contaba como silencio. Con
 * -45 dB esa coma deja de contar (tiene sonido de fondo) y salen los 6.
 *
 * La duración manda sobre el ruido: se recorre `d` de mayor a menor por fuera,
 * porque los umbrales altos sólo cogen las pausas de verdad. Un `d` bajo puede
 * dar el número correcto partiendo por una coma y juntando dos frases, que es
 * justo el error que no se puede cometer.
 */
const RUIDOS = ['-32dB', '-38dB', '-45dB', '-28dB'];

/**
 * Junta los tramos separados por las pausas MÁS CORTAS hasta dejar `esperado`.
 *
 * Hace falta porque el modelo también hace pausa en las comas y en los guiones
 * largos, no sólo en los puntos: "Whenever you're ready — it's contactless if
 * you prefer" sale en dos trozos aunque sea una sola oración. Esas pausas son
 * sistemáticamente más cortas que las de punto, así que fusionar por el hueco
 * mínimo deshace justo esas y respeta las de verdad.
 */
function fusionarHastaMinimo(tramos, esperado) {
  const t = tramos.map((x) => ({ ...x }));
  while (t.length > esperado) {
    let mejor = 0, hueco = Infinity;
    for (let i = 0; i < t.length - 1; i++) {
      const h = t[i + 1].desde - t[i].hasta;
      if (h < hueco) { hueco = h; mejor = i; }
    }
    t[mejor] = { desde: t[mejor].desde, hasta: t[mejor + 1].hasta };
    t.splice(mejor + 1, 1);
  }
  return t;
}

// Velocidad de habla verosímil, en letras por segundo. Medido sobre los
// bloques que se cortaron bien: todos caen entre 11 y 35. Los mal cortados
// delatan enseguida —103 letras/s en una frase (el audio es de otra, más
// corta) o 4 (le han caído dos)—, así que el margen separa limpio.
// Se aflojan para las palabras sueltas: dichas de una en una no hay
// coarticulación ni encadenado, cada una arranca y frena por su cuenta, así que
// una palabra corta como "shrewd" sale a 6-7 letras/s sin que nada esté mal.
// Con el margen de las frases se habrían tirado bloques buenos.
const RITMOS = {
  frase: { min: 8, max: 42 },
  word:  { min: 3, max: 30 },
};
let RITMO_MIN = RITMOS.frase.min;
let RITMO_MAX = RITMOS.frase.max;

/**
 * ¿El reparto es creíble? Si los trozos se han asignado corridos, alguna frase
 * acaba con un audio que no le corresponde, y se nota en la velocidad: nadie
 * dice 100 letras en un segundo. Vale más quedarse sin audio que con audio
 * equivocado, porque el equivocado enseña a decir mal la frase.
 *
 * Se mira la velocidad absoluta y no la proporción entre frases: decir una
 * frase no cuesta un tiempo proporcional a sus letras —hay un coste fijo de
 * arranque y entonación—, así que exigir proporcionalidad tiraba bloques que
 * estaban perfectos.
 */
function repartoCoherente(tramos, reparto, frases) {
  let k = 0;
  for (let i = 0; i < reparto.length; i++) {
    const d = tramos[k + reparto[i] - 1].hasta - tramos[k].desde;
    k += reparto[i];
    const ritmo = frases[i].length / d;
    if (ritmo < RITMO_MIN || ritmo > RITMO_MAX) return false;
  }
  return true;
}

function tramosDeVoz(fichero, esperado) {
  const dur = duracionDe(fichero);
  const candidatos = [];
  // Se baja hasta 0,08: hay diálogos que el modelo dice tan rápido que con
  // umbrales normales ni siquiera aparecen todas las pausas de punto.
  for (let d = 0.45; d >= 0.08; d -= 0.01) {
    for (const ruido of RUIDOS) {
      const t = tramosConUmbral(fichero, d.toFixed(2), dur, ruido);
      if (t.length === esperado) return t;          // exacto: lo mejor
      if (t.length > esperado) candidatos.push(t);  // de más: se puede fusionar
    }
  }
  // Se prefiere el candidato con menos trozos sobrantes: cuantas menos
  // fusiones haya que hacer, menos ocasiones de equivocarse.
  if (!candidatos.length) return null;
  candidatos.sort((a, b) => a.length - b.length);
  return fusionarHastaMinimo(candidatos[0], esperado);
}

/**
 * Escribe src/audio/index.json con los ids que tienen mp3.
 *
 * Es lo que consulta la app para saber si una frase tiene voz grabada. Se
 * genera leyendo el directorio, no la lista de lo que se acaba de cortar: así
 * el índice describe lo que hay de verdad en disco aunque se ejecute a trozos
 * o se borre un fichero a mano. Sin él, la única alternativa sería pedir cada
 * mp3 y ver si da 404, con un error de red por frase sin audio.
 */
function escribirManifiesto() {
  const leer = (pre) => fs.readdirSync(DESTINO)
    .map((f) => new RegExp(`^${pre}-(\\d+)\\.mp3$`).exec(f))
    .filter(Boolean)
    .map((m) => Number(m[1]))
    .sort((a, b) => a - b);

  // Las dos listas se releen del directorio cada vez, así que cortar sólo las
  // palabras no borra del índice las frases ya grabadas (ni al revés).
  const frases   = leer('frase');
  const palabras = leer('word');

  // Y además, un índice POR TEXTO para las palabras. Es lo que permite que
  // VOCABULARIO, SONIDOS y la sesión usen la voz grabada sin tocar ni una línea
  // de esas pantallas: todas llaman a `pronDecir("receipt")` con el texto, y
  // ninguna conoce el id de la tabla `words`. Buscando por texto, el audio
  // aparece solo donde antes hablaba el móvil.
  // Se leen TODOS los mapas de palabras, no sólo el que se acaba de cortar: si
  // no, grabar los ejemplos de SONIDOS borraría del índice el vocabulario.
  const porTexto = {};
  const conAudio = new Set(palabras);
  for (const nombre of ['mapa-palabras.json', 'mapa-sonidos.json']) {
    const fMapa = path.join(DIR_A, nombre);
    if (!fs.existsSync(fMapa)) continue;
    for (const b of JSON.parse(fs.readFileSync(fMapa, 'utf8'))) {
      b.ids.forEach((id, i) => {
        if (conAudio.has(id)) porTexto[clavePalabra(b.frases[i])] = id;
      });
    }
  }

  fs.writeFileSync(path.join(DESTINO, 'index.json'),
    JSON.stringify({ frases, palabras, porTexto }, null, 1) + '\n');
  console.log(`\nindex.json: ${frases.length} frases y ${palabras.length} palabras ` +
              `(${Object.keys(porTexto).length} indexadas por texto)`);
}

async function main() {
  const entrada = process.argv[2] || path.join(DIR_A, 'generaciones.json');
  // Qué mapa y qué prefijo de fichero. Por defecto, las frases de situación.
  const MAPA   = process.argv[3] || 'mapa.json';
  const PREFIJO = process.argv[4] || 'frase';
  const r = RITMOS[PREFIJO] || RITMOS.frase;
  RITMO_MIN = r.min;
  RITMO_MAX = r.max;
  if (!fs.existsSync(entrada)) {
    console.error(`No encuentro ${entrada}`);
    console.error('Pídele a Claude: "lístame mis generaciones de audio" y guarda el JSON ahí.');
    process.exit(1);
  }

  const mapa = JSON.parse(fs.readFileSync(path.join(DIR_A, MAPA), 'utf8'));
  const bruto = JSON.parse(fs.readFileSync(entrada, 'utf8'));
  const gens  = (bruto.items || bruto).filter((g) => g?.results?.rawUrl);

  // Índice por texto del prompt, normalizado: el emparejamiento no puede
  // depender del orden en que se generaron los bloques.
  const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').replace(/[^a-z0-9 ]/g, '').trim();
  const porTexto = new Map(gens.map((g) => [norm(g.params?.prompt), g]));

  fs.mkdirSync(CRUDO, { recursive: true });
  fs.mkdirSync(DESTINO, { recursive: true });

  let hechos = 0;
  const problemas = [];

  for (const b of mapa) {
    const g = porTexto.get(norm(b.texto));
    if (!g) { problemas.push(`${b.nombre}: sin generar todavía`); continue; }

    const wav = path.join(CRUDO, `${b.nombre}.wav`);
    if (!fs.existsSync(wav)) {
      const res = await fetch(g.results.rawUrl);
      if (!res.ok) { problemas.push(`${b.nombre}: no se pudo descargar (HTTP ${res.status})`); continue; }
      fs.writeFileSync(wav, Buffer.from(await res.arrayBuffer()));
    }

    // Cuántos trozos debe aportar cada frase. La suma es lo que tiene que
    // cuadrar con los tramos detectados, no el número de frases.
    const reparto  = b.frases.map(nOraciones);
    const esperado = reparto.reduce((n, x) => n + x, 0);
    const tramos   = tramosDeVoz(wav, esperado);

    if (!tramos) {
      problemas.push(`${b.nombre}: no hay umbral que dé ${esperado} oraciones ` +
                     `(${b.ids.length} frases) — se deja fuera`);
      continue;
    }
    if (!repartoCoherente(tramos, reparto, b.frases)) {
      problemas.push(`${b.nombre}: el reparto no cuadra con lo larga que es cada ` +
                     `frase — se deja fuera para no asignar audio equivocado`);
      continue;
    }

    // Se recompone cada frase juntando sus oraciones: del principio de la
    // primera al final de la última, con la pausa intermedia incluida. Es lo
    // que se quiere oír, porque así es como se dice la frase entera.
    let k = 0;
    reparto.forEach((cuantos, i) => {
      const primero = tramos[k];
      const ultimo  = tramos[k + cuantos - 1];
      k += cuantos;
      const salida = path.join(DESTINO, `${PREFIJO}-${b.ids[i]}.mp3`);
      const dur    = (ultimo.hasta + 0.18) - Math.max(0, primero.desde - 0.12);
      const bruto  = path.join(CRUDO, `_trozo-${PREFIJO}-${b.ids[i]}.wav`);

      // Paso 1: recortar la frase tal cual, sin tocar el nivel.
      ff(['-y', '-v', 'error',
          '-ss', String(Math.max(0, primero.desde - 0.12)),
          '-to', String(ultimo.hasta + 0.18),
          '-i', wav,
          '-ac', '1',
          // Diez milisegundos de entrada y salida. Los cortes ya caen en
          // silencio (-44 a -68 dB medidos), pero esto quita de raíz cualquier
          // chasquido si alguna frase empieza más pegada de la cuenta.
          '-af', `afade=t=in:st=0:d=0.01,afade=t=out:st=${Math.max(0, dur - 0.01).toFixed(3)}:d=0.01`,
          bruto]);

      // Paso 2: subir cada frase a -16 LUFS con una ganancia fija, medida en
      // ella misma. Se hace con `volume` y no con el modo dinámico de
      // `loudnorm` a propósito: la ganancia constante sube el volumen sin
      // achatar la entonación, que en frases de dos segundos se nota enseguida.
      // El limitador sólo está de red por si alguna frase venía más caliente.
      const lufs  = medirLufs(bruto);
      const gan   = lufs === null ? 0 : (LUFS_OBJETIVO - lufs);
      const filtro = gan ? `volume=${gan.toFixed(2)}dB,alimiter=limit=0.891` : 'anull';

      ff(['-y', '-v', 'error', '-i', bruto, '-af', filtro,
          // 44,1 kHz A PROPÓSITO, aunque Seed Audio entregue 24 kHz y esto no
          // añada ni un dato de calidad. Un MP3 por debajo de 32 kHz no es
          // MPEG-1 sino MPEG-2 Layer III, y iOS lo decodifica mal: suena
          // metálico y rayado en el iPhone mientras en el PC va perfecto. Con
          // 44,1 kHz vuelve a ser MP3 del de toda la vida y lo lee cualquier
          // cosa. El precio es que el fichero abulta más, y sale barato.
          '-ar', '44100', '-b:a', '96k', salida]);
      fs.unlinkSync(bruto);
      hechos++;
    });
    console.log(`  ✓ ${b.nombre.padEnd(30)} ${b.ids.length} frases (${esperado} oraciones)`);
  }

  escribirManifiesto();
  console.log(`\n${hechos} audios de frase escritos en src/audio/`);
  if (problemas.length) {
    console.log(`\n${problemas.length} bloque(s) sin resolver:`);
    problemas.forEach((p) => console.log('  · ' + p));
    console.log('\nLos que no cuadran suelen ser bloques donde el modelo se comió una pausa.');
    console.log('Regenera solo ese bloque, o bájale el ritmo con speech_rate negativo.');
  }
}

// Sólo corta cuando se ejecuta a mano. Al requerirlo se queda en las funciones,
// que es lo que permite medir el reparto sin volver a cortar 28 bloques.
if (require.main === module) {
  main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
}

module.exports = { nOraciones, tramosDeVoz, repartoCoherente, fusionarHastaMinimo };
