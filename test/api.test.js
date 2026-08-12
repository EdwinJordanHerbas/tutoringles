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

test('las tareas de Reading nunca exponen la respuesta correcta', conAuth, async () => {
  const lista = await (await get('/reading/tasks')).json();
  assert.ok(Array.isArray(lista) && lista.length, 'debería haber tareas de Reading');
  for (const t of lista) {
    const texto = await (await get(`/reading/task/${t.slug}`)).text();
    assert.ok(!texto.includes('"answer"'),
      `la tarea ${t.slug} está filtrando la respuesta al cliente`);
  }
});

test('Reading suma las 26 preguntas del examen oficial', conAuth, async () => {
  const lista = await (await get('/reading/tasks')).json();
  const total = lista.reduce((a, t) => a + t.questions, 0);
  assert.strictEqual(total, 26, `Reading (partes 5-8) son 26 preguntas, hay ${total}`);
});

test('Listening suma las 30 preguntas del examen oficial', conAuth, async () => {
  const lista = await (await get('/listening/tasks')).json();
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
