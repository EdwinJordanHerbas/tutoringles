// TutorIngles — lib/ia.js
// El motor de IA: la llamada a Claude, lo que cuesta y el tope de gasto.
//
// Existe desde el 23-oct-2026, con un crédito de 100 $ en la API de Claude.
// Todo lo que la app hace con IA pasa por `llamarClaude()`: así hay un solo
// sitio donde se elige el modelo, se pide la salida en JSON con esquema, se
// calcula el coste de cada llamada y se decide si queda presupuesto.
//
// Tres cosas que no son obvias:
//
//  - **Claude no oye.** La API no recibe audio. Lo que llega es lo que el
//    reconocedor de voz del móvil ENTENDIÓ (con sus alternativas y su
//    confianza). Si quien escucha (Apple, Google) entiende "sheep" cuando dijiste
//    "ship", hay un sonido que no está saliendo, y eso sí se puede diagnosticar.
//    Lo que no se puede es puntuar el acento fonema a fonema: eso sigue siendo
//    cosa de Azure. Los prompts lo dicen, y la pantalla también.
//  - **Cada petición es de un solo turno.** Incluso la conversación: el diálogo
//    va escrito dentro del mensaje del usuario, no como historial de mensajes.
//    En Claude Opus 5.5 el razonamiento va siempre encendido y sus bloques
//    quedan atados a la conversación exacta que los produjo; un historial que
//    se recorta o se reconstruye en cada turno acaba en un 400. Con un turno
//    no hay historial que vigilar, y el prompt de sistema (fijo) se cachea.
//  - **El prompt de sistema no puede cambiar ni un byte entre llamadas.** Nada
//    de fechas, idioma ni perfil del alumno ahí: todo eso va en el mensaje del
//    usuario. Si no, la caché no acierta nunca y cada llamada paga el prompt
//    entero.

const Anthropic = require('@anthropic-ai/sdk').default;
const { betaZodOutputFormat } = require('@anthropic-ai/sdk/helpers/beta/zod');

/**
 * Precios en $ por millón de tokens (precios de la API de Anthropic,
 * comprobados el 23-oct-2026). La escritura en caché (TTL de 5 min) cuesta
 * 1,25 × la entrada. La lectura de caché de Haiku 5.5 no estaba publicada en
 * la tabla de referencia: se estima en 0,1 × la entrada.
 *
 * `fallbacks`: si el modelo admite el reenvío del lado del servidor cuando un
 * clasificador de seguridad rechaza la petición (`refusal`). Haiku 5.5 no lo
 * tiene.
 */
const MODELOS = {
  'claude-opus-5-5':   { nombre: 'Claude Opus 5.5',   entrada: 4.00, salida: 20.00, lecturaCache: 0.20, fallbacks: true },
  'claude-sonnet-5-5': { nombre: 'Claude Sonnet 5.5', entrada: 2.00, salida: 10.00, lecturaCache: 0.20, fallbacks: true },
  'claude-haiku-5-5':  { nombre: 'Claude Haiku 5.5',  entrada: 0.10, salida: 0.50,  lecturaCache: 0.01, fallbacks: false },
};
const MODELO_POR_DEFECTO = 'claude-opus-5-5';

const esModelo = (m) => Object.prototype.hasOwnProperty.call(MODELOS, m);

/** Coste en $ de unos tokens a los precios de un modelo. */
function costeTokens(t, modelo) {
  const p = MODELOS[modelo] || MODELOS[MODELO_POR_DEFECTO];
  return (
    (t.input_tokens || 0) * p.entrada +
    (t.cache_creation_input_tokens || 0) * p.entrada * 1.25 +
    (t.cache_read_input_tokens || 0) * p.lecturaCache +
    (t.output_tokens || 0) * p.salida
  ) / 1e6;
}

/**
 * Coste de una respuesta. Con reenvío del lado del servidor, `usage.iterations`
 * trae una entrada por cada modelo que trabajó en el turno (el que rechazó y el
 * que respondió), cada uno a su precio; sin él, todo va al modelo que respondió.
 */
function costeDe(usage, modeloPedido) {
  if (!usage) return 0;
  const its = Array.isArray(usage.iterations) ? usage.iterations : null;
  if (its && its.length) {
    return its.reduce((s, it) => s + costeTokens(it, it.model || modeloPedido), 0);
  }
  return costeTokens(usage, modeloPedido);
}

