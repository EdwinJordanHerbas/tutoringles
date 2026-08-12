#!/usr/bin/env node
// TutorIngles — tools/preparar-audio.js
// Prepara los bloques de texto para generar el audio nativo en higgsfield.ai.
//
//   node tools/preparar-audio.js frases.txt
//
// Por qué agrupado y no frase a frase: son 148 frases. Generarlas sueltas es
// inviable a mano, y con Unlimited hay que hacerlo a mano — la FAQ de
// Higgsfield prohíbe automatizar el uso ilimitado, con suspensión de cuenta si
// lo detectan. Agrupadas salen ~25 generaciones, que sí se hacen en una tarde.
//
// El corte posterior funciona porque Seed Audio deja un silencio de 1,2-1,4 s
// entre frases. Comprobado sobre una generación real: con umbral de 1 s,
// ffmpeg separa exactamente por frases. Lo hace tools/cortar-audio.js.
//
// Genera dos cosas:
//   data/audio/bloques.txt  → los textos para copiar y pegar, uno por bloque
//   data/audio/mapa.json    → qué id de frase es cada trozo, para el corte

const fs   = require('fs');
const path = require('path');

// Cuántas frases por generación. Seis salen en unos 25 segundos, que es cómodo
// de revisar y deja los silencios bien marcados. Más largo aumenta el riesgo de
// que el modelo se coma una pausa y el corte salga desalineado.
const POR_BLOQUE = 6;

const entrada = process.argv[2];
if (!entrada) {
  console.error('Uso: node tools/preparar-audio.js <fichero-de-frases.txt>');
  console.error('El fichero sale de:');
  console.error("  ssh droplet \"docker exec -i postgres psql -U postgres -d tutoringles -tAF'|'\" <<'SQL'");
  console.error('  SELECT s.order_index, s.slug, s.title_es, l.kind, l.order_index, l.id, replace(l.en, \'|\', \'/\')');
  console.error('  FROM situations s JOIN situation_lines l ON l.situation_id = s.id');
  console.error('  ORDER BY s.order_index, l.kind DESC, l.order_index;');
  console.error('  SQL');
  process.exit(1);
}

const filas = fs.readFileSync(entrada, 'utf8').split('\n')
  .map((l) => l.trim()).filter(Boolean)
  .map((l) => {
    const [ord, slug, titulo, kind, lord, id, en] = l.split('|');
    return { slug, titulo, kind, id: Number(id), en: (en || '').trim() };
  })
  .filter((f) => f.en && f.id);

// Se agrupa por situación y tipo: las frases clave por un lado y el role-play
// por otro. Mezclarlos daría audios con saltos de contexto raros.
const grupos = new Map();
for (const f of filas) {
  const clave = `${f.slug}__${f.kind === 'key' ? 'frases' : 'dialogo'}`;
  if (!grupos.has(clave)) grupos.set(clave, { ...f, lineas: [] });
  grupos.get(clave).lineas.push(f);
}

const bloques = [];
for (const [clave, g] of grupos) {
  for (let i = 0; i < g.lineas.length; i += POR_BLOQUE) {
    const trozo = g.lineas.slice(i, i + POR_BLOQUE);
    bloques.push({
      nombre: `${clave}_${String(i / POR_BLOQUE + 1).padStart(2, '0')}`,
      situacion: g.titulo,
      tipo: g.kind === 'key' ? 'frases clave' : 'role-play',
      // Punto y espacio entre frases: es lo que produjo pausas de 1,2-1,4 s en
      // la prueba real. No se añaden marcas raras, que el modelo las lee.
      texto: trozo.map((l) => l.en.replace(/\s+/g, ' ').trim()).join(' '),
      ids: trozo.map((l) => l.id),
      frases: trozo.map((l) => l.en),
    });
  }
}

const dir = path.join(__dirname, '..', 'data', 'audio');
fs.mkdirSync(dir, { recursive: true });

const txt = bloques.map((b, i) => [
  `${'═'.repeat(66)}`,
  `BLOQUE ${i + 1} de ${bloques.length}   ·   ${b.nombre}`,
  `${b.situacion} · ${b.tipo} · ${b.frases.length} frases · ${b.texto.length} caracteres`,
  `${'─'.repeat(66)}`,
  b.texto,
  '',
].join('\n')).join('\n');

fs.writeFileSync(path.join(dir, 'bloques.txt'), txt, 'utf8');
fs.writeFileSync(path.join(dir, 'mapa.json'), JSON.stringify(bloques, null, 1), 'utf8');

const totalFrases = bloques.reduce((n, b) => n + b.frases.length, 0);
const largo = Math.max(...bloques.map((b) => b.texto.length));

console.log(`${bloques.length} bloques · ${totalFrases} frases · el más largo, ${largo} caracteres`);
console.log(`\nEscrito en:\n  ${path.join(dir, 'bloques.txt')}\n  ${path.join(dir, 'mapa.json')}`);
console.log(`
Cómo generarlos en higgsfield.ai (a mano, con Unlimited):
  1. higgsfield.ai/audio · modelo Seed Audio 1.0 (NO Eleven v3: ese cobra)
  2. Comprueba que el botón dice "Unlimited", no "Generate ✦1".
     El interruptor se apaga solo al recargar y al cambiar de sección.
  3. Pega un bloque, genera, y ESPERA. Si no aparece la cola, no vuelvas a
     pulsar: seis pulsaciones seguidas costaron 24 créditos el 28 de julio.
  4. Al terminar todos, tráelos con:  node tools/cortar-audio.js`);
