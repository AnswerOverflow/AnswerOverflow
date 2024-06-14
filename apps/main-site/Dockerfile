# Stage 1: Builder
FROM node:lts-alpine AS builder

# Install necessary packages
RUN apk add --no-cache libc6-compat python3 make g++ && \
    apk update

# Set working directory and environment variables
WORKDIR /app
ENV PNPM_HOME="/root/.local/share/pnpm"
ENV PATH="${PATH}:${PNPM_HOME}"

# Install global dependencies
RUN npm install --global pnpm@9.1.2 turbo@1.13.3

# Copy all files from the root directory
COPY . .

# Run turbo prune
RUN turbo prune --scope=@answeroverflow/main-site --docker

# Stage 2: Installer
FROM node:lts-alpine AS installer

# Install necessary packages
RUN apk add --no-cache libc6-compat openssl python3 make g++ && \
    apk update

# Set environment variables
ENV PNPM_HOME="/root/.local/share/pnpm"
ENV PATH="${PATH}:${PNPM_HOME}"

# Install pnpm globally
RUN npm install --global pnpm@9.1.2

# Set working directory
WORKDIR /app

# Copy lockfile and package.json's of isolated subworkspace from builder stage
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY turbo.json turbo.json

# Install dependencies
RUN pnpm install

# Copy the rest of the files from the builder stage
COPY --from=builder /app/out/full/ .

# Copy remaining files and directories from the builder stage to retain the structure
COPY --from=builder /app/ /app/

# Set build arguments and environment variables
ARG TURBO_TEAM
ENV TURBO_TEAM=$TURBO_TEAM

ARG TURBO_TOKEN
ENV TURBO_TOKEN=$TURBO_TOKEN
# Validate vars
ARG ENVIRONMENT
ENV ENVIRONMENT=$ENVIRONMENT
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL
ARG ELASTICSEARCH_CLOUD_ID
ENV ELASTICSEARCH_CLOUD_ID=$ELASTICSEARCH_CLOUD_ID
ARG ELASTICSEARCH_PASSWORD
ENV ELASTICSEARCH_PASSWORD=$ELASTICSEARCH_PASSWORD
ARG ELASTICSEARCH_USERNAME
ENV ELASTICSEARCH_USERNAME=$ELASTICSEARCH_USERNAME
ARG ELASTICSEARCH_MESSAGE_INDEX
ENV ELASTICSEARCH_MESSAGE_INDEX=$ELASTICSEARCH_MESSAGE_INDEX
ARG REDIS_URL
ENV REDIS_URL=$REDIS_URL
ARG DISCORD_CLIENT_ID
ENV DISCORD_CLIENT_ID=$DISCORD_CLIENT_ID
ARG DISCORD_CLIENT_SECRET
ENV DISCORD_CLIENT_SECRET=$DISCORD_CLIENT_SECRET
ARG POSTHOG_PROJECT_ID
ENV POSTHOG_PROJECT_ID=$POSTHOG_PROJECT_ID
ARG POSTHOG_PERSONAL_API_KEY
ENV POSTHOG_PERSONAL_API_KEY=$POSTHOG_PERSONAL_API_KEY
ARG STRIPE_PRO_PLAN_PRICE_ID
ENV STRIPE_PRO_PLAN_PRICE_ID=$STRIPE_PRO_PLAN_PRICE_ID
ARG STRIPE_ENTERPRISE_PLAN_PRICE_ID
ENV STRIPE_ENTERPRISE_PLAN_PRICE_ID=$STRIPE_ENTERPRISE_PLAN_PRICE_ID
ARG STRIPE_SECRET_KEY
ENV STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY
ARG STRIPE_WEBHOOK_SECRET
ENV STRIPE_WEBHOOK_SECRET=$STRIPE_WEBHOOK_SECRET
ARG STRIPE_CHECKOUT_URL
ENV STRIPE_CHECKOUT_URL=$STRIPE_CHECKOUT_URL
ARG PROJECT_ID_VERCEL
ENV PROJECT_ID_VERCEL=$PROJECT_ID_VERCEL
ARG AUTH_BEARER_TOKEN_VERCEL
ENV AUTH_BEARER_TOKEN_VERCEL=$AUTH_BEARER_TOKEN_VERCEL
ARG TEAM_ID_VERCEL
ENV TEAM_ID_VERCEL=$TEAM_ID_VERCEL
ARG BUCKET_NAME
ENV BUCKET_NAME=$BUCKET_NAME
ARG IAM_USER_KEY
ENV IAM_USER_KEY=$IAM_USER_KEY
ARG IAM_USER_SECRET
ENV IAM_USER_SECRET=$IAM_USER_SECRET
ARG NEXT_PUBLIC_POSTHOG_TOKEN
ENV NEXT_PUBLIC_POSTHOG_TOKEN=$NEXT_PUBLIC_POSTHOG_TOKEN
ARG NEXT_PUBLIC_SENTRY_DSN
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_DEPLOYMENT_ENV
ENV NEXT_PUBLIC_DEPLOYMENT_ENV=$NEXT_PUBLIC_DEPLOYMENT_ENV
ARG NEXT_PUBLIC_NODE_ENV
ENV NEXT_PUBLIC_NODE_ENV=$NEXT_PUBLIC_NODE_ENV
ARG NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA
ENV NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA=$NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA
ARG NEXT_PUBLIC_VERCEL_URL
ENV NEXT_PUBLIC_VERCEL_URL=$NEXT_PUBLIC_VERCEL_URL
ARG NEXT_PUBLIC_GA_MEASUREMENT_ID
ENV NEXT_PUBLIC_GA_MEASUREMENT_ID=$NEXT_PUBLIC_GA_MEASUREMENT_ID
###
# optional arg of SKIP_ENV_CHECK, default to false
ARG SKIP_ENV_CHECK
ENV SKIP_ENV_CHECK=${SKIP_ENV_CHECK:-false}


# Build the application
RUN (cd apps/main-site && pnpm build)

# Stage 3: Runner
FROM node:lts-alpine AS runner

# Set environment variables
ENV PNPM_HOME="/root/.local/share/pnpm"
ENV PATH="${PATH}:${PNPM_HOME}"
ENV NODE_ENV production

# Install pnpm globally
RUN npm install --global pnpm@9.1.2

# Set working directory
WORKDIR /app

# Create necessary system group and user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy the entire directory structure from installer stage to retain files
COPY --from=installer /app/ /app/

# Set correct permissions for prerender cache
RUN mkdir .next && \
    chown nextjs:nodejs .next

# Uncomment the following lines to leverage output traces and reduce image size
# COPY --from=installer --chown=nextjs:nodejs /app/.next/standalone ./
# COPY --from=installer --chown=nextjs:nodejs /app/.next/static ./.next/static

# Use non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Set environment variable for port
ENV PORT 3000

# Start the server
CMD HOSTNAME="0.0.0.0" (cd apps/main-site && pnpm start)