/** Suma de tokens de una respuesta, para el registro de uso. */
function tokensDe(usage) {
  const its = Array.isArray(usage?.iterations) && usage.iterations.length ? usage.iterations : [usage || {}];
  const s = { entrada: 0, salida: 0, cache_leida: 0, cache_escrita: 0 };
  for (const it of its) {
    s.entrada       += it.input_tokens || 0;
    s.salida        += it.output_tokens || 0;
    s.cache_leida   += it.cache_read_input_tokens || 0;
    s.cache_escrita += it.cache_creation_input_tokens || 0;
  }
  return s;
}

/** Error con un código que la API de la app traduce a respuesta HTTP. */
class ErrorIA extends Error {
  constructor(codigo, mensaje, extra = {}) {
    super(mensaje);
    this.codigo = codigo;
    Object.assign(this, extra);
  }
}

let _cliente = null;
let _claveCliente = null;

/** Un cliente por clave: si la clave cambia en Ajustes, se rehace. */
function clienteCon(clave, opciones = {}) {
  if (!clave) throw new ErrorIA('sin_clave', 'No hay clave de la API de Claude configurada.');
  const firma = clave + '|' + (opciones.baseURL || '');
  if (_cliente && _claveCliente === firma) return _cliente;
  _cliente = new Anthropic({ apiKey: clave, maxRetries: 2, timeout: 120_000, ...opciones });
  _claveCliente = firma;
  return _cliente;
}

/**
 * Una llamada a Claude con salida JSON validada contra un esquema de Zod.
 *
 * - `sistema` es el prompt fijo de la función (se cachea: tiene que ser
 *   idéntico byte a byte en cada llamada).
 * - `usuario` lleva todo lo variable: el idioma, el texto del alumno, su perfil.
 * - `effort` controla cuánto piensa el modelo — y por tanto lo que tarda y lo
 *   que cuesta. En Opus 5.5 el razonamiento no se puede apagar.
 *
 * - `timeout` y `maxRetries` van por petición y no por cliente: el móvil
 *   espera un tiempo fijo, y el servidor tiene que acabar antes que él (ver
 *   TIEMPOS_IA en server.js). Con los valores del SDK (120 s × 3 intentos) el
 *   móvil se rendía, el servidor seguía, cobraba y guardaba, y el alumno veía
 *   un error que le invitaba a pagar otra vez.
 *
 * Devuelve `{ datos, coste, tokens, modelo, servidoPor, fallback }`. Lanza
 * `ErrorIA` con un código entendible (`sin_clave`, `clave_mala`, `limite`,
 * `rechazo`, `incompleta`, `api`).
 */
async function llamarClaude({ cliente, modelo, sistema, usuario, esquema, effort = 'low', maxTokens = 4000, timeout, maxRetries }) {
  const m = esModelo(modelo) ? modelo : MODELO_POR_DEFECTO;
  const params = {
    model: m,
    max_tokens: maxTokens,
    system: [{ type: 'text', text: sistema, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: usuario }],
    output_config: { effort, format: betaZodOutputFormat(esquema) },
  };
  // Si un clasificador de seguridad rechaza la petición (en una app de idiomas
  // es rarísimo, pero un texto sobre un médico o una farmacia puede rozarlo),
  // el servidor la repite en el modelo adecuado dentro de la misma llamada.
  if (MODELOS[m].fallbacks) {
    params.betas = ['server-side-fallback-2026-07-01'];
    params.fallbacks = 'default';
  }

  const opciones = {};
  if (Number.isFinite(timeout)) opciones.timeout = timeout;
  if (Number.isInteger(maxRetries)) opciones.maxRetries = maxRetries;

  let r;
  try {
    r = await cliente.beta.messages.parse(params, opciones);
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) {
      throw new ErrorIA('clave_mala', 'La clave de la API no es válida o no tiene permiso.');
    }
    if (e instanceof Anthropic.RateLimitError) {
      throw new ErrorIA('limite', 'La API de Claude está limitando las peticiones. Prueba en un minuto.');
    }
    if (e instanceof Anthropic.BadRequestError) {
      // Un 400 por crédito agotado también llega por aquí.
      const msg = String(e.message || '');
      if (/credit|balance|billing/i.test(msg)) {
        throw new ErrorIA('sin_credito', 'La cuenta de la API se ha quedado sin crédito.');
      }
      throw new ErrorIA('api', `La API rechazó la petición: ${msg.slice(0, 300)}`);
    }
    if (e instanceof Anthropic.APIError) {
      throw new ErrorIA('api', `Error de la API de Claude (${e.status ?? 'sin conexión'}).`);
    }
    // Un JSON que no cumple el esquema también acaba aquí (lo valida el SDK).
    throw new ErrorIA('incompleta', `La respuesta no se pudo leer: ${String(e.message || e).slice(0, 200)}`);
  }

  const coste = costeDe(r.usage, m);
  const base = { coste, tokens: tokensDe(r.usage), modelo: m, servidoPor: r.model, fallback: r.model !== m };

  if (r.stop_reason === 'refusal') {
    throw new ErrorIA('rechazo', 'Claude no ha querido responder a esto.', base);
  }
  if (r.stop_reason === 'max_tokens') {
    throw new ErrorIA('incompleta', 'La respuesta se cortó por largo.', base);
  }
  if (!r.parsed_output) {
    throw new ErrorIA('incompleta', 'La respuesta no traía el formato esperado.', base);
  }
  return { datos: r.parsed_output, ...base };
}

