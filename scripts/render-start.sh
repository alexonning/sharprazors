#!/bin/sh
# Render entrypoint: applies pending D1 migrations to the local state, then serves the Worker.
set -e
cd "$(dirname "$0")/.."

STATE=.wrangler/state
WRANGLER="node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js"
mkdir -p "$STATE"

for file in drizzle/*.sql; do
  marker="$STATE/.migrated-$(basename "$file")"
  if [ ! -f "$marker" ]; then
    echo "Applying migration $file"
    $WRANGLER d1 execute DB --local --config dist/server/wrangler.json --persist-to "$STATE" --file "$file"
    touch "$marker"
  fi
done

exec $WRANGLER dev --config dist/server/wrangler.json --local --persist-to "$STATE" \
  --ip 0.0.0.0 --port "${PORT:-10000}" --inspector-port 0 --show-interactive-dev-session=false
