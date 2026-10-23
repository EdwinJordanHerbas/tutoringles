#!/usr/bin/env node
// TutorIngles — tools/claude-falso.js
// Un servidor que imita a la API de Claude, para desarrollar y probar la IA sin
// gastar crédito.
//
//   node tools/claude-falso.js 4999
//   ANTHROPIC_BASE_URL=http://127.0.0.1:4999 ANTHROPIC_API_KEY=sk-ant-falso-xxxxxxxxxxxxxxxxxxxxxxxx npm start
//
// Responde a POST /v1/messages con un JSON que cumple el esquema que se le
// pide (lo reconoce por el prompt de sistema) y a GET /v1/models/:id. Guarda
// las peticiones que recibe en `peticiones`, para que un test pueda mirar qué
// mandó la app: el modelo, el esquema, la caché del sistema, el effort…
//
// Lo que NO prueba: que Claude entienda bien los prompts. Eso sólo se ve con
// la API de verdad (POST /ia/prueba desde Ajustes, unos céntimos).

const http = require('http');

const ERR = { tipo: 'gramatica', clave: 'Género de los sustantivos.', mal: 'le baguette', bien: 'la baguette', traduccion: 'la barra de pan', explicacion: 'Baguette es femenino.' };

const RESPUESTAS = [
  ['profesor de pronunciación', () => ({
    entendido: false, puntuacion: 72.6, resumen: 'Casi: una vocal se te cierra.',
    palabras: [{ palabra: 'ship', oido: 'sheep', problema: '/ɪ/ corta', consejo: 'Acorta la vocal.' }],
    ejercicio: 'Di ship – sheep tres veces.', errores: [{ ...ERR, tipo: 'pronunciacion', clave: '/ɪ/ corta frente a /iː/ larga', mal: 'sheep', bien: 'ship' }],
  })],
  ['compañero de conversación', () => ({
    respuesta: 'Bonjour ! Qu\'est-ce que je vous sers ?', traduccion: '¡Buenos días! ¿Qué le pongo?',
    correccion: { hay_error: true, dijiste: 'je veux le baguette', mejor: 'Je voudrais une baguette', explicacion: 'Femenino y condicional de cortesía.' },
    sugerencias: ['Une baguette, s\'il vous plaît.', 'Je prendrai aussi un croissant.', 'C\'est tout.', 'sobra'], terminado: false, errores: [ERR],
  })],
  ['expresión escrita', () => ({
    notas: { content: 4, achievement: 7, organisation: 3.4, language: -1 }, nivel_estimado: 'B1',
    comentario: 'Bien en general.', puntos_fuertes: ['Claridad'],
    correcciones: [{ original: 'le baguette', corregido: 'la baguette', explicacion: 'Femenino.', tipo: 'gramatica' }],
    version_mejorada: 'Madame, Monsieur…', siguiente_paso: 'Varía los conectores.', errores: [ERR],
  })],
  ['expresión oral', () => ({
    notas: { gramatica: 3, lexico: 3, discurso: 2, tarea: 4 }, nivel_estimado: 'B1', comentario: 'Hablas poco.',
    puntos_fuertes: ['Se te entiende'], correcciones: [], frases_utiles: ['D\'une part…', 'Cela dit…'],
    siguiente_paso: 'Anuncia un plan.', errores: [ERR],
  })],
  ['tutor personal', () => ({
    diagnostico: 'Pocos datos todavía.',
    prioridades: [{ titulo: 'Sesión diaria', por_que: 'Hay 0 días de estudio.', como: '5 minutos al día.', seccion: 'sesion' }],
    frase_semana: 'Je voudrais une baguette.', frase_semana_es: 'Quería una barra.',
  })],
];

function crear({ fallarCon = null } = {}) {
  const peticiones = [];
  const srv = http.createServer((req, res) => {
    let cuerpo = '';
    req.on('data', (d) => { cuerpo += d; });
    req.on('end', () => {
      const json = (st, o) => { res.writeHead(st, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
      if (req.method === 'GET' && req.url.startsWith('/v1/models/')) {
        // El SDK manda la clave como `Authorization: Bearer` (versiones 1.x) o
        // como `x-api-key` (las anteriores): se miran las dos.
        const clave = req.headers['x-api-key'] || String(req.headers.authorization || '').replace(/^Bearer /, '');
        if (clave.startsWith('sk-ant-mala-')) return json(401, { type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } });
        return json(200, { type: 'model', id: decodeURIComponent(req.url.split('/').pop()), display_name: 'Falso', created_at: '2026-01-01T00:00:00Z' });
      }
      if (req.method !== 'POST' || !req.url.startsWith('/v1/messages')) return json(404, { type: 'error', error: { type: 'not_found_error', message: 'no' } });
      let p;
      try { p = JSON.parse(cuerpo); } catch { return json(400, { type: 'error', error: { type: 'invalid_request_error', message: 'json' } }); }
      peticiones.push({ cabeceras: req.headers, cuerpo: p });
      if (fallarCon) return json(fallarCon.status, { type: 'error', error: { type: fallarCon.tipo, message: fallarCon.mensaje } });
      const sistema = (p.system || []).map((b) => b.text).join('\n');
      const r = RESPUESTAS.find(([marca]) => sistema.includes(marca));
      if (!r) return json(400, { type: 'error', error: { type: 'invalid_request_error', message: 'prompt desconocido' } });
      const primera = peticiones.length === 1;
      json(200, {
        id: `msg_falso_${peticiones.length}`, type: 'message', role: 'assistant', model: p.model,
        stop_reason: 'end_turn', stop_sequence: null, stop_details: null,
        content: [{ type: 'thinking', thinking: '', signature: 'falso' }, { type: 'text', text: JSON.stringify(r[1]()) }],
        usage: {
          input_tokens: 300, output_tokens: 400,
          cache_creation_input_tokens: primera ? 1000 : 0, cache_read_input_tokens: primera ? 0 : 1000,
        },
      });
    });
  });
  return { srv, peticiones };
}

/** Arranca en `puerto` (0 = uno libre) y resuelve con la URL base. */
function arrancar(puerto = 0, opciones) {
  const f = crear(opciones);
  return new Promise((ok) => f.srv.listen(puerto, '127.0.0.1', () => {
    ok({ ...f, url: `http://127.0.0.1:${f.srv.address().port}`, cerrar: () => new Promise((c) => f.srv.close(c)) });
  }));
}

if (require.main === module) {
  arrancar(parseInt(process.argv[2], 10) || 4999).then((f) => console.log(`Claude falso en ${f.url}`));
}

module.exports = { arrancar };
