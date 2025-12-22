#!/bin/bash
set -e

export NEXT_PUBLIC_ANALYTICS_PATH=$(uuidgen | cut -c1-8)

PREVIOUS_SHA="$VERCEL_GIT_PREVIOUS_SHA"
CURRENT_SHA="$VERCEL_GIT_COMMIT_SHA"

SHOULD_DEPLOY_CONVEX=true

if [ "$VERCEL_ENV" = "preview" ]; then
    SHOULD_DEPLOY_CONVEX=false
    echo "Preview build detected, skipping Convex deploy"
elif [ -n "$PREVIOUS_SHA" ] && [ -n "$CURRENT_SHA" ]; then
    CHANGED_FILES=$(git diff --name-only "$PREVIOUS_SHA" "$CURRENT_SHA")
    if ! echo "$CHANGED_FILES" | grep -q "^packages/database/convex/"; then
        SHOULD_DEPLOY_CONVEX=false
    fi
fi

if [ "$SHOULD_DEPLOY_CONVEX" = true ]; then
    echo "Convex files changed, deploying..."
    echo "$CHANGED_FILES" | grep "^packages/database/convex/" | head -3
    (cd ../../packages/database && npx convex deploy --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL)
else
    echo "No Convex changes detected, skipping deploy"
fi

bun run typecheck &
P1=$!

bun with-env next build &
P2=$!

wait $P1 || exit 1
wait $P2 || exit 1
