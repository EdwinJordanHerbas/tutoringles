// Tests del aviso diario.
// Ejecutar:  npm test
//
// Lo que importa aquí no es que el push llegue —eso depende del navegador— sino
// que el aviso diga algo útil y que no se dispare dos veces ni a deshora.

const test   = require('node:test');
const assert = require('node:assert');
const avisos = require('../lib/avisos');

test('el aviso dice qué toca hoy, no un genérico', () => {
  const a = avisos.componerAviso({ pendientes: 30, meta: 8, situacion: 'Devoluciones', racha: 0 });
  assert.match(a.cuerpo, /8 palabras/, `debería decir cuántas tocan: ${a.cuerpo}`);
  assert.match(a.cuerpo, /devoluciones/i, `debería nombrar la situación: ${a.cuerpo}`);
});

test('nunca pide más palabras que la meta del día', () => {
  // Con 209 pendientes, avisar de 209 es la forma más rápida de no abrir la app.
  const a = avisos.componerAviso({ pendientes: 209, meta: 8 });
  assert.match(a.cuerpo, /8 palabras/);
  assert.ok(!/209/.test(a.cuerpo), `no debe asustar con el total: ${a.cuerpo}`);
});

test('con una palabra sola no dice "1 palabras"', () => {
  assert.match(avisos.componerAviso({ pendientes: 1, meta: 8 }).cuerpo, /1 palabra\b/);
});

test('sin nada pendiente propone otra cosa en vez de callarse', () => {
  const a = avisos.componerAviso({ pendientes: 0, meta: 8, situacion: null });
  assert.ok(a.titulo && a.cuerpo);
  assert.match(a.cuerpo, /situación|situacion/i);
});

test('la racha se usa como titular cuando existe', () => {
  assert.match(avisos.componerAviso({ pendientes: 5, meta: 8, racha: 4 }).titulo, /4 días/);
  assert.match(avisos.componerAviso({ pendientes: 5, meta: 8, racha: 0 }).titulo, /[Cc]inco minutos/);
});

// Las horas se construyen en UTC y se comprueban contra Europe/Madrid a
// propósito: es exactamente la situación del droplet, y así el test da igual
// desde qué máquina se lance.
const enMadrid = (h, m) => new Date(Date.UTC(2026, 6, 30, h, m));   // julio: UTC+2

test('solo avisa dentro de la ventana de su hora', () => {
  const a = (h, m) => avisos.tocaAvisar('20:30', enMadrid(h, m), 15, 'Europe/Madrid');
  assert.strictEqual(a(18, 29), false, 'un minuto antes todavía no');
  assert.strictEqual(a(18, 30), true,  'en punto sí');
  assert.strictEqual(a(18, 44), true,  'dentro del margen sí');
  assert.strictEqual(a(18, 45), false, 'pasado el margen ya no');
  assert.strictEqual(a(7, 0),   false, 'por la mañana no');
});

test('el aviso va por la hora de España, no por la del servidor', () => {
  // El fallo real: el contenedor corre en UTC, así que `push_hora = 20:30`
  // se disparaba a las 20:30 UTC — las 22:30 de España. Trece días seguidos.
  const veinteTreintaEnMadrid = new Date(Date.UTC(2026, 6, 30, 18, 30));
  assert.strictEqual(
    avisos.tocaAvisar('20:30', veinteTreintaEnMadrid, 15, 'Europe/Madrid'), true,
    'a las 20:30 de España debe avisar');
  assert.strictEqual(
    avisos.tocaAvisar('20:30', new Date(Date.UTC(2026, 6, 30, 20, 30)), 15, 'Europe/Madrid'), false,
    'a las 20:30 UTC (22:30 en España) ya NO debe avisar');
});

test('el cambio de hora no descoloca el aviso', () => {
  // En enero España es UTC+1 y en julio UTC+2. La hora configurada es la que
  // ve el usuario, así que el aviso debe seguirla en las dos.
  assert.strictEqual(
    avisos.tocaAvisar('20:30', new Date(Date.UTC(2026, 0, 15, 19, 30)), 15, 'Europe/Madrid'), true,
    'en invierno, 20:30 de España son las 19:30 UTC');
});

test('una hora mal escrita no dispara avisos', () => {
  // Antes que avisar a deshora, no avisar.
  for (const mala of ['', null, 'luego', '25:00', '20-30', '20:99', undefined]) {
    assert.strictEqual(avisos.tocaAvisar(mala, enMadrid(18, 30), 15, 'Europe/Madrid'), false,
      `"${mala}" no debería disparar`);
  }
});

test('sin claves VAPID configuradas, enviar falla claro en vez de en silencio', async () => {
  if (avisos.estaConfigurado()) return;   // otro test pudo configurarlo antes
  await assert.rejects(() => avisos.enviar([], {}), /VAPID/);
});

test('configurar acepta unas claves válidas y rechaza las vacías', () => {
  assert.strictEqual(avisos.configurar({ publica: '', privada: '' }), false);
  const webpush = require('web-push');
  const k = webpush.generateVAPIDKeys();
  assert.strictEqual(avisos.configurar({ publica: k.publicKey, privada: k.privateKey, contacto: 'mailto:a@b.c' }), true);
  assert.strictEqual(avisos.estaConfigurado(), true);
});
