# Runs the built Cloudflare Worker (vinext + D1) with Wrangler's local runtime on Render.
FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g pnpm@11.19.0

WORKDIR /app
ENV CI=true \
  WRANGLER_SEND_METRICS=false \
  CLOUDFLARE_CF_FETCH_ENABLED=false

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

EXPOSE 10000
CMD ["sh", "scripts/render-start.sh"]
