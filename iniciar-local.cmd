@echo off
REM ══════════════════════════════════════════════════════════════════
REM  TutorIngles — arranque local (doble clic)
REM ══════════════════════════════════════════════════════════════════
REM
REM  PREREQUISITOS:
REM  1. Node.js 18+ instalado
REM        node --version  (debe mostrar v18 o superior)
REM  2. PostgreSQL corriendo en localhost:5432
REM        (el que instala Odoo vale; usuario: odoo, contraseña: odoo)
REM  3. Base de datos "tutoringles" creada (solo la primera vez):
REM        createdb -U odoo tutoringles
REM  4. Esquema aplicado (solo la primera vez):
REM        psql -U odoo -d tutoringles -f migration.sql
REM  5. Dependencias instaladas (solo la primera vez):
REM        npm install
REM
REM  MODO MOCK (sin base de datos):
REM        Abre  http://localhost:3400?mock=1  en el navegador
REM        Todos los endpoints devuelven datos de ejemplo.
REM
REM ══════════════════════════════════════════════════════════════════

set DATABASE_URL=postgres://odoo:odoo@localhost:5432/tutoringles
set PORT=3400
set NODE_ENV=development
set APP_USER_NAME=Stark

REM  ── TOKEN DE ACCESO (opcional en desarrollo) ──────────────────
REM  Sin APP_TOKEN la API queda abierta (perfecto para desarrollo local).
REM  Para probar el sistema de auth, descomenta la siguiente línea:
REM set APP_TOKEN=dev123

REM  ── ORIGEN CORS (solo relevante en producción) ────────────────
REM set ALLOWED_ORIGIN=https://tutoringles.example.com

echo.
echo  ╔════════════════════════════════════════╗
echo  ║   TutorIngles · A2 ^-^> C1 Cambridge CAE  ║
echo  ║   http://localhost:3400                ║
echo  ║   Modo mock: ?mock=1                   ║
echo  ║   Ctrl+C para parar                    ║
echo  ╚════════════════════════════════════════╝
echo.

start http://localhost:3400
node server.js
