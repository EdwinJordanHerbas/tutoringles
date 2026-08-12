-- TutorIngles · Migración 18 — Notificaciones y sesión diaria
--
-- Aplicar:
--   ssh droplet 'docker exec -i postgres psql -U postgres -d tutoringles \
--     -v ON_ERROR_STOP=1 < /opt/tutoringles/migration_18_push_y_sesion.sql'
--
-- Por qué existe esta migración: a los diez días en producción la app tenía 0
-- sesiones de estudio, 0 situaciones practicadas y 3 palabras repasadas de 209.
-- El problema no era que faltase contenido, sino que nada recordaba que la app
-- existe y que al abrirla había que decidir por dónde empezar.
--
-- Dos arreglos: un aviso diario a una hora fija, y una sesión corta con final.

-- ══════════════════════ SUSCRIPCIONES DE AVISO ══════════════════════
-- Una fila por dispositivo. El endpoint que da el navegador es la clave: si el
-- mismo móvil se resuscribe, se actualiza en vez de duplicarse.
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          SERIAL PRIMARY KEY,
  profile_id  INTEGER NOT NULL DEFAULT 1 REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL UNIQUE,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  user_agent  TEXT,
  creada      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ultimo_ok   TIMESTAMPTZ,
  fallos      INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS push_subs_profile_idx ON push_subscriptions(profile_id);

-- Registro de lo enviado. Sirve para no mandar dos veces el mismo día aunque el
-- contenedor se reinicie, que es justo cuando se duplican los avisos.
CREATE TABLE IF NOT EXISTS push_log (
  id         SERIAL PRIMARY KEY,
  profile_id INTEGER NOT NULL DEFAULT 1 REFERENCES profiles(id) ON DELETE CASCADE,
  fecha      DATE NOT NULL,
  tipo       VARCHAR(20) NOT NULL DEFAULT 'diario',
  titulo     TEXT,
  cuerpo     TEXT,
  enviados   INTEGER NOT NULL DEFAULT 0,
  enviado_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id, fecha, tipo)
);

-- ══════════════════════ AJUSTES POR DEFECTO ══════════════════════
-- Ojo con el nombre: la meta de vocabulario ya existía como `daily_vocab_target`
-- (la usa settings.js). No crear una clave nueva o quedarían dos metas
-- distintas y la pantalla de ajustes editaría la que no se lee.
INSERT INTO config (key, value) VALUES
  ('daily_vocab_target', '8'),
  ('push_hora',          '20:30'),
  ('push_activo',        '0')
ON CONFLICT (key) DO NOTHING;

-- La meta baja de 20 palabras a 8. Veinte era una cifra puesta a ojo, y con 209
-- pendientes de golpe funciona como un muro: garantiza no empezar nunca. Ocho
-- se hacen en una cola del súper, que es la idea.
-- Solo se toca si seguía en el 20 de fábrica: si se cambió a mano, se respeta.
UPDATE config SET value = '8' WHERE key = 'daily_vocab_target' AND value = '20';

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "tutoringles";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "tutoringles";
