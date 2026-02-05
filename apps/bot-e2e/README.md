# Bot E2E Tests

End-to-end tests for the Answer Overflow Discord bot using a real Discord user account.

## How It Works

These tests use a Discord user account to:
1. Send messages and create threads (like a real user)
2. Invoke bot commands (context menus, slash commands)
3. Wait for and verify bot responses (reactions, replies, embeds)

## TDD Workflow

1. **Write a test** describing expected bot behavior
2. **Run the test** - it will fail if the bot doesn't behave as expected
3. **Implement the feature** in the bot
4. **Run the test again** - it should pass

### Example: Testing Mark Solution

```typescript
test("should mark a message as solution and add reaction", async () => {
  // 1. Create a question thread (as a user would)
  const message = await sendMessage(channel, "How do I do X?");
  const thread = await createThread(message, "Help with X");
  const answer = await sendMessage(thread, "You do it like this...");

  // 2. Invoke the mark solution command
  const command = await findCommand(guild.id, "✅ Mark Solution", 3);
  await invokeMessageContextMenu(guild.id, thread.id, answer.id, command);

  // 3. Verify the bot responded correctly
  const hasReaction = await waitForReaction(answer, "✅", { timeout: 15000 });
  expect(hasReaction).toBe(true);
});
```

## Available Helpers

### Client Operations (`src/client.ts`)
- `getClient()` - Get authenticated Discord client
- `getGuild(client, name)` - Find guild by name
- `getTextChannel(guild, name)` - Find text channel
- `sendMessage(channel, content)` - Send a message
- `createThread(message, name)` - Create thread from message
- `findCommand(guildId, name, type)` - Find application command
- `invokeMessageContextMenu(...)` - Invoke context menu command
- `invokeSlashCommand(...)` - Invoke slash command

### Assertions (`src/assertions.ts`)
- `waitForBotReply(thread, botId, options)` - Wait for bot message
- `waitForReaction(message, emoji, options)` - Wait for reaction
- `waitForThreadTag(thread, tagId, options)` - Wait for tag to be applied
- `waitForCondition(checkFn, options)` - Generic wait helper

## Setup

1. Create `.discord-token` with your Discord user token
2. Or set `DISCORD_TOKEN` environment variable

## Running Tests

```bash
# Run all tests
bun test

# Run specific test file
bun run tests/mark-solution.test.ts
```

## CI/Cron Setup

Tests run on Railway every 5 minutes. Failures alert via Pushover.

Environment variables needed:
- `DISCORD_TOKEN` - Discord user auth token
- `PUSHOVER_USER_KEY` - Pushover user key
- `PUSHOVER_API_TOKEN` - Pushover API token

## Adding New Tests

1. Create a new `.test.ts` file in `tests/`
2. Use the helpers from `src/client.ts` and `src/assertions.ts`
3. Follow the pattern: setup → action → assertion
