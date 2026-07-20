#!/usr/bin/env bash
# TutorIngles — despliegue en el servidor
# Uso:  bash /opt/tutoringles/deploy.sh
#
# ⚠️  SUSTITUYE las variables de la sección CONFIG antes de usar:
#     TARBALL  → URL del tarball de tu repositorio en GitHub
#     NGINX_SITE → ruta del archivo nginx para tu dominio
#
set -euo pipefail

# ── CONFIG (AJUSTA ESTOS VALORES) ────────────────────────
SRC=/tmp/tutoringles-deploy
TARBALL=https://github.com/TU_USUARIO/tutoringles/archive/refs/heads/main.tar.gz
NGINX_SITE=/etc/nginx/sites-available/tutoringles
BACKEND_DIR=/opt/tutoringles
SERVICE_NAME=tutoringles           # nombre del servicio systemd o contenedor docker

echo ">> Backup"
[ -f "$BACKEND_DIR/server.js" ] && cp "$BACKEND_DIR/server.js" "$BACKEND_DIR/server.js.bak"
[ -d "$BACKEND_DIR/src" ]       && tar czf /opt/tutoringles.bak.tgz -C "$BACKEND_DIR" src index.html sw.js manifest.json 2>/dev/null || true

echo ">> Descargar código"
rm -rf "$SRC" && mkdir -p "$SRC"
curl -fsSL "$TARBALL" | tar xz -C "$SRC" --strip-components=1

echo ">> Verificar versión"
grep -q 'TutorIngles Backend' "$SRC/server.js" || {
  echo "!! El tarball no contiene TutorIngles v1. Abortando."; exit 1;
}

echo ">> Backend"
cp "$SRC/server.js"  "$BACKEND_DIR/server.js"
cp "$SRC/package.json" "$BACKEND_DIR/package.json"

echo ">> Frontend"
cp "$SRC/index.html" "$SRC/manifest.json" "$SRC/sw.js" "$BACKEND_DIR/"
rm -rf "$BACKEND_DIR/src"
cp -r  "$SRC/src" "$BACKEND_DIR/src"

echo ">> nginx"
[ -f "$NGINX_SITE" ] && cp "$NGINX_SITE" "$NGINX_SITE.bak"
cp "$SRC/nginx.conf" "$NGINX_SITE"
nginx -t && systemctl reload nginx

echo ">> Reiniciar servicio"
# Opción A — Docker:
# docker restart $SERVICE_NAME
# Opción B — systemd:
systemctl restart $SERVICE_NAME

echo ""
echo ">> DEPLOY OK"
echo ">> Verifica: curl -s https://tutoringles.example.com/health"
