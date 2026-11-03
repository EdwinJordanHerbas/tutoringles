// TutorIngles — lib/despierto.js
// Mantiene la app despierta de día sin depender de GitHub.
//
// Render gratis duerme la app a los 15 minutos sin tráfico, y dormida no salen
// los avisos. El cron de GitHub tenía que llamar cada 10 minutos, pero el 2 y
// 3-nov-2026 corrió cada varias horas (12:58, 22:10, 03:28, 12:30), así que la
// app pasaba casi todo el día dormida. Ahora se llama ella misma a su dirección
// pública mientras está despierta, y GitHub sólo tiene que despertarla por la
// mañana (ver .github/workflows/despierta.yml).
//
// Misma franja que antes, 05:00-22:59 UTC: las 750 horas gratis de Render son
// por cuenta y hay otro servicio en ella. Fuera de la franja no se llama y Render
// la duerme. Llama a /ping, que no toca la base: así Neon también puede dormirse.

const MINUTOS = 10;

/** ¿Está esta hora dentro de la franja en la que la app debe seguir despierta? */
const dentroDeLaFranja = (fecha = new Date()) => fecha.getUTCHours() >= 5 && fecha.getUTCHours() <= 22;

/** Arranca la llamada periódica. Sin dirección pública (en local) no hace nada. */
function arrancarDespierto({ url = process.env.RENDER_EXTERNAL_URL, llamar = fetch } = {}) {
  if (!url) return null;
  return setInterval(async () => {
    if (!dentroDeLaFranja()) return;
    try {
      await llamar(`${url.replace(/\/$/, '')}/ping`);
    } catch (e) {
      console.error('[despierto] no se pudo llamar a /ping:', e.message);
    }
  }, MINUTOS * 60 * 1000);
}

module.exports = { dentroDeLaFranja, arrancarDespierto };
