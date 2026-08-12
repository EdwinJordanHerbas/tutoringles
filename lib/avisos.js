// TutorIngles — lib/avisos.js
// El aviso diario. Es la pieza que decide si la app se abre o no.
//
// Contexto: a los diez días en producción había 0 sesiones de estudio. No
// faltaba contenido — faltaba que algo recordase que la app existe. Todo lo
// demás que hay construido depende de que esto funcione.
//
// El texto del aviso no es genérico a propósito: dice cuántas palabras tocan
// hoy y de qué va la situación de tu sector, para que se pueda decidir si
// entrar sin tener que entrar.

const webpush = require('web-push');

let configurado = false;

/** Arranca web-push con las claves VAPID. Sin ellas no se envía nada. */
function configurar({ publica, privada, contacto }) {
  if (!publica || !privada) return false;
  webpush.setVapidDetails(contacto || 'mailto:nadie@example.com', publica, privada);
  configurado = true;
  return true;
}

const estaConfigurado = () => configurado;

/**
 * Compone el aviso del día a partir de lo que hay pendiente de verdad.
 * Un aviso que dice "estudia inglés" se ignora; uno que dice "8 palabras y
 * devoluciones" deja decidir sin abrir la app.
 */
function componerAviso({ pendientes, meta, situacion, racha }) {
  const n = Math.min(pendientes || 0, meta || 8);

  if (!n && !situacion) {
    return { titulo: 'Cinco minutos de inglés', cuerpo: 'Hoy no hay repasos pendientes: buen momento para una situación de tienda.' };
  }

  const trozos = [];
  if (n) trozos.push(`${n} ${n === 1 ? 'palabra' : 'palabras'}`);
  if (situacion) trozos.push(situacion.toLowerCase());

  const titulo = racha > 1 ? `Racha de ${racha} días` : 'Cinco minutos de inglés';
  return { titulo, cuerpo: `${trozos.join(' y ')}. Se hace en una cola del súper.` };
}

/**
 * Envía a todas las suscripciones. Devuelve cuántas aceptaron y qué endpoints
 * están muertos, para que quien llama los borre: una suscripción caducada
 * responde 404/410 y reintentarla eternamente no sirve de nada.
 */
async function enviar(subs, payload) {
  if (!configurado) throw new Error('web-push sin configurar: faltan las claves VAPID');

  const caducadas = [];
  let ok = 0;

  await Promise.all((subs || []).map(async (s) => {
    const destino = { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } };
    try {
      await webpush.sendNotification(destino, JSON.stringify(payload));
      ok++;
    } catch (e) {
      const codigo = e?.statusCode;
      if (codigo === 404 || codigo === 410) caducadas.push(s.endpoint);
      else console.error('[avisos] fallo al enviar:', codigo || e?.message);
    }
  }));

  return { ok, caducadas };
}

/**
 * ¿Toca avisar ya? Compara la hora local con la configurada.
 * Se da por bueno cualquier momento entre la hora fijada y 15 minutos después,
 * para que un reinicio del contenedor no se salte el aviso del día.
 */
function tocaAvisar(horaConfig, ahora = new Date(), margenMin = 15) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(horaConfig || '').trim());
  if (!m) return false;
  const objetivo = Number(m[1]) * 60 + Number(m[2]);
  const actual   = ahora.getHours() * 60 + ahora.getMinutes();
  return actual >= objetivo && actual < objetivo + margenMin;
}

module.exports = { configurar, estaConfigurado, componerAviso, enviar, tocaAvisar };
