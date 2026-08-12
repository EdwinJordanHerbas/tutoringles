#!/usr/bin/env node
// TutorIngles — tools/preparar-sonidos.js
// Agrupa los ejemplos de la sección SONIDOS para grabarlos con la voz de Emily.
//
//   node tools/preparar-sonidos.js
//
// Qué entra: los ejemplos de lib/guia-sonidos.js y de lib/intro-pronunciacion.js
// —`better`, `colour`, `work`, `cat`, y las frases de demostración—. Son
// referencias de pronunciación, y ahí la voz grabada sólo puede mejorar.
//
// Qué NO entra: los 71 pares mínimos. Se midieron antes de decidir y Emily no
// contrasta `ship` / `sheep`: 472 ms contra 482 ms de voz real, un 2 %, cuando
// en inglés la vocal larga dura entre una vez y media y dos veces la corta. En
// un ejercicio que consiste EN DISTINGUIR los dos sonidos, un audio que no los
// distingue enseña lo contrario de lo que pretende, y encima suena convincente.
// Los pares se quedan con la voz del sistema hasta tener una grabación que
// contraste de verdad.
//
// Los ids van a partir de ID_BASE para no chocar con los de `words`.

const fs   = require('fs');
const path = require('path');

const ID_BASE     = 10000;
const POR_BLOQUE  = 12;

const { GUIA, MARCAS } = require('../lib/guia-sonidos.js');
const { PASOS }        = require('../lib/intro-pronunciacion.js');

// Se recogen sin repetir y respetando el orden de aparición, que agrupa por
// sonido: así cada bloque queda temáticamente junto y es más fácil revisarlo.
const vistos = new Set();
const lista  = [];
const meter  = (t) => {
  const s = String(t || '').trim();
  if (!s) return;
  const k = s.toLowerCase();
  if (vistos.has(k)) return;
  vistos.add(k);
  lista.push(s);
};

for (const g of [...GUIA, ...MARCAS]) for (const [en] of g.ejemplos || []) meter(en);
for (const p of PASOS) {
  if (p.demo?.en) meter(p.demo.en);
  if (p.prueba?.escuchar) meter(p.prueba.escuchar);
}

// Fuera lo que ya está grabado como vocabulario: se busca por la misma clave
// que usa el índice, así que no hay que volver a pagarlo.
const clave = (s) => String(s || '').toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9' ]/g, ' ').replace(/\s+/g, ' ').trim();

const dirA = path.join(__dirname, '..', 'data', 'audio');
let yaGrabadas = {};
try {
  yaGrabadas = JSON.parse(fs.readFileSync(
    path.join(__dirname, '..', 'src', 'audio', 'index.json'), 'utf8')).porTexto || {};
} catch {}

// Y fuera también las palabras que forman parte de algún par mínimo. La guía
// las usa como ejemplo (`sheep` y `ship` ilustran la vocal doblada), pero el
// audio se busca POR TEXTO: grabar `ship` aquí lo metería también en el
// entrenador de oído, que es exactamente de lo que se quería librar. Se quedan
// con la voz del sistema hasta tener una grabación que contraste.
const fPares = path.join(dirA, 'pares.txt');
const dePar = new Set();
if (fs.existsSync(fPares)) {
  for (const l of fs.readFileSync(fPares, 'utf8').split('\n')) {
    for (const w of l.split('|')) if (w.trim()) dePar.add(clave(w));
  }
} else {
  console.error('AVISO: falta data/audio/pares.txt, no se puede excluir los pares mínimos.');
  process.exit(1);
}

const pendientes = lista.filter((w) => yaGrabadas[clave(w)] == null && !dePar.has(clave(w)));
const excluidas  = lista.filter((w) => dePar.has(clave(w)));

const bloques = [];
for (let i = 0; i < pendientes.length; i += POR_BLOQUE) {
  const trozo = pendientes.slice(i, i + POR_BLOQUE);
  bloques.push({
    nombre: `sonidos_${String(i / POR_BLOQUE + 1).padStart(2, '0')}`,
    situacion: 'Sonidos',
    tipo: 'ejemplos de pronunciación',
    // Línea en blanco entre cada uno y `speech_rate: -3`, igual que el
    // vocabulario: es lo único que hace que el modelo deje pausas cortables.
    texto: trozo.map((w) => w.replace(/[.!?·]+$/, '') + '.').join('\n\n'),
    ids: trozo.map((_, j) => ID_BASE + i + j),
    frases: trozo,
  });
}

fs.writeFileSync(path.join(dirA, 'mapa-sonidos.json'), JSON.stringify(bloques, null, 1));

console.log(`ejemplos distintos en SONIDOS: ${lista.length}`);
console.log(`  ya grabados con el vocabulario: ${lista.length - pendientes.length - excluidas.length}`);
console.log(`  excluidos por ser de un par mínimo: ${excluidas.length}  (${excluidas.join(', ')})`);
console.log(`  a grabar: ${pendientes.length}  →  ${bloques.length} bloques`);
console.log(`\nEscrito en ${path.join(dirA, 'mapa-sonidos.json')}`);
console.log(`Después:  node tools/cortar-audio.js <gen.json> mapa-sonidos.json word`);
