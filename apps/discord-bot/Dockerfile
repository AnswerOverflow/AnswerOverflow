FROM oven/bun:1.1.40 AS builder


# Set working directory
WORKDIR /usr/src/app

# Copy package.json and bun.lockb (if it exists)
COPY . .
# Install dependencies
# print the bun version
RUN bun --version
RUN bun install --frozen-lockfile

# Start a new stage for a smaller final image
FROM oven/bun:1.1.40-slim


# Set working directory
WORKDIR /usr/src/app

# Copy built artifacts from builder stage
COPY --from=builder /usr/src/app .

# Make starting work
RUN bun add -g dotenv-cli
RUN bun install --frozen-lockfile

# Set environment variable
ENV NODE_ENV=production

# Use non-root user for better security
USER bun

# Expose the port the app runs on
EXPOSE 3000

# Set the working directory for the Discord bot
WORKDIR /usr/src/app/apps/discord-bot

# Specify the command to run the Discord bot

CMD ["bun", "start"]