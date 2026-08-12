#!/usr/bin/env node
// TutorIngles — tools/cortar-pares.js
//
// Corta los bloques de palabras de los pares mínimos y —lo que de verdad
// importa aquí— COMPRUEBA QUE LOS DOS SONIDOS SE DISTINGAN antes de dar el
// audio por bueno.
//
// Por qué hace falta una verificación propia y no vale la del cortador de
// frases: en un ejercicio que consiste EN DISTINGUIR dos sonidos, un audio que
// no los distingue enseña lo contrario de lo que pretende, y encima suena
// convincente. El ejercicio de b/v llevaba 5 aciertos y 7 fallos —42%, por
// debajo del azar— porque sonaba con la voz del móvil, que en un aparato
// configurado en español dice la b y la v exactamente igual.
//
// Y hay un error de método anterior que no se puede repetir: la vez pasada se
// midió la DURACIÓN de ban/van (+24%) y se dio por hecho que el modelo
// contrastaba b y v. La duración no distingue b de v — las separa el modo de
// articulación: la b cierra los labios y explota, la v los deja abiertos y roza
// los dientes. Cada tipo de contraste necesita su propia medida:
//
//   · longitud vocálica (ship/sheep, full/fool) → duración, que ES el rasgo
//   · el resto (b/v, s/z, th…)                  → reparto de energía por bandas
//
// Uso:  node tools/cortar-pares.js

const fs   = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const {
  tramosDeVoz, medirLufs, duracionDe, ff, clavePalabra,
  escribirManifiesto, LUFS_OBJETIVO, DESTINO,
} = require('./cortar-audio');

const RAIZ  = path.join(__dirname, '..');
const DIR_A = path.join(RAIZ, 'data', 'audio');
const CRUDO = path.join(DIR_A, 'pares');

// Los ids de palabra llegan hasta 10038 (vienen de words.id). Los pares no
// están en esa tabla, así que se numeran desde 20000: el índice por texto es
// quien manda, el número sólo tiene que no chocar.
const ID_BASE = 20000;

// ── MEDIDAS ──────────────────────────────────────────────

/**
 * mean_volume de un tramo, con un filtro opcional. En dB.
 *
 * Sin `-v error` a propósito: `volumedetect` escribe su informe en nivel INFO,
 * así que bajando la verbosidad se pierde la única línea que interesa. El
 * síntoma era una separación de 0,0 dB en los 36 pares por igual — un cero
 * demasiado redondo para ser una medida.
 */
function volumen(fichero, filtro, desde, dur) {
  const args = ['-hide_banner', '-nostats'];
  if (desde != null) args.push('-ss', String(desde));
  if (dur != null) args.push('-t', String(dur));
  args.push('-i', fichero, '-af', filtro ? `${filtro},volumedetect` : 'volumedetect', '-f', 'null', '-');
  const r = spawnSync('ffmpeg', args, { encoding: 'utf8' });
  const s = (r.stderr || '') + (r.stdout || '');
  const m = /mean_volume:\s*(-?[\d.]+) dB/.exec(s);
  return m ? Number(m[1]) : null;
}

/**
 * Reparto de energía por bandas, relativo al nivel total.
 *
 * Es una medida espectral gruesa, pero suficiente para lo que se le pide:
 * detectar si dos palabras que DEBEN sonar distinto han salido iguales. Las
 * fricativas (/v/, /s/, /z/, /θ/) llevan mucha energía por encima de 2,5 kHz;
 * las oclusivas (/b/) la concentran abajo, en la vocal que viene detrás. Si esa
 * diferencia no aparece, el modelo no ha contrastado nada.
 *
 * Se mide dos veces: la palabra entera y sus primeros 150 ms. El contraste casi
 * siempre vive al principio (berry/very), y en la palabra entera la vocal lo
 * diluye hasta esconderlo.
 */
function perfil(fichero) {
  const uno = (desde, dur) => {
    const total  = volumen(fichero, null, desde, dur);
    const agudos = volumen(fichero, 'highpass=f=2500', desde, dur);
    const graves = volumen(fichero, 'lowpass=f=500', desde, dur);
    if (total === null || agudos === null || graves === null) return null;
    return { agudos: agudos - total, graves: graves - total };
  };
  return { todo: uno(null, null), inicio: uno(0, 0.15) };
}

