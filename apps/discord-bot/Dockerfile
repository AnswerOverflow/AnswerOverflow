FROM oven/bun:1.3.3 AS builder

# Set working directory
WORKDIR /usr/src/app

# Copy everything (dockerignore will exclude unnecessary files)
COPY . .

ENV NODE_ENV=production

# Install dependencies (ignore scripts to skip husky prepare hook in Docker)
RUN bun install --frozen-lockfile --ignore-scripts

# Start a new stage for a smaller final image
FROM oven/bun:1.3.3-slim

# Set working directory
WORKDIR /usr/src/app

# Copy installed dependencies and source from builder
COPY --from=builder /usr/src/app ./

# Set environment variable
ENV NODE_ENV=production

# Use non-root user for better security
USER bun

# Set the working directory for the Discord bot
WORKDIR /usr/src/app/apps/discord-bot

# Run the Discord bot
CMD ["bun", "start"]
