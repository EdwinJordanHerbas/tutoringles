// Tests del motor de IA (lib/ia.js), el perfil (lib/ia-perfil.js) y los
// prompts (lib/ia-prompts.js). Ninguno gasta crédito: las llamadas van contra
// tools/claude-falso.js, que imita a la API y guarda lo que recibe.

const test = require('node:test');
const assert = require('node:assert');
const { z } = require('zod');
const { betaZodOutputFormat } = require('@anthropic-ai/sdk/helpers/beta/zod');

const ia = require('../lib/ia');
const iaP = require('../lib/ia-prompts');
const iaPerfil = require('../lib/ia-perfil');
const falso = require('../tools/claude-falso');

// ── Coste ─────────────────────────────────────────────────

test('el coste suma entrada, caché y salida a los precios del modelo', () => {
  const u = { input_tokens: 1_000_000, output_tokens: 1_000_000, cache_read_input_tokens: 1_000_000, cache_creation_input_tokens: 1_000_000 };
  // Opus 5.5: 4 + 20 + 0,20 + 4·1,25
  assert.strictEqual(Number(ia.costeDe(u, 'claude-opus-5-5').toFixed(4)), 29.2);
  // Haiku 5.5 es cuarenta veces más barato en entrada
  assert.strictEqual(Number(ia.costeDe({ input_tokens: 1_000_000 }, 'claude-haiku-5-5').toFixed(4)), 0.1);
});

