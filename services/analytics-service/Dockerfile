FROM oven/bun:1.2 AS base
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install

FROM base AS dev
COPY . .
EXPOSE 3000
CMD ["bun", "--watch", "services/analytics-service/src/index.ts"]

FROM base AS build
COPY . .
RUN bun build --compile --minify --target bun --outfile server ./services/analytics-service/src/index.ts

FROM gcr.io/distroless/base AS prod
COPY --from=build /app/server ./
EXPOSE 3000
CMD ["./server"] 