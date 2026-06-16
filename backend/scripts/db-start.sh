#!/usr/bin/env bash
# Start the Postgres container. Safe to run repeatedly.
set -euo pipefail

CONTAINER=ccsvi-pg
DB_NAME=ccsvi
DB_USER=ccsvi
DB_PASS=${POSTGRES_PASSWORD:?Need POSTGRES_PASSWORD set}

if docker ps -q -f "name=^${CONTAINER}$" | grep -q .; then
    echo "Postgres already running."
elif docker ps -aq -f "name=^${CONTAINER}$" | grep -q .; then
    echo "Container stopped — restarting."
    docker start "$CONTAINER"
else
    echo "Creating Postgres container..."
    docker run -d \
        --name "$CONTAINER" \
        --restart unless-stopped \
        -e POSTGRES_DB="$DB_NAME" \
        -e POSTGRES_USER="$DB_USER" \
        -e POSTGRES_PASSWORD="$DB_PASS" \
        -p 127.0.0.1:5432:5432 \
        postgis/postgis:16-3.4
fi

echo "Waiting for Postgres to be ready..."
until docker exec "$CONTAINER" pg_isready -U "$DB_USER" -q 2>/dev/null; do
    sleep 1
done
echo "Ready."
