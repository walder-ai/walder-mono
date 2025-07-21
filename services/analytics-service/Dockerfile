FROM oven/bun:1.2 AS base
WORKDIR /app

# Copy dependency files first for better caching
COPY package.json bun.lock ./
RUN bun install

FROM base AS dev
# Copy only necessary files for development
COPY shared/ ./shared/
COPY tsconfig*.json ./
COPY services/analytics-service/ ./services/analytics-service/

EXPOSE 3000
CMD ["bun", "--watch", "services/analytics-service/src/index.ts"]

FROM base AS build
COPY . .
# Use Elysia production optimizations
RUN bun build --compile --minify --target bun --outfile server ./services/analytics-service/src/index.ts

FROM gcr.io/distroless/base AS prod
COPY --from=build /app/server ./
EXPOSE 3000
ENV NODE_ENV=production
CMD ["./server"] 