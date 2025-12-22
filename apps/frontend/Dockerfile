FROM oven/bun:1.2.14 AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lockb* ./
RUN if [ -f bun.lockb ]; then bun install --frozen-lockfile; else bun install; fi

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
EXPOSE 3000
CMD ["bun", "run", "start"]
