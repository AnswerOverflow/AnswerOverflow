#!/bin/bash
set -e

echo "Refreshing OpenCode auth for GitHub Actions..."
echo ""

command -v opencode &> /dev/null || { echo "Error: opencode not installed. Run: curl -fsSL https://opencode.ai/install | bash"; exit 1; }
command -v gh &> /dev/null || { echo "Error: gh not installed. Run: brew install gh"; exit 1; }
gh auth status &> /dev/null || { echo "Error: Not logged into GitHub CLI. Run: gh auth login"; exit 1; }

if [[ "$OSTYPE" == "darwin"* ]]; then
    AUTH_FILE="$HOME/Library/Application Support/opencode/auth.json"
else
    AUTH_FILE="$HOME/.local/share/opencode/auth.json"
fi

if opencode auth list 2>&1 | grep -q "Anthropic"; then
    echo "Already authenticated with Anthropic, skipping login..."
else
    echo "Step 1: Login to OpenCode with Claude Max"
    echo "This will open your browser to authenticate..."
    echo ""
    opencode auth login
fi

[[ -f "$AUTH_FILE" ]] || { echo "Error: Auth file not found at $AUTH_FILE"; exit 1; }

echo ""
echo "Pushing auth to GitHub secrets..."
gh secret set OPENCODE_AUTH --body "$(cat "$AUTH_FILE")"

echo ""
echo "Done! OPENCODE_AUTH secret has been updated."
