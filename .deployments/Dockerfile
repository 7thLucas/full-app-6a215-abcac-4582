#### Stage 1: Builder – install all deps & build Remix
FROM oven/bun:1-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

COPY . .

ENV NODE_ENV=production

RUN bun run build


#### Stage 2: Runtime – minimal image for running the server
FROM oven/bun:1-slim AS runner

WORKDIR /app

RUN useradd -m appuser

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# Copy built assets from builder
COPY --from=builder /app/build ./build

# Copy source code needed by server
COPY . .

ENV NODE_ENV=production
EXPOSE 3000

RUN chown -R appuser:appuser /app
USER appuser

# All runtime config (MONGODB_URI, JWT_*, OPENAI_API_KEY, etc.)
# injected via `docker run -e` or docker-compose `environment` / `env_file`.
CMD ["bun", "run", "start:prod"]
