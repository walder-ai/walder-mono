FROM oven/bun:1.2 AS base
WORKDIR /app

# Copy dependency files first for better caching
COPY package.json bun.lock ./
RUN bun install

FROM base AS dev
# Copy only necessary files for development
COPY tsconfig*.json ./
COPY services/market-fetcher/ ./services/market-fetcher/

EXPOSE 3000
CMD ["bun", "--watch", "services/market-fetcher/src/index.ts"]

FROM base AS build
COPY . .
# Use Elysia production optimizations
RUN bun build --compile --minify --target bun --outfile server ./services/market-fetcher/src/index.ts

FROM gcr.io/distroless/base AS prod
COPY --from=build /app/server ./
EXPOSE 3000
ENV NODE_ENV=production
CMD ["./server"]