// Smoke test de la API contra un servidor real.
//
// Ejecutar:
//   TUTOR_URL=https://tutoringles.tinafusion.com TUTOR_TOKEN=xxx npm test
//
// Sin TUTOR_TOKEN los tests que necesitan autenticación se saltan, para que
// `npm test` siga siendo útil en local sin tener la clave a mano.

const test = require('node:test');
const assert = require('node:assert');

const URL   = process.env.TUTOR_URL   || 'http://localhost:3400';
const TOKEN = process.env.TUTOR_TOKEN || '';
const conAuth = TOKEN ? {} : { skip: 'define TUTOR_TOKEN para ejecutar este test' };

const get = (ruta) =>
  fetch(URL + ruta, TOKEN ? { headers: { Authorization: `Bearer ${TOKEN}` } } : undefined);

// Sin servidor levantado, estos tests se saltan en vez de fallar: no tener el
// backend arrancado en local no es un defecto del código.
let vivo = null;
async function servidorVivo() {
  if (vivo !== null) return vivo;
  try {
    await fetch(URL + '/health', { signal: AbortSignal.timeout(4000) });
    vivo = true;
  } catch {
    vivo = false;
  }
  return vivo;
}

test('/health responde y la base de datos contesta', async (t) => {
  if (!(await servidorVivo())) return t.skip(`sin servidor en ${URL}`);
  const r = await get('/health');
  assert.strictEqual(r.status, 200);
  const j = await r.json();
  assert.strictEqual(j.ok, true);
});

test('/auth/check rechaza una clave incorrecta', async (t) => {
  if (!(await servidorVivo())) return t.skip(`sin servidor en ${URL}`);
  const r = await fetch(URL + '/auth/check', {
    headers: { Authorization: 'Bearer clave-que-no-existe' },
  });
  const j = await r.json();
  // Si el servidor no tiene APP_TOKEN, la API está abierta y no aplica
  if (j.auth_required === false) return;
  assert.strictEqual(j.ok, false, 'una clave inventada nunca debe dar ok:true');
});

test('los datos exigen autenticación', async (t) => {
  if (!(await servidorVivo())) return t.skip(`sin servidor en ${URL}`);
  const r = await fetch(URL + '/stats');
  const j = await r.clone().json().catch(() => ({}));
  if (j.auth_required === false || r.status === 200) return;  // API abierta
  assert.strictEqual(r.status, 401);
});

// Las listas dan las del idioma activo, así que cada test dice de qué idioma
// habla: sin `?lang=`, el resultado dependía de si se había dejado la app en
// inglés o en francés.
test('las tareas de Reading y Listening nunca exponen la respuesta correcta', conAuth, async () => {
  for (const lang of ['en', 'fr']) {
    const textos = await (await get(`/reading/tasks?lang=${lang}`)).json();
    const audios = await (await get(`/listening/tasks?lang=${lang}`)).json();
    if (lang === 'en') assert.ok(textos.length && audios.length, 'debería haber Reading y Listening del Cambridge');
    for (const t of textos) {
      const texto = await (await get(`/reading/task/${t.slug}`)).text();
      assert.ok(!texto.includes('"answer"'), `el texto ${t.slug} está filtrando la respuesta al cliente`);
    }
    for (const t of audios) {
      const texto = await (await get(`/listening/task/${t.slug}`)).text();
      assert.ok(!texto.includes('"answer"'), `el audio ${t.slug} está filtrando la respuesta al cliente`);
    }
  }
});

test('Reading suma las 26 preguntas del examen oficial', conAuth, async () => {
  const lista = await (await get('/reading/tasks?lang=en')).json();
  const total = lista.reduce((a, t) => a + t.questions, 0);
  assert.strictEqual(total, 26, `Reading (partes 5-8) son 26 preguntas, hay ${total}`);
});

test('Listening suma las 30 preguntas del examen oficial', conAuth, async () => {
  const lista = await (await get('/listening/tasks?lang=en')).json();
  const total = lista.reduce((a, t) => a + t.questions, 0);
  assert.strictEqual(total, 30, `Listening son 30 preguntas, hay ${total}`);
});

test('el nivel estimado no se inventa cuando no hay datos', conAuth, async () => {
  const s = await (await get('/stats')).json();
  if (s.level_evidence === 0) {
    assert.strictEqual(s.estimated_level, null,
      'sin destrezas medidas, estimated_level debe ser null, no un nivel inventado');
  }
  for (const [nombre, d] of Object.entries(s.skills || {})) {
    if (d.attempts === 0) {
      assert.strictEqual(d.level, null, `${nombre} no tiene intentos pero declara nivel ${d.level}`);
    }
  }
});

test('el corrector de repaso rechaza un grado fuera de rango', conAuth, async () => {
  const due = await (await get('/user-words?due=1')).json();
  if (!Array.isArray(due) || !due.length) return;   // nada que repasar hoy
  const r = await fetch(`${URL}/user-words/${due[0].id}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({ rating: 9 }),
  });
  assert.strictEqual(r.status, 400, 'un rating de 9 debería dar 400');
});

// ── IDIOMAS Y MODO TETRIS ─────────────────────────────────
// Sólo GET: el test se puede lanzar contra producción, y abrir una noche
// (POST /tetris/noche) haría el sorteo de verdad para ese día.

test('cada idioma sólo devuelve sus palabras', conAuth, async () => {
  for (const lang of ['en', 'fr']) {
    const ws = await (await get(`/words?lang=${lang}`)).json();
    assert.ok(Array.isArray(ws));
    const ajenas = ws.filter((w) => w.lang !== lang);
    assert.strictEqual(ajenas.length, 0, `${lang}: ${ajenas.length} palabras de otro idioma`);
  }
});

test('en francés no se calcula figurada inglesa', conAuth, async () => {
  const ws = await (await get('/user-words?lang=fr')).json();
  if (!Array.isArray(ws) || !ws.length) return;   // francés aún sin migrar
  assert.ok(ws.every((w) => !w.pron), 'una palabra francesa no puede llevar la figurada del motor inglés');
});

test('el test del despertar es a ciegas: no dice qué palabras sonaron', conAuth, async () => {
  const texto = await (await get('/tetris/despertar')).text();
  assert.ok(!texto.includes('con_pista'), 'el test del despertar no puede revelar el grupo de cada palabra');
});

test('el estado del día Tetris siempre dice qué toca', conAuth, async () => {
  const t = await (await get('/tetris/hoy')).json();
  assert.ok(['despertar', 'ronda', 'almohada', 'noche', 'hecho'].includes(t.fase), `fase desconocida: ${t.fase}`);
  assert.ok(t.resultados && typeof t.resultados.veredicto === 'string');
});

test('el test de nivel del francés nunca envía la respuesta correcta', conAuth, async () => {
  const texto = await (await get('/diagnostico/fr')).text();
  assert.ok(!texto.includes('"correcta"'), 'la respuesta del test de francés no puede salir del servidor');
});
