// Tests de la zona horaria.
// Ejecutar:  npm test
//
// El contenedor corre en UTC. Estos tests fijan el comportamiento que hace que
// eso deje de importar: la app tiene que hablar en hora de España aunque el
// servidor esté en Greenwich.

const test   = require('node:test');
const assert = require('node:assert');
const { fechaEnZona, minutosEnZona, ayerEnZona } = require('../lib/fechas');

const MADRID = 'Europe/Madrid';

test('la medianoche de España no es la del servidor', () => {
  // Las 00:30 del 12 de agosto en España son todavía el día 11 en UTC.
  // Con toISOString() una sesión de madrugada contaba para el día anterior y
  // rompía la racha.
  const madrugada = new Date(Date.UTC(2026, 7, 11, 22, 30));   // 00:30 del 12 en Madrid
  assert.strictEqual(fechaEnZona(madrugada, MADRID), '2026-08-12');
  assert.strictEqual(madrugada.toISOString().split('T')[0], '2026-08-11',
    'así es como se calculaba antes, y por eso fallaba');
});

test('el día cambia a medianoche de España, ni antes ni después', () => {
  assert.strictEqual(fechaEnZona(new Date(Date.UTC(2026, 7, 11, 21, 59)), MADRID), '2026-08-11',
    'a las 23:59 sigue siendo día 11');
  assert.strictEqual(fechaEnZona(new Date(Date.UTC(2026, 7, 11, 22, 0)), MADRID), '2026-08-12',
    'a las 00:00 ya es día 12');
});

test('la hora se lee en la zona del usuario', () => {
  assert.strictEqual(minutosEnZona(new Date(Date.UTC(2026, 6, 30, 18, 30)), MADRID), 20 * 60 + 30,
    'julio: UTC+2');
  assert.strictEqual(minutosEnZona(new Date(Date.UTC(2026, 0, 15, 19, 30)), MADRID), 20 * 60 + 30,
    'enero: UTC+1');
});

test('la medianoche se lee como 0 y no como 24', () => {
  // Con hour12:false algunos entornos devuelven "24" a medianoche, y entonces
  // las 00:10 se leerían como 1450 minutos: el aviso de primera hora no saldría.
  assert.strictEqual(minutosEnZona(new Date(Date.UTC(2026, 7, 11, 22, 0)), MADRID), 0);
  assert.strictEqual(minutosEnZona(new Date(Date.UTC(2026, 7, 11, 22, 10)), MADRID), 10);
});

test('ayer es el día anterior aunque haya cambio de hora en medio', () => {
  assert.strictEqual(ayerEnZona(new Date(Date.UTC(2026, 7, 12, 10, 0)), MADRID), '2026-08-11');
  // El último domingo de octubre España atrasa el reloj: ese día tiene 25 horas.
  // Calculando sobre el mediodía, restar un día sigue dando el día correcto.
  assert.strictEqual(ayerEnZona(new Date(Date.UTC(2026, 9, 26, 10, 0)), MADRID), '2026-10-25');
  assert.strictEqual(ayerEnZona(new Date(Date.UTC(2026, 2, 30, 10, 0)), MADRID), '2026-03-29');
});

test('una zona inválida no deja la app sin hora', () => {
  // Antes que reventar el planificador, caer a la hora del proceso.
  assert.ok(Number.isFinite(minutosEnZona(new Date(), 'Marte/Olympus')));
});
