# Unibody web (storefront + /admin) — build from the repo root:
#   docker build --build-arg NEXT_PUBLIC_API_URL=https://api.unibody.in --build-arg NEXT_PUBLIC_SITE_URL=https://unibody.in -t unibody-web .
FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /app
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL NEXT_TELEMETRY_DISABLED=1
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY shared/package.json shared/
COPY web/package.json web/
RUN pnpm install --frozen-lockfile
COPY shared shared
COPY web web
RUN pnpm --filter @unibody/shared build && pnpm --filter @unibody/web build

FROM node:22-alpine
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
COPY --from=build --chown=node:node /app/web/.next/standalone ./
COPY --from=build --chown=node:node /app/web/.next/static web/.next/static
USER node
EXPOSE 3000
# API_URL (server-side URL of the API) can be set at runtime; defaults to NEXT_PUBLIC_API_URL.
CMD ["node", "web/server.js"]
