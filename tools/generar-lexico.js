#!/usr/bin/env node
// TutorIngles — tools/generar-lexico.js
// Construye el diccionario de pronunciación que alimenta la figurada.
//
//   node tools/generar-lexico.js
//
// Deja el resultado en data/lexicon.tsv (word · ipa · fuente). Ese fichero NO
// va al repo: pesa varios MB y se puede regenerar en cualquier momento. Se sube
// al droplet y se carga en la tabla `lexicon` (ver migration_16).
//
// Dos fuentes, en este orden:
//   1. ipa-dict en_UK — británico auténtico, pero solo 65.119 entradas y le
//      faltan las palabras más frecuentes (no trae "put" ni "get").
//   2. ipa-dict en_US — 125.927 entradas, convertido a británico con lib/ipa-uk.
//
// Por separado cubren el 90,2 % del contenido de la app; juntas, el 99,8 %.

const fs   = require('fs');
const path = require('path');
const { aBritanico } = require('../lib/ipa-uk');

const DIR   = path.join(__dirname, '..', 'data');
const BASE  = 'https://raw.githubusercontent.com/open-dict-data/ipa-dict/master/data';
const SALIDA = path.join(DIR, 'lexicon.tsv');

async function descargarSiFalta(nombre) {
  const destino = path.join(DIR, nombre);
  if (fs.existsSync(destino)) return destino;
  process.stdout.write(`descargando ${nombre}… `);
  const res = await fetch(`${BASE}/${nombre}`);
  if (!res.ok) throw new Error(`no se pudo descargar ${nombre}: HTTP ${res.status}`);
  fs.writeFileSync(destino, Buffer.from(await res.arrayBuffer()));
  console.log('hecho');
  return destino;
}

/** Lee un fichero de ipa-dict a un Map palabra → primera transcripción. */
function leer(fichero) {
  const mapa = new Map();
  for (const linea of fs.readFileSync(fichero, 'utf8').split('\n')) {
    const [palabra, ipas] = linea.split('\t');
    if (!palabra || !ipas) continue;
    const clave = palabra.toLowerCase().trim();
    // Varias pronunciaciones vienen separadas por coma: se coge la primera.
    const ipa = ipas.split(',')[0].replace(/[/[\]]/g, '').trim();
    if (clave && ipa && !mapa.has(clave)) mapa.set(clave, ipa);
  }
  return mapa;
}

async function main() {
  fs.mkdirSync(DIR, { recursive: true });
  const [fUK, fUS] = await Promise.all([
    descargarSiFalta('en_UK.txt'),
    descargarSiFalta('en_US.txt'),
  ]);

  const uk = leer(fUK);
  const us = leer(fUS);
  console.log(`en_UK: ${uk.size} entradas · en_US: ${us.size} entradas`);

  const filas = [];
  for (const [palabra, ipa] of uk) filas.push([palabra, ipa, 'uk']);

  let convertidas = 0;
  for (const [palabra, ipa] of us) {
    if (uk.has(palabra)) continue;              // el británico manda
    const brit = aBritanico(ipa, palabra);
    if (!brit) continue;
    filas.push([palabra, brit, 'us→uk']);
    convertidas++;
  }

  // El tabulador es el separador, así que no puede aparecer en los datos.
  const limpio = (s) => String(s).replace(/[\t\r\n]/g, ' ');
  const tsv = filas.map((f) => f.map(limpio).join('\t')).join('\n') + '\n';
  fs.writeFileSync(SALIDA, tsv, 'utf8');

  console.log(`\n${filas.length} palabras en total`);
  console.log(`  ${uk.size} británicas directas`);
  console.log(`  ${convertidas} convertidas del americano`);
  console.log(`\nescrito en ${SALIDA} (${(tsv.length / 1e6).toFixed(1)} MB)`);
  console.log('\nPara cargarlo en el droplet:');
  console.log('  scp data/lexicon.tsv droplet:/tmp/');
  console.log('  ssh droplet "docker exec -i postgres psql -U postgres -d tutoringles \\');
  console.log('    -c \\"\\\\copy lexicon(word,ipa,fuente) FROM STDIN\\" < /tmp/lexicon.tsv"');
}

main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
