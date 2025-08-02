FROM oven/bun:1 AS build
WORKDIR /app

COPY services/data-loader/package.json services/data-loader/bun.lock* ./
RUN bun install --frozen-lockfile

FROM build AS dev
COPY services/data-loader/tsconfig.json ./
COPY services/data-loader/src/ ./src/
EXPOSE 3000
CMD ["bun", "--watch", "src/index.ts"]

FROM build AS production
COPY services/data-loader/src/ ./src/
ENV NODE_ENV=production
RUN bun build --compile --minify --target bun --outfile server ./src/index.ts

FROM gcr.io/distroless/base AS prod
WORKDIR /app
COPY --from=production /app/server ./
EXPOSE 3000
ENV NODE_ENV=production
USER nonroot:nonroot
CMD ["./server"]