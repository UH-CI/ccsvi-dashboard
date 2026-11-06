#!/usr/bin/env bash
# Start the Postgres container. Safe to run repeatedly.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/env.sh"

DB_PASS=${POSTGRES_PASSWORD:?Need POSTGRES_PASSWORD set in $REPO_ROOT/.env}

if docker ps -q -f "name=^${PG_CONTAINER}$" | grep -q .; then
    echo "Postgres already running."
elif docker ps -aq -f "name=^${PG_CONTAINER}$" | grep -q .; then
    echo "Container stopped — restarting."
    docker start "$PG_CONTAINER"
else
    echo "Creating Postgres container..."
    docker run -d \
        --name "$PG_CONTAINER" \
        --restart unless-stopped \
        -e POSTGRES_DB="$DB_NAME" \
        -e POSTGRES_USER="$DB_USER" \
        -e POSTGRES_PASSWORD="$DB_PASS" \
        -p 127.0.0.1:5432:5432 \
        postgis/postgis:16-3.4
fi

echo "Waiting for Postgres to be ready..."
until docker exec "$PG_CONTAINER" pg_isready -U "$DB_USER" -q 2>/dev/null; do
    sleep 1
done
echo "Ready."
