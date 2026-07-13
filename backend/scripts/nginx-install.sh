#!/usr/bin/env bash
# Install/update the ccsvi nginx site config.
# Run on VM after nginx is installed. safe to re-run.
#
# serve /data/ directly from disk instead of proxying through FastAPI's StaticFiles. 
# Also adds gzip for JSON/GeoJSON and a Cache-Control header
# gzip is intentionally scoped to json/geo+json/csv only: nginx cannot gzip
# a response and honor Range requests on it. PMTiles and COG tiffs rely on
# Range requests for partial reads, so they must never match gzip_types.
set -euo pipefail

REPO_ROOT="/home/exouser/ccsvi-dashboard"
DATA_ROOT="/home/exouser/ccsvi-data"
FRONTEND_ROOT="/var/www/ccsvi"

if [[ -f "$REPO_ROOT/.env" ]]; then
    set -a
    source "$REPO_ROOT/.env"
    set +a
fi

HCDP_API_TOKEN=${HCDP_API_TOKEN:?Need HCDP_API_TOKEN set in $REPO_ROOT/.env}
HCDP_EMAIL=${HCDP_EMAIL:?Need HCDP_EMAIL set in $REPO_ROOT/.env}

sudo tee /etc/nginx/sites-available/ccsvi > /dev/null <<EOF
server {
    listen 80;
    server_name 128.171.215.85;

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    location /data/ {
        alias ${DATA_ROOT}/;

        types {
            application/geo+json geojson;
        }

        gzip on;
        gzip_vary on;
        gzip_types application/json application/geo+json text/csv;

        add_header Cache-Control "public, max-age=86400";
    }

    location /ccsvi-dashboard/api/ {
        proxy_pass https://api.hcdp.ikewai.org/;
        proxy_set_header Host api.hcdp.ikewai.org;
        proxy_set_header Authorization "Bearer ${HCDP_API_TOKEN}";
        proxy_set_header User-Agent "${HCDP_EMAIL}";
        proxy_ssl_server_name on;
    }

    location /ccsvi-dashboard/ {
        alias ${FRONTEND_ROOT}/;
        try_files \$uri \$uri/ /ccsvi-dashboard/index.html;
    }
}
EOF

sudo nginx -t
sudo systemctl reload nginx

echo ""
echo "nginx config installed and reloaded. Status:"
systemctl status nginx --no-pager | head -5