test('con reenvío, cada modelo que trabajó cobra a su precio', () => {
  const u = {
    input_tokens: 0, output_tokens: 0,
    iterations: [
      { type: 'message', model: 'claude-opus-5-5', input_tokens: 1_000_000, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
      { type: 'fallback_message', model: 'claude-sonnet-5-5', input_tokens: 1_000_000, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
    ],
  };
  assert.strictEqual(Number(ia.costeDe(u, 'claude-opus-5-5').toFixed(4)), 6);
  assert.deepStrictEqual(ia.tokensDe(u), { entrada: 2_000_000, salida: 0, cache_leida: 0, cache_escrita: 0 });
});

test('un modelo desconocido no se acepta y se cae al de por defecto', () => {
  assert.strictEqual(ia.esModelo('gpt-5'), false);
  assert.strictEqual(ia.esModelo('constructor'), false);
  assert.strictEqual(ia.MODELO_POR_DEFECTO, 'claude-opus-5-5');
});

// ── Freno y recorte ──────────────────────────────────────

test('el freno corta una ráfaga y se recupera con el tiempo', () => {
  let t = 0;
  const f = ia.crearFreno({ porVentana: 3, ventanaMs: 1000, ahora: () => t });
  assert.ok(f.permitir() && f.permitir() && f.permitir());
  assert.strictEqual(f.permitir(), false);
  t = 1001;
  assert.strictEqual(f.permitir(), true);
});

test('recortar no parte palabras y avisa del corte', () => {
  assert.strictEqual(ia.recortar('  hola  ', 10), 'hola');
  const r = ia.recortar('una frase bastante larga para cortar', 20);
  assert.ok(r.endsWith(' […]'));
  assert.ok(!r.includes('bastant […]'));
  assert.strictEqual(ia.recortar(null, 5), '');
});

// ── Perfil ───────────────────────────────────────────────

test('los errores se normalizan, se deduplican y se limitan a cinco', () => {
  const e = (clave, tipo = 'gramatica') => ({ tipo, clave, mal: 'a', bien: 'b', traduccion: '', explicacion: '' });
  const r = iaPerfil.prepararErrores([
    e('  Género de los sustantivos. '), e('género de los sustantivos'), e('xx'),
    { ...e('inventado'), tipo: 'otro' }, e('error uno'), e('error dos'), e('error tres'), e('error cuatro'), e('error cinco'),
  ]);
  assert.strictEqual(r[0].clave, 'género de los sustantivos');
  assert.strictEqual(r.filter((x) => x.clave === 'género de los sustantivos').length, 1);
  assert.ok(!r.some((x) => x.tipo === 'otro'));
  assert.ok(!r.some((x) => x.clave === 'xx'), 'una clave de menos de 3 letras no sirve para agrupar');
  assert.strictEqual(r.length, 5);
  assert.deepStrictEqual(iaPerfil.prepararErrores(null), []);
});

test('un error se convierte en tarjeta a la segunda, y no si es de pronunciación', () => {
  const e = { tipo: 'gramatica', clave: 'género', mal: 'le baguette', bien: 'la baguette', traduccion: 'la barra de pan', explicacion: 'Femenino.' };
  assert.strictEqual(iaPerfil.mereceTarjeta(e, 1), false);
  assert.strictEqual(iaPerfil.mereceTarjeta(e, 2), true);
  assert.strictEqual(iaPerfil.mereceTarjeta({ ...e, tipo: 'pronunciacion' }, 5), false);
  assert.strictEqual(iaPerfil.mereceTarjeta({ ...e, bien: 'x'.repeat(81) }, 5), false, 'de noche se lee en voz alta: tiene que ser corta');
  assert.strictEqual(iaPerfil.mereceTarjeta({ ...e, bien: 'Le baguette' }, 5), false);
  const t = iaPerfil.tarjetaDeError(e);
  assert.strictEqual(t.word, 'la baguette', 'word es sólo lo que se dice en voz alta');
  assert.strictEqual(t.translation, 'la barra de pan — no «le baguette»');
});

// ── Prompts ──────────────────────────────────────────────

const SISTEMAS = Object.entries(iaP).filter(([k]) => k.startsWith('SISTEMA_'));

test('los prompts de sistema pasan del mínimo que se cachea y no llevan nada variable', () => {
  assert.strictEqual(SISTEMAS.length, 5);
  for (const [nombre, texto] of SISTEMAS) {
    // ~3,6 caracteres por token en español: 2.000 caracteres son ~550 tokens.
    assert.ok(texto.length > 2000, `${nombre} es demasiado corto para cachearse (mínimo 512 tokens)`);
    assert.ok(!/\b20\d\d-\d\d-\d\d\b/.test(texto), `${nombre} lleva una fecha: rompería la caché`);
    assert.ok(!/\$\{/.test(texto), `${nombre} tiene una plantilla sin resolver`);
  }
});

test('el mensaje de pronunciación lleva lo que oyó el reconocedor y el perfil', () => {
  const m = iaP.mensajePronunciacion({
    lang: 'en', objetivo: 'a ship',
    alternativas: [{ transcript: 'a sheep', confidence: 0.81 }, { transcript: 'a ship', confidence: 0 }],
    figurada: [{ palabra: 'ship', figurada: 'SHIP' }],
    perfil: [{ tipo: 'pronunciacion', clave: '/ɪ/ corta', veces: 3, mal: 'sheep', bien: 'ship' }],
  });
  assert.match(m, /«a ship»/);
  assert.match(m, /«a sheep» \(confianza 0\.81\)/);
  assert.ok(!m.includes('confianza 0.00'), 'una confianza 0 (no informada) no se enseña');
  assert.match(m, /ship: SHIP/);
  assert.match(m, /\/ɪ\/ corta \(3 veces\)/);
  assert.match(iaP.mensajePronunciacion({ lang: 'fr', objetivo: 'x', alternativas: [] }), /no entendió nada/);
});

test('la conversación sin mensaje pide abrir la escena', () => {
  const m = iaP.mensajeConversacion({ lang: 'fr', situacion: 'Panadería', papel: 'La panadera', historial: [], mensaje: '' });
  assert.match(m, /abre tú la escena/);
  const m2 = iaP.mensajeConversacion({
    lang: 'fr', situacion: 'Panadería', papel: 'La panadera', mensaje: 'une baguette',
    historial: [{ rol: 'ia', texto: 'Bonjour' }, { rol: 'alumno', texto: 'Bonjour madame' }],
  });
  assert.match(m2, /TÚ: Bonjour\nALUMNO: Bonjour madame/);
  assert.match(m2, /«une baguette»/);
});

test('el oral describe preguntas en lista o en objeto', () => {
  assert.strictEqual(iaP.describirPrompts(['¿Quién eres?', '¿Dónde trabajas?']), '- ¿Quién eres?\n- ¿Dónde trabajas?');
  const o = iaP.describirPrompts({ question: 'Q', documents: ['D1'], follow_up: 'F' });
  assert.match(o, /Pregunta: Q/);
  assert.match(o, /- D1/);
  assert.strictEqual(iaP.describirPrompts(null), '');
});

test('todos los esquemas se convierten a JSON Schema sin restricciones numéricas', () => {
  for (const k of ['RespuestaPronunciacion', 'RespuestaConversacion', 'RespuestaEscritura', 'RespuestaOral', 'RespuestaConsejo']) {
    const f = betaZodOutputFormat(iaP[k]);
    const s = JSON.stringify(f.schema);
    assert.ok(!/"minimum"|"maximum"|"minLength"/.test(s), `${k} lleva restricciones que la API no admite`);
  }
  assert.strictEqual(iaP.acotar(7, 0, 5), 5);
  assert.strictEqual(iaP.acotar(-1, 0, 5), 0);
  assert.strictEqual(iaP.acotar(3.4, 0, 5), 3);
  assert.strictEqual(iaP.acotar('x', 0, 5), 0);
});

// ── Llamada contra el Claude falso ───────────────────────

test('la llamada pide JSON con esquema, cachea el sistema y activa el reenvío', async () => {
  const f = await falso.arrancar();
  try {
    const cliente = ia.clienteCon('sk-ant-falso-xxxxxxxxxxxxxxxxxxxxxx', { baseURL: f.url, maxRetries: 0 });
    const r = await ia.llamarClaude({
      cliente, modelo: 'claude-opus-5-5', sistema: iaP.SISTEMA_PRONUNCIACION, usuario: 'hola',
      esquema: iaP.RespuestaPronunciacion, effort: 'low', maxTokens: 1234,
    });
    const p = f.peticiones[0].cuerpo;
    assert.strictEqual(p.model, 'claude-opus-5-5');
    assert.strictEqual(p.max_tokens, 1234);
    assert.deepStrictEqual(p.system[0].cache_control, { type: 'ephemeral' });
    assert.strictEqual(p.system[0].text, iaP.SISTEMA_PRONUNCIACION);
    assert.strictEqual(p.messages.length, 1, 'un solo turno: sin historial que se pueda romper');
    assert.strictEqual(p.output_config.effort, 'low');
    assert.strictEqual(p.output_config.format.type, 'json_schema');
    assert.strictEqual(p.fallbacks, 'default');
    assert.match(f.peticiones[0].cabeceras['anthropic-beta'], /server-side-fallback-2026-07-01/);
    assert.ok(!('thinking' in p), 'en Opus 5.5 el razonamiento no se configura: va siempre');
    assert.ok(!('temperature' in p));
    assert.strictEqual(r.datos.palabras[0].oido, 'sheep');
    // 300 entrada + 1000 escritos en caché + 400 salida, a precios de Opus 5.5
    assert.strictEqual(Number(r.coste.toFixed(6)), Number(((300 * 4 + 1000 * 5 + 400 * 20) / 1e6).toFixed(6)));
  } finally { await f.cerrar(); }
});

test('Haiku no lleva reenvío (no lo admite)', async () => {
  const f = await falso.arrancar();
  try {
    const cliente = ia.clienteCon('sk-ant-falso-yyyyyyyyyyyyyyyyyyyyyy', { baseURL: f.url, maxRetries: 0 });
    await ia.llamarClaude({ cliente, modelo: 'claude-haiku-5-5', sistema: iaP.SISTEMA_CONSEJO, usuario: 'x', esquema: iaP.RespuestaConsejo });
    assert.ok(!('fallbacks' in f.peticiones[0].cuerpo));
  } finally { await f.cerrar(); }
});

test('los errores de la API llegan con un código que se puede explicar', async () => {
  const casos = [
    [{ status: 401, tipo: 'authentication_error', mensaje: 'invalid x-api-key' }, 'clave_mala'],
    [{ status: 400, tipo: 'invalid_request_error', mensaje: 'Your credit balance is too low' }, 'sin_credito'],
    [{ status: 400, tipo: 'invalid_request_error', mensaje: 'algo raro' }, 'api'],
  ];
  for (const [fallarCon, codigo] of casos) {
    const f = await falso.arrancar(0, { fallarCon });
    try {
      const cliente = ia.clienteCon(`sk-ant-falso-${codigo}-zzzzzzzzzzzzzzzzzz`, { baseURL: f.url, maxRetries: 0 });
      await assert.rejects(
        ia.llamarClaude({ cliente, modelo: 'claude-opus-5-5', sistema: 'x', usuario: 'y', esquema: z.object({ a: z.string() }) }),
        (e) => e instanceof ia.ErrorIA && e.codigo === codigo);
    } finally { await f.cerrar(); }
  }
});

test('sin clave no se construye cliente', () => {
  assert.throws(() => ia.clienteCon(''), (e) => e.codigo === 'sin_clave');
});

// ── Tiempos y reintentos ─────────────────────────────────
// El móvil espera un tiempo fijo (src/js/ia.js) y el servidor tiene que acabar
// antes. Con los valores del SDK (120 s × 3 intentos) el móvil se rendía, el
// servidor seguía y cobraba igual.

test('el tiempo máximo y los reintentos van por petición', async () => {
  const f = await falso.arrancar(0, { retrasoMs: 600 });
  try {
    // Cliente con reintentos de sobra: manda lo que diga la petición.
    const cliente = ia.clienteCon('sk-ant-falso-tiempo-wwwwwwwwwwwwwwww', { baseURL: f.url, maxRetries: 5 });
    const t0 = Date.now();
    await assert.rejects(
      ia.llamarClaude({ cliente, modelo: 'claude-opus-5-5', sistema: iaP.SISTEMA_PRONUNCIACION, usuario: 'x',
        esquema: iaP.RespuestaPronunciacion, timeout: 150, maxRetries: 1 }),
      (e) => e instanceof ia.ErrorIA);
    assert.ok(Date.now() - t0 < 3000, 'no espera los 600 ms de cada intento');
    assert.strictEqual(f.peticiones.length, 2, 'un intento y un reintento, no seis');
  } finally { await f.cerrar(); }
});

// ── Una petición idéntica, una llamada ───────────────────

test('una petición repetida recibe la respuesta guardada sin volver a llamar', async () => {
  let t = 0, llamadas = 0;
  const u = ia.crearUnaVez({ ttlMs: 1000, ahora: () => t });
  const fn = async () => { llamadas++; return { nota: 7 }; };
  assert.deepStrictEqual(await u.hacer('a', fn), { valor: { nota: 7 }, repetida: false });
  assert.deepStrictEqual(await u.hacer('a', fn), { valor: { nota: 7 }, repetida: true });
  assert.strictEqual(llamadas, 1);
  await u.hacer('b', fn);
  assert.strictEqual(llamadas, 2, 'otra petición sí llama');
  t = 1001;
  assert.strictEqual((await u.hacer('a', fn)).repetida, false, 'pasado el plazo, se vuelve a pedir');
  assert.strictEqual(llamadas, 3);
});

test('dos peticiones iguales a la vez esperan a la misma llamada', async () => {
  const u = ia.crearUnaVez();
  let llamadas = 0, soltar;
  const fn = () => { llamadas++; return new Promise((ok) => { soltar = () => ok('hecho'); }); };
  const p1 = u.hacer('x', fn);
  const p2 = u.hacer('x', fn);
  await new Promise((r) => setImmediate(r));
  soltar();
  const [r1, r2] = await Promise.all([p1, p2]);
  assert.strictEqual(llamadas, 1);
  assert.strictEqual(r1.valor, 'hecho');
  assert.strictEqual(r2.valor, 'hecho');
  assert.strictEqual(r2.repetida, true);
});

test('lo que falla no se guarda: el reintento sí llama', async () => {
  const u = ia.crearUnaVez();
  let llamadas = 0;
  const falla = async () => { llamadas++; throw new ia.ErrorIA('api', 'caída'); };
  await assert.rejects(u.hacer('k', falla), (e) => e.codigo === 'api');
  await assert.rejects(u.hacer('k', falla), (e) => e.codigo === 'api');
  assert.strictEqual(llamadas, 2);
  assert.strictEqual((await u.hacer('k', async () => 'ok')).repetida, false);
});

test('la memoria de respuestas tiene tope', async () => {
  const u = ia.crearUnaVez({ max: 3 });
  for (const k of ['a', 'b', 'c', 'd']) await u.hacer(k, async () => k);
  assert.strictEqual(u._hechas.size, 3);
  assert.ok(!u._hechas.has('a'), 'se va la más antigua');
});
