#!/usr/bin/env node
// TutorIngles — tools/migrar.js
// Deja la base lista: aplica las migraciones que falten y carga el diccionario
// de pronunciación si está vacío.
//
//   DATABASE_URL=postgres://… node tools/migrar.js
//
// Existe desde el 29-sep-2026, cuando la app salió del droplet a Render + Neon.
// En el droplet las migraciones se aplicaban a mano con `docker exec … psql`,
// una a una y en orden. En Render no hay consola a mano ni disco que dure, así
// que esto corre en cada arranque (ver render.yaml) y tiene que ser seguro de
// repetir:
//
//  - Lleva la cuenta en la tabla `migraciones`. Sólo aplica las que no están.
//    Todas son idempotentes igualmente, así que en una base que ya las tenía
//    aplicadas a mano (sin la tabla) volver a pasarlas no rompe nada.
//  - Cada fichero trae su propio BEGIN/COMMIT: si una falla, se para aquí y la
//    app NO arranca. Arrancar con el esquema a medias es peor que no arrancar.
//  - Varias migraciones dan permisos a un usuario de Postgres "tutoringles",
//    que era el de la app en el droplet (las tablas eran de `postgres`). En Neon
//    la app entra con el dueño de la base y no hace falta, pero un GRANT a un
//    usuario que no existe tumba la migración entera. Se intenta crear ese
//    usuario sin login; si no hay permiso para eso, se quitan esas líneas.

const fs   = require('fs');
const path = require('path');
const { Client } = require('pg');

const RAIZ = path.join(__dirname, '..');
const LEXICO = path.join(RAIZ, 'data', 'lexicon.tsv');

/** migration.sql primero, luego migration_NN_… por número. */
function ficheros() {
  const todos = fs.readdirSync(RAIZ).filter((f) => /^migration(_\d+_.+)?\.sql$/.test(f));
  const num = (f) => (f === 'migration.sql' ? 0 : parseInt(f.split('_')[1], 10));
  return todos.sort((a, b) => num(a) - num(b) || a.localeCompare(b));
}

const GRANT_TUTORINGLES = /^\s*GRANT\b[^;]*\bTO\s+"?tutoringles"?\s*;\s*$/gim;

async function asegurarRol(db) {
  try {
    await db.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tutoringles') THEN
        CREATE ROLE tutoringles NOLOGIN;
      END IF; END $$;`);
    return true;
  } catch (e) {
    console.log(`· sin permiso para crear el usuario "tutoringles" (${e.message}): se quitan sus GRANT`);
    return false;
  }
}

async function cargarLexico(db) {
  const { rows: [t] } = await db.query("SELECT to_regclass('public.lexicon') AS t");
  if (!t.t) return;
  const { rows: [c] } = await db.query('SELECT count(*)::int AS n FROM lexicon');
  if (c.n > 0) return console.log(`· diccionario: ${c.n} palabras, ya cargado`);
  if (!fs.existsSync(LEXICO)) {
    return console.log('· diccionario: vacío y sin data/lexicon.tsv (node tools/generar-lexico.js). La figurada no saldrá.');
  }
  const filas = fs.readFileSync(LEXICO, 'utf8').split('\n')
    .map((l) => l.split('\t')).filter((f) => f.length >= 2 && f[0] && f[1]);
  // Por tandas y con unnest: 147.000 filas en ~30 viajes y no en 147.000.
  const TANDA = 5000;
  await db.query('BEGIN');
  for (let i = 0; i < filas.length; i += TANDA) {
    const t = filas.slice(i, i + TANDA);
    await db.query(
      `INSERT INTO lexicon (word, ipa, fuente)
       SELECT * FROM unnest($1::text[], $2::text[], $3::text[])
       ON CONFLICT DO NOTHING`,
      [t.map((f) => f[0]), t.map((f) => f[1]), t.map((f) => f[2] || null)]);
  }
  await db.query('COMMIT');
  console.log(`· diccionario: ${filas.length} palabras cargadas`);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('Falta DATABASE_URL');
    process.exit(1);
  }
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();

  await db.query(`CREATE TABLE IF NOT EXISTS migraciones (
    nombre    TEXT PRIMARY KEY,
    aplicada  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  const { rows } = await db.query('SELECT nombre FROM migraciones');
  const hechas = new Set(rows.map((r) => r.nombre));
  const pendientes = ficheros().filter((f) => !hechas.has(f));

  if (pendientes.length) {
    const conRol = await asegurarRol(db);
    for (const f of pendientes) {
      let sql = fs.readFileSync(path.join(RAIZ, f), 'utf8');
      if (!conRol) sql = sql.replace(GRANT_TUTORINGLES, '-- (GRANT a "tutoringles" quitado por tools/migrar.js)');
      const t0 = Date.now();
      try {
        await db.query(sql);
      } catch (e) {
        await db.query('ROLLBACK').catch(() => {});
        console.error(`✗ ${f}: ${e.message}`);
        await db.end();
        process.exit(1);
      }
      await db.query('INSERT INTO migraciones (nombre) VALUES ($1) ON CONFLICT DO NOTHING', [f]);
      console.log(`✓ ${f} (${Date.now() - t0} ms)`);
    }
  }
  console.log(`· migraciones: ${pendientes.length} aplicadas ahora, ${hechas.size + pendientes.length} en total`);

  await cargarLexico(db);
  await db.end();
}

if (require.main === module) {
  main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
}

module.exports = { ficheros, GRANT_TUTORINGLES };
