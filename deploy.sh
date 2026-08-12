#!/usr/bin/env bash
# TutorIngles — despliegue en producción
#
# Uso (desde el droplet):  bash /opt/tutoringles/deploy.sh
#
# /opt/tutoringles está montado dentro del contenedor en /app, así que basta
# con actualizar los archivos del directorio y reiniciar el contenedor.
#
set -euo pipefail

BACKEND_DIR=/opt/tutoringles
CONTAINER=tutoringles
DB_CONTAINER=postgres
DB_NAME=tutoringles
URL=https://tutoringles.tinafusion.com

cd "$BACKEND_DIR"

echo ">> Backup de la base de datos"
docker exec "$DB_CONTAINER" pg_dump -U postgres "$DB_NAME" \
  > "/root/${DB_NAME}_backup_$(date +%Y%m%d_%H%M%S).sql"

echo ">> Actualizar código"
if [ -d .git ]; then
  git pull --ff-only
else
  echo "   (sin repo git aquí: sube los archivos con scp antes de ejecutar esto)"
fi

echo ">> Comprobar sintaxis"
docker run --rm -v "$BACKEND_DIR:/app" -w /app node:20-alpine node --check server.js

echo ">> Migraciones"
echo "   Son idempotentes y se aplican a mano:"
echo "   docker exec -i $DB_CONTAINER psql -U postgres -d $DB_NAME -v ON_ERROR_STOP=1 < migration_XX.sql"

echo ">> Reiniciar backend"
docker restart "$CONTAINER" > /dev/null
sleep 3

echo ">> Comprobar salud"
if curl -fsS "$URL/health" > /dev/null; then
  echo ""
  echo ">> DEPLOY OK — $URL"
else
  echo ""
  echo "!! /health no responde. Últimos logs:"
  docker logs --tail 30 "$CONTAINER"
  exit 1
fi
