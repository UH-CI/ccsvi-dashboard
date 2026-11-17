#!/usr/bin/env bash
# Install/update the ccsvi nginx site config.
# Run on VM after nginx is installed. safe to re-run.
#
# serve /data/ directly from disk instead of proxying through FastAPI's StaticFiles.
# Also adds gzip for JSON/GeoJSON and a Cache-Control header, and gzip for the website's own files
# gzip is intentionally scoped to text types only: nginx cannot gzip
# a response and honor Range requests on it. PMTiles and COG tiffs rely on
# Range requests for partial reads, so they must never match gzip_types.
#
# Also installs a proxy_cache in front of /api/tiles/cog/ and /api/tiles/hcdp/: tiles render once
# server-side and are served from cache on repeat requests. In 4-map mode,
# the first map's tile request warms the cache for the other 3. 1-day TTL
# (not indefinite) since tiles aren't yet covered by the versioning
# convention's immutable-cache guarantee.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/env.sh"

CARTO_API_KEY=${CARTO_API_KEY:-${VITE_CARTO_API_KEY:-}}
CARTO_API_KEY=${CARTO_API_KEY:?Need CARTO_API_KEY set in $REPO_ROOT/.env}

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
    # Answers on whatever address this VM is reached by
    server_name _;

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

    location /api/tiles/hcdp/ {
        proxy_pass http://127.0.0.1:8000/api/tiles/hcdp/;
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

    # Hostname held in a variable so nginx looks it up per-request, not at
    # startup. A failed startup lookup stops nginx from starting.
    location /api/tiles/carto/ {
        resolver 127.0.0.53 valid=300s ipv6=off;
        set \$carto_host "basemaps.cartocdn.com";
        rewrite ^/api/tiles/carto/(.*)\$ /\$1 break;
        proxy_pass https://\$carto_host\$uri?key=${CARTO_API_KEY};
        proxy_set_header Host basemaps.cartocdn.com;
        proxy_ssl_server_name on;
    }

    # Nothing else in the data folder (backups, raw files) is reachable from outside
    location /data/ {
        return 404;
    }

    # Only the two folders the website reads: the hazard tiles and the point files
    location ~ ^/data/(${DATA_VERSION}/(?:hazards|point_data)/[^/]+)\$ {
        alias ${DATA_ROOT}/\$1;

        types {
            application/geo+json geojson;
        }

        gzip on;
        gzip_vary on;
        gzip_types application/json application/geo+json text/csv;

        add_header Cache-Control "public, max-age=86400";
    }

    location /ccsvi-dashboard/ {
        alias ${WEB_ROOT}/;
        try_files \$uri \$uri/ /ccsvi-dashboard/index.html;

        gzip on;
        gzip_vary on;
        gzip_types application/javascript text/javascript text/css application/json image/svg+xml application/geo+json;

        # nginx doesn't know the .geojson ending, so the area outlines would go out uncompressed
        location ~ \.geojson\$ {
            types { }
            default_type application/geo+json;
        }
    }

    # The page is checked on every load so a new deploy shows at once. The code files it loads
    # get a new name on every build, so those can be kept
    location = /ccsvi-dashboard/index.html {
        alias ${WEB_ROOT}/index.html;
        add_header Cache-Control "no-cache";
    }
}
EOF

sudo nginx -t
sudo systemctl reload nginx

echo ""
echo "nginx config installed and reloaded. Status:"
systemctl status nginx --no-pager | head -5