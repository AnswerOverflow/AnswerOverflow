# This dockerfile kinda sucks, works for now make a PR if you want to fix it
FROM oven/bun:1.1.29 AS base
WORKDIR /usr/src/app
COPY . .
# install dependencies
RUN bun install
ENV NODE_ENV=production
USER bun
EXPOSE 3000/tcp
WORKDIR /usr/src/app/apps/discord-bot
CMD ["tail", "-f", "/dev/null"]