#!/bin/sh
# Render entrypoint: initializes Supabase/Postgres, then serves the Worker.
set -e
cd "$(dirname "$0")/.."

STATE=.wrangler/state
WRANGLER="node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js"
mkdir -p "$STATE"

: "${DATABASE_URL:?Defina DATABASE_URL com a conexão Session Pooler do projeto spring-ia no Supabase}"
node scripts/worker-database-env.mjs
node scripts/postgres-migrate.mjs

# Creates the /admin login on first start; a password changed later in the panel is kept.
if [ -n "$ADMIN_USERNAME" ] && [ -n "$ADMIN_PASSWORD" ]; then
  node scripts/admin-user.mjs --if-missing
fi

exec $WRANGLER dev --config dist/server/wrangler.json --local --persist-to "$STATE" \
  --ip 0.0.0.0 --port "${PORT:-10000}" --inspector-port 0 --show-interactive-dev-session=false
