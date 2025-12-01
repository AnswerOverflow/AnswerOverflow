# OpenAI Codex OAuth Plugin for OpenCode

Use your ChatGPT Plus/Pro subscription to access GPT 5.1 models in OpenCode.

**Status**: ✅ Fully configured and working  
**Plugin**: `opencode-openai-codex-auth@4.0.2`  
**Repository**: https://github.com/numman-ali/opencode-openai-codex-auth

## Requirements

- ChatGPT Plus or Pro subscription
- OpenCode installed
- Personal use only (not for commercial services)

## Installation

### 1. Add Plugin to Config

Add to `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "opencode-openai-codex-auth@4.0.2"
  ],
  "provider": {
    "openai": {
      "options": {
        "reasoningEffort": "medium",
        "reasoningSummary": "auto",
        "textVerbosity": "medium",
        "include": ["reasoning.encrypted_content"],
        "store": false
      },
      "models": {
        "gpt-5.1-codex-low": {
          "name": "GPT 5.1 Codex Low (OAuth)",
          "limit": { "context": 272000, "output": 128000 },
          "options": {
            "reasoningEffort": "low",
            "reasoningSummary": "auto",
            "textVerbosity": "medium",
            "include": ["reasoning.encrypted_content"],
            "store": false
          }
        },
        "gpt-5.1-codex-medium": {
          "name": "GPT 5.1 Codex Medium (OAuth)",
          "limit": { "context": 272000, "output": 128000 },
          "options": {
            "reasoningEffort": "medium",
            "reasoningSummary": "auto",
            "textVerbosity": "medium",
            "include": ["reasoning.encrypted_content"],
            "store": false
          }
        },
        "gpt-5.1-codex-high": {
          "name": "GPT 5.1 Codex High (OAuth)",
          "limit": { "context": 272000, "output": 128000 },
          "options": {
            "reasoningEffort": "high",
            "reasoningSummary": "detailed",
            "textVerbosity": "medium",
            "include": ["reasoning.encrypted_content"],
            "store": false
          }
        },
        "gpt-5.1-codex-max-high": {
          "name": "GPT 5.1 Codex Max High (OAuth)",
          "limit": { "context": 272000, "output": 128000 },
          "options": {
            "reasoningEffort": "high",
            "reasoningSummary": "detailed",
            "textVerbosity": "medium",
            "include": ["reasoning.encrypted_content"],
            "store": false
          }
        }
      }
    }
  }
}
```

**Full config with all 13 models**: See [config/full-opencode.json](https://github.com/numman-ali/opencode-openai-codex-auth/blob/main/config/full-opencode.json)

### 2. Authenticate

OpenCode will auto-install the plugin when you add it to the config. To authenticate:

```bash
opencode auth login
```

Select: **OpenAI** → **ChatGPT Plus/Pro (Codex Subscription)**

⚠️ **Note**: If you have the official Codex CLI running, stop it first (both use port 1455).

### 3. Verify

```bash
opencode auth list
```

You should see "OpenAI (oauth)" in the credentials list.

## Usage

### Quick Commands

```bash
# Use in TUI - pick model from selector
opencode

# Use from CLI - specify model (MUST include openai/ prefix)
opencode run "your prompt" --model=openai/gpt-5.1-codex-medium

# Fast generation
opencode run "your prompt" --model=openai/gpt-5.1-codex-low

# Deep reasoning
opencode run "your prompt" --model=openai/gpt-5.1-codex-max-high
```

### Available Models

All models have 272k context / 128k output tokens.

**GPT 5.1 Codex (Code-Focused)**
- `gpt-5.1-codex-low` - Fast code generation
- `gpt-5.1-codex-medium` - Balanced (recommended)
- `gpt-5.1-codex-high` - Complex code & tools

**GPT 5.1 Codex Max (Large Context)**
- `gpt-5.1-codex-max-low` - Fast exploratory work
- `gpt-5.1-codex-max-medium` - Balanced large builds
- `gpt-5.1-codex-max-high` - Large refactors
- `gpt-5.1-codex-max-xhigh` - Deep agent loops, research

**GPT 5.1 Codex Mini**
- `gpt-5.1-codex-mini-medium` - Codex mini tier
- `gpt-5.1-codex-mini-high` - Mini with max reasoning

**GPT 5.1 General Purpose**
- `gpt-5.1-low` - Fast responses
- `gpt-5.1-medium` - Balanced tasks
- `gpt-5.1-high` - Deep reasoning

### Important

Always use `openai/` prefix when specifying models:

```bash
# ✅ Correct
--model=openai/gpt-5.1-codex-medium

# ❌ Wrong (will fail)
--model=gpt-5.1-codex-medium
```

## Troubleshooting

**"OpenAI" not in auth list**
- Plugin hasn't installed yet - it auto-installs on first use
- Try running a query or restart OpenCode

**401 Unauthorized**
- Run `opencode auth login` again

**Model not found**
- Ensure you're using `openai/` prefix
- Check model ID matches one from the config

**Port 1455 in use**
- Stop official Codex CLI if running

## Upgrading

Plugin version is pinned to `4.0.2`. OpenCode won't auto-update plugins.

To upgrade:
1. Update version in `opencode.json`: `"opencode-openai-codex-auth@X.X.X"`
2. Restart OpenCode

Check releases: https://github.com/numman-ali/opencode-openai-codex-auth/releases

## Rate Limits

- Determined by your ChatGPT subscription tier (Plus/Pro)
- Enforced server-side through OAuth tokens
- Use for individual coding tasks, not bulk processing
- For high-volume needs, use OpenAI Platform API

## Legal

- Personal use only
- Not affiliated with OpenAI
- Must comply with OpenAI's Terms of Use and Usage Policies
- Not for commercial resale or multi-user services

## Resources

- [Plugin Repository](https://github.com/numman-ali/opencode-openai-codex-auth)
- [Full Documentation](https://numman-ali.github.io/opencode-openai-codex-auth/)
- [OpenCode Docs](https://opencode.ai)
