# Simplification Opportunities

Found during server/serverPreferences schema split refactoring.

---

## Low Priority (Nice to Have)

### 9. Missing Composite Index for Reactions

**File**: `packages/database/convex/schema.ts` lines 256-259

No efficient way to look up a specific reaction by `messageId + userId + emojiId`.

**Recommendation**: Add composite index `by_messageId_userId_emojiId`.

### 12. Server Lookup Pattern Duplication

Nearly every handler has this pattern:

```typescript
const serverLiveData =
  yield *
  database.private.servers.getServerByDiscordId({
    discordId: BigInt(guildId),
  });
if (!server) {
  return;
}
```

**Files**: message-parity.ts, channel-parity.ts, forum-guidelines-consent.ts, read-the-rules-consent.ts, mark-solution-command.ts, channel-settings-command.ts, manage-account-command.ts

**Recommendation**: Create `getServerOrFail(guildId)` helper that returns `Effect<Server, ServerNotFoundError>`.

### 13. Duplicate Ignored Account Check

**Files**:

- `apps/discord-bot/src/handlers/forum-guidelines-consent.ts` (lines 58-67)
- `apps/discord-bot/src/handlers/read-the-rules-consent.ts` (lines 45-54)
- `apps/discord-bot/src/handlers/manage-account-command.ts` (lines 194-200)

**Recommendation**: Extract `isAccountIgnored(userId): Effect<boolean>` helper.
