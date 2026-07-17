FROM node:22-alpine AS runner
WORKDIR /workspace

RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
COPY apps/game-server/package.json apps/game-server/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/xiangqi-engine/package.json packages/xiangqi-engine/package.json
RUN pnpm install --frozen-lockfile

COPY apps/game-server apps/game-server
COPY packages/shared packages/shared
COPY packages/xiangqi-engine packages/xiangqi-engine

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3001
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/healthz >/dev/null || exit 1
CMD ["pnpm", "--filter", "@xiangqi-arena/game-server", "start"]
