FROM node:20-bookworm-slim AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/storefront/package.json apps/storefront/package.json

RUN npm ci

FROM dependencies AS builder

COPY apps/backend apps/backend

RUN npm run --workspace @dtc/backend build

FROM node:20-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV PORT=9000

WORKDIR /app

COPY --from=builder /app/apps/backend/.medusa/server/package.json ./package.json
RUN npm install --omit=dev --ignore-scripts --legacy-peer-deps

COPY --from=builder /app/apps/backend/.medusa/server ./
COPY --from=builder /app/apps/backend/static ./static

EXPOSE 9000

CMD ["npm", "run", "start"]
