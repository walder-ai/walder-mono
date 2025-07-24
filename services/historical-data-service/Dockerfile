FROM oven/bun:1.2 AS base
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install

FROM base AS dev
COPY shared/ ./shared/
COPY tsconfig*.json ./
COPY services/historical-data-service/ ./services/historical-data-service/

EXPOSE 3001
CMD ["bun", "--watch", "services/historical-data-service/src/index.ts"]

FROM base AS build
COPY . .
RUN bun build --compile --minify --target bun --outfile server ./services/historical-data-service/src/index.ts

FROM gcr.io/distroless/base AS prod
COPY --from=build /app/server ./
EXPOSE 3001
ENV NODE_ENV=production
CMD ["./server"] 