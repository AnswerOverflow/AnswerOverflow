FROM oven/bun:1

WORKDIR /app

COPY package.json bun.lock ./
COPY patches ./patches
COPY apps/bot-e2e/package.json ./apps/bot-e2e/
COPY packages/database/package.json ./packages/database/
COPY packages/typescript-config/package.json ./packages/typescript-config/

RUN bun install --filter=@apps/bot-e2e

COPY apps/bot-e2e ./apps/bot-e2e
COPY packages/database ./packages/database
COPY packages/typescript-config ./packages/typescript-config

WORKDIR /app/apps/bot-e2e

CMD ["bun", "run", "start"]
