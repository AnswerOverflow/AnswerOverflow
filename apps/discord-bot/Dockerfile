# Start a new stage for a smaller final image
FROM oven/bun:1.1.29 as builder

# Set working directory
WORKDIR /usr/src/app

# Copy the package.json and bun.lockb from the build stage
COPY package.json bun.lockb* ./
COPY patches ./patches

# Install dependencies including devDependencies (dotenv-cli)
RUN bun install --production=false

# Copy built artifacts from builder stage
COPY --from=builder /usr/src/app .

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
