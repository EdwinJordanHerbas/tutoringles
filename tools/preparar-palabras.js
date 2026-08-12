#!/usr/bin/env node
// TutorIngles — tools/preparar-palabras.js
// Agrupa el vocabulario en bloques para grabarlo con la misma voz que las
// frases del sector.
//
//   node tools/preparar-palabras.js data/audio/palabras.txt
//
// Por qué hace falta grabar también las palabras: el vocabulario se leía con la
// voz del móvil, y en iPhone eso salió mal de dos maneras seguidas —primero
// eligiendo una voz de broma de Apple, después porque iOS arranca tarde en los
// enunciados de una sola palabra y se come la primera sílaba—. Con audio
// grabado desaparecen las dos cosas y, sobre todo, toda la app pasa a sonar
// con la misma voz y la misma pronunciación.
//
// El fichero de entrada sale de:
//   ssh droplet "docker exec -i postgres psql -U tutoringles -d tutoringles \
//     -tAF'|' -c 'SELECT id, word FROM words ORDER BY id;'"

const fs   = require('fs');
const path = require('path');

// Doce por bloque. Las palabras son cortas —nueve letras de media— así que
// doce caben de sobra en una generación cómoda de revisar, y con menos de
// quince oraciones el modelo no se come pausas (lección de los diálogos).
const POR_BLOQUE = 12;

const entrada = process.argv[2] || path.join(__dirname, '..', 'data', 'audio', 'palabras.txt');
if (!fs.existsSync(entrada)) {
  console.error(`No encuentro ${entrada}`);
  process.exit(1);
}

const palabras = fs.readFileSync(entrada, 'utf8').split('\n')
  .map((l) => l.trim()).filter(Boolean)
  .map((l) => {
    const i = l.indexOf('|');
    return { id: Number(l.slice(0, i)), w: l.slice(i + 1).trim() };
  })
  .filter((x) => x.id && x.w);

const bloques = [];
for (let i = 0; i < palabras.length; i += POR_BLOQUE) {
  const trozo = palabras.slice(i, i + POR_BLOQUE);
  bloques.push({
    nombre: `palabras_${String(i / POR_BLOQUE + 1).padStart(2, '0')}`,
    situacion: 'Vocabulario',
    tipo: 'palabras sueltas',
    // SEPARADAS POR LÍNEA EN BLANCO, no sólo por punto, y hay que generarlas
    // con `speech_rate: -3`. Con un simple ". " el modelo lee la lista de
    // corrido —12 palabras en 6,5 s, cuatro pausas en total— y no hay forma de
    // cortarla. Con línea en blanco y el ritmo bajo son 16,8 s y una pausa
    // limpia por palabra: 12 de 12 cortadas a la primera.
    //
    // El emparejamiento con la generación no se resiente porque se compara el
    // prompt normalizado, y ahí los saltos y los puntos desaparecen.
    texto: trozo.map((x) => x.w.replace(/[.·]+$/, '') + '.').join('\n\n'),
    ids: trozo.map((x) => x.id),
    frases: trozo.map((x) => x.w),
  });
}

const dir = path.join(__dirname, '..', 'data', 'audio');
fs.writeFileSync(path.join(dir, 'mapa-palabras.json'), JSON.stringify(bloques, null, 1));

const txt = bloques.map((b, i) => [
  '═'.repeat(66),
  `BLOQUE ${i + 1} de ${bloques.length}   ·   ${b.nombre}`,
  `${b.frases.length} palabras · ${b.texto.length} caracteres`,
  '─'.repeat(66),
  b.texto,
  '',
].join('\n')).join('\n');
fs.writeFileSync(path.join(dir, 'bloques-palabras.txt'), txt, 'utf8');

console.log(`${bloques.length} bloques · ${palabras.length} palabras`);
console.log(`el más largo: ${Math.max(...bloques.map((b) => b.texto.length))} caracteres`);
console.log(`\nEscrito en:\n  ${path.join(dir, 'mapa-palabras.json')}\n  ${path.join(dir, 'bloques-palabras.txt')}`);
console.log(`\nDespués:  node tools/cortar-audio.js <generaciones.json> mapa-palabras.json word`);
