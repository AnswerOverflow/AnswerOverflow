# E2E Test Server Setup

## Server: AO Integration (995229413912354837)

## Test User
- **Account**: devalt3384
- **Email**: accounts@answeroverflow.com
- **Requirement**: Must be a member of the server with Administrator permissions (for setup) or at minimum: send messages, create threads, and use application commands.

## Quick Setup (Automated)

The setup is fully automated. Run:

```bash
cd apps/bot-e2e

# Full setup: creates Discord channels + configures Convex settings
DISCORD_TOKEN="$(cat .discord-token)" bun run setup
```

This will:
1. Delete all existing channels in the test server
2. Create the test channels with proper names
3. Configure Answer Overflow settings for each channel via Convex API

### Individual Steps

```bash
# Just create Discord channels (requires admin permissions)
DISCORD_TOKEN="$(cat .discord-token)" bun run setup:discord

# Just configure Convex channel settings (no Discord token needed)
bun run setup:convex
```

## Running Tests

```bash
cd apps/bot-e2e

# Run all tests
DISCORD_TOKEN="$(cat .discord-token)" bun test

# Run specific test
DISCORD_TOKEN="$(cat .discord-token)" bun test tests/mark-solution.test.ts

# Clean up old test threads
DISCORD_TOKEN="$(cat .discord-token)" bun run teardown
```

---

## Test Channels Reference

### Text Channels

| Channel | Purpose | Settings |
|---------|---------|----------|
| #mark-solution-enabled | Primary mark solution testing | Mark Solution ✅, Instructions ✅ |
| #mark-solution-disabled | Negative test cases | (none) |
| #auto-thread-enabled | Auto-thread creation | Auto Thread ✅, Mark Solution ✅ |
| #read-the-rules | Consent feature testing | Forum Guidelines Consent ✅ |
| #ai-auto-answer | AI auto-answer testing | Auto Thread ✅, Mark Solution ✅ |
| #indexing-enabled | Public message indexing | Indexing ✅ |
| #indexing-disabled | Non-indexed channel | (none) |
| #playground | Ad-hoc testing | (none) |

### Forum Channels

| Channel | Purpose | Settings |
|---------|---------|----------|
| #forum-mark-solution | Forum mark solution with tags | Mark Solution ✅ |
| #forum-no-settings | Forum negative tests | (none) |

---

## Channel IDs

These are set by the setup script and referenced in `src/test-channels.ts`:

```typescript
export const CHANNELS = {
  MARK_SOLUTION_ENABLED: "mark-solution-enabled",
  MARK_SOLUTION_DISABLED: "mark-solution-disabled",
  AUTO_THREAD_ENABLED: "auto-thread-enabled",
  FORUM_MARK_SOLUTION: "forum-mark-solution",
  FORUM_NO_SETTINGS: "forum-no-settings",
  READ_THE_RULES: "read-the-rules",
  AI_AUTO_ANSWER: "ai-auto-answer",
  INDEXING_ENABLED: "indexing-enabled",
  INDEXING_DISABLED: "indexing-disabled",
  PLAYGROUND: "playground",
};
```

## Troubleshooting

### "Missing Permissions" during setup
The test user needs Administrator or "Manage Channels" permission in the server.

### Rate limiting
The setup script handles rate limits automatically. If tests hit rate limits, they'll wait and retry.

### Redis warnings
"REDIS_URL not set" warnings are normal for local development. The script falls back to in-memory caching.

### Bot not responding
1. Ensure the Answer Overflow bot is online
2. Verify the channel has the correct settings (run `bun run setup:convex`)
3. Check bot has permission to react in the channel