/**
 * Tope de seguridad contra un bucle que vacíe el crédito: como mucho
 * `porVentana` llamadas cada `ventanaMs`. En memoria: si el servidor se
 * reinicia, se reinicia la cuenta, y está bien — el tope mensual en la base es
 * el que manda; esto sólo frena una ráfaga.
 */
function crearFreno({ porVentana = 40, ventanaMs = 10 * 60_000, ahora = () => Date.now() } = {}) {
  const marcas = [];
  return {
    permitir() {
      const t = ahora();
      while (marcas.length && t - marcas[0] > ventanaMs) marcas.shift();
      if (marcas.length >= porVentana) return false;
      marcas.push(t);
      return true;
    },
    _marcas: marcas,
  };
}

/**
 * Una petición idéntica, una sola llamada a Claude. Guarda en memoria la
 * respuesta buena durante `ttlMs`, y si llega otra igual mientras la primera
 * está en marcha, las dos esperan a la misma.
 *
 * Existe por el iPhone: corregir un ensayo tarda más de un minuto, la pantalla
 * se bloquea, la petición del móvil se corta y el servidor termina igual (cobra
 * y, en el oral, guarda). Al volver, el alumno pulsa REINTENTAR: sin esto pagaba
 * otra vez, el oral quedaba guardado dos veces y el mismo error contaba doble
 * (y a la segunda se convierte en tarjeta). Con esto, el reintento recibe la
 * respuesta que ya estaba hecha, gratis.
 *
 * Lo que falla no se guarda: un reintento tras un error de verdad sí llama.
 * `hacer(clave, fn)` devuelve `{ valor, repetida }`.
 */
function crearUnaVez({ ttlMs = 10 * 60_000, max = 200, ahora = () => Date.now() } = {}) {
  const hechas = new Map();     // clave → { valor, hasta }
  const enCurso = new Map();    // clave → promesa
  return {
    async hacer(clave, fn) {
      const t = ahora();
      const h = hechas.get(clave);
      if (h && h.hasta > t) return { valor: h.valor, repetida: true };
      if (h) hechas.delete(clave);
      if (enCurso.has(clave)) return { valor: await enCurso.get(clave), repetida: true };
      const p = Promise.resolve().then(fn);
      enCurso.set(clave, p);
      try {
        const valor = await p;
        hechas.set(clave, { valor, hasta: ahora() + ttlMs });
        // Tope de memoria: Render gratis tiene 512 MB y una corrección pesa poco,
        // pero no hay por qué guardarlas todas.
        while (hechas.size > max) hechas.delete(hechas.keys().next().value);
        return { valor, repetida: false };
      } finally {
        enCurso.delete(clave);
      }
    },
    _hechas: hechas,
  };
}

/** Recorta un texto del alumno a un máximo razonable sin partir palabras. */
function recortar(texto, max) {
  const s = String(texto ?? '').replace(/\r/g, '').trim();
  if (s.length <= max) return s;
  const corte = s.slice(0, max);
  const esp = corte.lastIndexOf(' ');
  return (esp > max * 0.8 ? corte.slice(0, esp) : corte) + ' […]';
}

module.exports = {
  MODELOS, MODELO_POR_DEFECTO, esModelo,
  costeTokens, costeDe, tokensDe,
  ErrorIA, clienteCon, llamarClaude, crearFreno, crearUnaVez, recortar,
};
