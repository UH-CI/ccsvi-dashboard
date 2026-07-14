#!/usr/bin/env bash
# Install/update the ccsvi nginx site config.
# Run on VM after nginx is installed. safe to re-run.
#
# serve /data/ directly from disk instead of proxying through FastAPI's StaticFiles.
# Also adds gzip for JSON/GeoJSON and a Cache-Control header
# gzip is intentionally scoped to json/geo+json/csv only: nginx cannot gzip
# a response and honor Range requests on it. PMTiles and COG tiffs rely on
# Range requests for partial reads, so they must never match gzip_types.
#
# Also installs a proxy_cache in front of /api/tiles/cog/: tiles render once
# server-side and are served from cache on repeat requests. In 4-map mode,
# the first map's tile request warms the cache for the other 3. 1-day TTL
# (not indefinite) since tiles aren't yet covered by the versioning
# convention's immutable-cache guarantee.
set -euo pipefail

REPO_ROOT="/home/exouser/ccsvi-dashboard"
DATA_ROOT="/home/exouser/ccsvi-data"
FRONTEND_ROOT="/var/www/ccsvi"
TILE_CACHE_DIR="/var/cache/nginx/tiles"

if [[ -f "$REPO_ROOT/.env" ]]; then
    set -a
    source "$REPO_ROOT/.env"
    set +a
fi

HCDP_API_TOKEN=${HCDP_API_TOKEN:?Need HCDP_API_TOKEN set in $REPO_ROOT/.env}
HCDP_EMAIL=${HCDP_EMAIL:?Need HCDP_EMAIL set in $REPO_ROOT/.env}

sudo mkdir -p "$TILE_CACHE_DIR"
sudo chown www-data:www-data "$TILE_CACHE_DIR"

# proxy_cache_path is only valid in the http{} context; conf.d/*.conf is
# included there (see nginx.conf), sites-available/* is not.
sudo tee /etc/nginx/conf.d/tile-cache.conf > /dev/null <<EOF
proxy_cache_path ${TILE_CACHE_DIR} levels=1:2 keys_zone=tile_cache:10m max_size=1g inactive=7d use_temp_path=off;
EOF

sudo tee /etc/nginx/sites-available/ccsvi > /dev/null <<EOF
server {
    listen 80;
    server_name 128.171.215.85;

    location /api/tiles/cog/ {
        proxy_pass http://127.0.0.1:8000/api/tiles/cog/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;

        proxy_cache tile_cache;
        proxy_cache_key \$scheme\$host\$request_uri;
        proxy_cache_valid 200 1d;
        proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
        add_header X-Cache-Status \$upstream_cache_status;
    }

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