/** Cuánto se separan dos palabras espectralmente, en dB sumados. */
function separacion(pa, pb) {
  const dif = (a, b) => (!a || !b) ? 0
    : Math.abs(a.agudos - b.agudos) + Math.abs(a.graves - b.graves);
  // Se queda con la vista que mejor separa: si el contraste está al principio,
  // manda el arranque; si está al final (curb/curve), manda la palabra entera.
  return Math.max(dif(pa.todo, pb.todo), dif(pa.inicio, pb.inicio));
}

// Qué medida aplica a cada contraste, y qué hace falta para aprobar.
//
// Los umbrales no son de tabla: salen de medir los 71 pares y mirar dónde cae
// la nube. Un par por debajo no es "peor", es que no se distingue — y entonces
// vale más quedarse sin audio, porque el ejercicio sigue funcionando con la voz
// del móvil y avisado en pantalla.
const CRITERIO = {
  // El tope superior no sobra: una vocal larga dura entre una vez y media y dos
  // veces la corta, no tres. Un ×2,9 no es un contraste buenísimo — es que a
  // una de las dos le ha caído un trozo que no era suyo, y ese audio enseñaría
  // a decir mal la palabra con toda la convicción del mundo.
  'i-corta-larga': { tipo: 'duracion', minRatio: 1.15, maxRatio: 2.5 },
  'u-corta-larga': { tipo: 'duracion', minRatio: 1.15, maxRatio: 2.5 },
  'b-v':           { tipo: 'espectro', minSep: 2.0 },
  's-z':           { tipo: 'espectro', minSep: 2.0 },
  'th-sonora':     { tipo: 'espectro', minSep: 2.0 },
  'sh-ch':         { tipo: 'espectro', minSep: 2.0 },
  'dj-y':          { tipo: 'espectro', minSep: 2.0 },
  'n-ng':          { tipo: 'espectro', minSep: 1.5 },
  'h-suave':       { tipo: 'espectro', minSep: 1.5 },
  'a-e-abierta':   { tipo: 'espectro', minSep: 1.5 },
  'e-fantasma':    { tipo: 'espectro', minSep: 1.5 },
  'r-inglesa':     { tipo: 'espectro', minSep: 1.5 },
};

// ── CORTE ────────────────────────────────────────────────

function cortarBloque(wav, palabras, salidas) {
  // Un wav ilegible no puede tumbar la tanda entera. Pasó: una descarga se
  // guardó con un XML de "Access Denied" dentro y ffprobe reventó el proceso
  // después de cortar seis bloques buenos.
  let tramos;
  try {
    tramos = tramosDeVoz(wav, palabras.length);
  } catch (e) {
    return { error: (e.message || String(e)).split('\n')[0] };
  }
  if (!tramos) return null;

  palabras.forEach((_, i) => {
    const t = tramos[i];
    const bruto = path.join(DIR_A, `_tmp-${process.pid}-${i}.wav`);
    const dur = (t.hasta + 0.12) - Math.max(0, t.desde - 0.08);

    ff(['-y', '-v', 'error',
        '-ss', String(Math.max(0, t.desde - 0.08)),
        '-to', String(t.hasta + 0.12),
        '-i', wav, '-ac', '1',
        '-af', `afade=t=in:st=0:d=0.01,afade=t=out:st=${Math.max(0, dur - 0.01).toFixed(3)}:d=0.01`,
        bruto]);

    // Mismo tratamiento que las frases: ganancia fija a -16 LUFS (no el modo
    // dinámico de loudnorm, que achata la entonación) y 44,1 kHz porque por
    // debajo de 32 kHz el mp3 deja de ser MPEG-1 y iOS lo decodifica metálico.
    const lufs = medirLufs(bruto);
    const gan  = lufs === null ? 0 : (LUFS_OBJETIVO - lufs);
    ff(['-y', '-v', 'error', '-i', bruto,
        '-af', gan ? `volume=${gan.toFixed(2)}dB,alimiter=limit=0.891` : 'anull',
        '-ar', '44100', '-b:a', '96k', salidas[i]]);
    fs.unlinkSync(bruto);
  });
  return tramos;
}

// ── PRINCIPAL ────────────────────────────────────────────

