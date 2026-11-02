FROM node:22-alpine AS workspace
WORKDIR /workspace
RUN npm install --global pnpm@12.16.1
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/referee-web/package.json apps/referee-web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/domain/package.json packages/domain/package.json

FROM workspace AS dependencies
RUN pnpm install --frozen-lockfile
COPY apps ./apps
COPY packages ./packages
COPY vitest.config.ts vitest.database.config.ts ./

FROM dependencies AS tests
CMD ["pnpm", "test"]

FROM dependencies AS api-build
RUN pnpm --filter @refs-tools/api... run build

FROM workspace AS production-dependencies
RUN pnpm --filter @refs-tools/api... install --prod --frozen-lockfile

FROM node:22-alpine AS api
WORKDIR /workspace
ENV NODE_ENV=production
COPY --from=production-dependencies /workspace ./
COPY --from=api-build /workspace/apps/api/dist ./apps/api/dist
COPY --from=api-build /workspace/packages/contracts/dist ./packages/contracts/dist
COPY --from=api-build /workspace/packages/domain/dist ./packages/domain/dist
COPY apps/api/db/migrations ./apps/api/db/migrations
USER node
EXPOSE 3000
CMD ["node", "apps/api/dist/server.js"]

FROM dependencies AS web-build
RUN pnpm --filter @refs-tools/contracts run build && pnpm --filter @refs-tools/referee-web run build

FROM nginx:alpine AS web
COPY --from=web-build /workspace/apps/referee-web/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 443

FROM alpine:3 AS certificates
RUN apk add --no-cache openssl
COPY docker/init-certificates.sh /init-certificates.sh
CMD ["sh", "/init-certificates.sh"]