function main() {
  const info = JSON.parse(fs.readFileSync(path.join(DIR_A, 'pares-info.json'), 'utf8'));
  const { bloques, pares } = info;

  console.log(`Cortando ${bloques.length} bloques…\n`);

  const audioDe = {};        // clave de palabra -> mp3 con el que se verifica
  const mapa = [];
  const sinCortar = [];
  let idSiguiente = ID_BASE;

  // Alguna palabra del par ya estaba grabada como vocabulario (`cheap` está en
  // el par sheep/cheap y también en la lista de palabras de tienda). Sirve para
  // verificar el par, pero es de otra sección: si el par no contrasta, esa NO
  // se borra — dejaría a VOCABULARIO sin un audio que sí usa.
  const previas = new Set();
  const idxPrevio = JSON.parse(fs.readFileSync(path.join(DESTINO, 'index.json'), 'utf8'));
  for (const [k, id] of Object.entries(idxPrevio.porTexto || {})) {
    const f = path.join(DESTINO, `word-${id}.mp3`);
    if (fs.existsSync(f)) { audioDe[k] = { fichero: f, id }; previas.add(k); }
  }

  for (const b of bloques) {
    const wav = path.join(CRUDO, `bloque-${b.bloque}.wav`);
    if (!fs.existsSync(wav)) { sinCortar.push(`bloque-${b.bloque}: falta el wav`); continue; }

    const ids = b.palabras.map(() => idSiguiente++);
    const salidas = ids.map((id) => path.join(DESTINO, `word-${id}.mp3`));
    const tramos = cortarBloque(wav, b.palabras, salidas);

    if (!tramos || tramos.error) {
      sinCortar.push(tramos?.error
        ? `bloque-${b.bloque}: ${tramos.error}`
        : `bloque-${b.bloque}: no hay umbral que dé ${b.palabras.length} trozos`);
      salidas.forEach((f) => fs.existsSync(f) && fs.unlinkSync(f));
      idSiguiente -= b.palabras.length;
      continue;
    }
    b.palabras.forEach((p, i) => { audioDe[clavePalabra(p)] = { fichero: salidas[i], id: ids[i] }; });
    mapa.push({ nombre: `pares-${b.bloque}`, ids, frases: b.palabras });
    console.log(`  ✓ bloque-${b.bloque}: ${b.palabras.length} palabras`);
  }

  // ── Verificación: ¿se distinguen de verdad? ──
  console.log('\nVerificando el contraste de cada par:\n');
  const cache = {};
  const perfilDe = (k) => (cache[k] ??= perfil(audioDe[k].fichero));

  const rechazados = new Set();
  const filas = [];

  for (const par of pares) {
    const ka = clavePalabra(par.word_a), kb = clavePalabra(par.word_b);
    if (!audioDe[ka] || !audioDe[kb]) continue;      // su bloque no se cortó
    const c = CRITERIO[par.slug] || { tipo: 'espectro', minSep: 1.5 };

    let valor, ok, unidad;
    if (c.tipo === 'duracion') {
      const da = duracionDe(audioDe[ka].fichero), db = duracionDe(audioDe[kb].fichero);
      // word_b es siempre la de vocal larga en estos contrastes (ship→sheep).
      valor = db / da;
      ok = valor >= c.minRatio && valor <= (c.maxRatio ?? Infinity);
      unidad = `×${valor.toFixed(2)} de duración (${c.minRatio}–${c.maxRatio ?? '∞'})`;
    } else {
      valor = separacion(perfilDe(ka), perfilDe(kb));
      ok = valor >= c.minSep;
      unidad = `${valor.toFixed(1)} dB de separación (mín ${c.minSep})`;
    }

    filas.push({ slug: par.slug, id: par.id, a: par.word_a, b: par.word_b, ok, unidad, ka, kb });
  }

  // El rechazo es POR PAR, no por palabra. `sheep` no contrasta con `ship` —el
  // modelo no distingue la vocal larga de la corta— pero sí con `cheap`, que es
  // otro contraste entero. Tirar su audio por el primer par dejaría el segundo
  // sin voz sin ninguna razón.
  const usadaEnBueno = new Set();
  for (const f of filas) if (f.ok) { usadaEnBueno.add(f.ka); usadaEnBueno.add(f.kb); }
  for (const f of filas) if (!f.ok) {
    if (!usadaEnBueno.has(f.ka)) rechazados.add(f.ka);
    if (!usadaEnBueno.has(f.kb)) rechazados.add(f.kb);
  }

  const porSlug = {};
  for (const f of filas) (porSlug[f.slug] ??= []).push(f);
  for (const [slug, fs_] of Object.entries(porSlug)) {
    const malos = fs_.filter((f) => !f.ok);
    console.log(`  ${malos.length ? '✗' : '✓'} ${slug.padEnd(15)} ${fs_.length - malos.length}/${fs_.length}`);
    for (const f of fs_) {
      console.log(`      ${f.ok ? ' ' : '✗'} ${(f.a + '/' + f.b).padEnd(20)} ${f.unidad}`);
    }
  }

  // Los rechazados se borran: sin audio el ejercicio sigue funcionando con la
  // voz del móvil, y la app ya avisa de cuál está oyendo. Con audio malo, no.
  let borrados = 0;
  const mapaFinal = [];
  for (const m of mapa) {
    const ids = [], frases = [];
    m.ids.forEach((id, i) => {
      const k = clavePalabra(m.frases[i]);
      if (rechazados.has(k) && !previas.has(k)) {
        const f = path.join(DESTINO, `word-${id}.mp3`);
        if (fs.existsSync(f)) { fs.unlinkSync(f); borrados++; }
        return;
      }
      ids.push(id); frases.push(m.frases[i]);
    });
    if (ids.length) mapaFinal.push({ ...m, ids, frases });
  }

  fs.writeFileSync(path.join(DIR_A, 'mapa-pares.json'), JSON.stringify(mapaFinal, null, 1) + '\n');
  escribirManifiesto();

  // Y qué pares pueden fiarse del audio grabado. Hace falta marcarlo POR PAR y
  // no por palabra: `sheep` tiene un audio perfectamente bueno que sirve para
  // sheep/cheap y no sirve para ship/sheep, porque el modelo no alarga la vocal.
  // Sin esta marca, el ejercicio de la i corta y la i larga sonaría con voz de
  // verdad y seguiría sin distinguir nada — que es exactamente el problema que
  // vinimos a arreglar, pero mejor disimulado.
  const buenos = filas.filter((f) => f.ok).map((f) => f.id);
  const malos  = filas.filter((f) => !f.ok);
  const sql = [
    '-- TutorIngles — migración 20: qué pares tienen audio que de verdad contrasta',
    '--',
    '-- GENERADO por tools/cortar-pares.js. No editar a mano: se rehace cada vez',
    '-- que se regenera el audio, y los números salen de medir los ficheros.',
    '--',
    '-- Criterio por tipo de contraste: duración para la longitud vocálica (que',
    '-- ES el rasgo) y reparto de energía por bandas para el resto. Medir la',
    '-- duración de ban/van, como se hizo la primera vez, no dice nada sobre si',
    '-- la b y la v se distinguen.',
    '',
    'BEGIN;',
    '',
    'ALTER TABLE pron_pairs ADD COLUMN IF NOT EXISTS audio_ok BOOLEAN NOT NULL DEFAULT FALSE;',
    "COMMENT ON COLUMN pron_pairs.audio_ok IS 'TRUE si el audio grabado separa los dos sonidos, medido por tools/cortar-pares.js';",
    '',
    'UPDATE pron_pairs SET audio_ok = FALSE;',
    buenos.length ? `UPDATE pron_pairs SET audio_ok = TRUE WHERE id IN (${buenos.join(', ')});` : '',
    '',
    '-- Sin audio fiable (siguen con la voz del móvil, y la app lo dice):',
    ...malos.map((f) => `--   ${f.slug.padEnd(15)} ${(f.a + '/' + f.b).padEnd(20)} ${f.unidad}`),
    '',
    'COMMIT;',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(RAIZ, 'migration_20_audio_pares.sql'), sql);
  console.log(`\nmigration_20_audio_pares.sql: ${buenos.length} pares marcados con audio fiable`);

  const total = filas.length;
  console.log(`\n${total - malos.length} de ${total} pares con audio verificado.`);
  if (borrados) console.log(`${borrados} audio(s) descartados por no contrastar: siguen con voz del móvil.`);
  if (sinCortar.length) {
    console.log(`\n${sinCortar.length} bloque(s) sin cortar:`);
    sinCortar.forEach((p) => console.log('  · ' + p));
  }
}

if (require.main === module) main();
