# Simplification Opportunities

Found during server/serverPreferences schema split refactoring.

## High Priority (Similar to Server/ServerPreferences Split)

### 1. `userServerSettings` Mixed Concerns
**File**: `packages/database/convex/schema.ts` lines 54-63

The `userServerSettings` table mixes:
- **Discord data**: `permissions` (synced from Discord API)
- **App settings**: `canPubliclyDisplayMessages`, `messageIndexingDisabled`, `apiKey`, `apiCallsUsed`, `botAddedTimestamp`

**Recommendation**: Split into `userServerPermissions` (Discord data) and `userServerPreferences` (app settings), same pattern as server/serverPreferences.

**Files affected**:
- `packages/database/convex/schema.ts`
- `packages/database/convex/private/user_server_settings.ts`
- `packages/database/convex/shared/users.ts`

### 2. `inviteCode` on `channelSchema`
**File**: `packages/database/convex/schema.ts` line 75

The `inviteCode` field is app-generated (AnswerOverflow creates invite codes), not Discord-synced data. It should be on `channelSettingsSchema`.

---

## Medium Priority (Function Consolidation)

### 3. Duplicate `findByDiscordId`
**File**: `packages/database/convex/private/servers.ts` lines 254-261

Two functions do the exact same thing:
- `getServerByDiscordId` (line 127)
- `findByDiscordId` (line 254)

**Recommendation**: Delete `findByDiscordId`.

### 4. Duplicate `DEFAULT_CHANNEL_SETTINGS` (3 files)
Same defaults defined in:
- `packages/database/convex/shared/channels.ts` (lines 27-36)
- `packages/database/convex/private/channels.ts` (lines 23-32)
- `packages/database/convex/private/servers.ts` (lines 9-16) - **BUG: uses `channelId: ""`** instead of `0n`

**Recommendation**: Single source of truth in `shared/channels.ts`.

### 5. Double Channel Upsert in `syncGuild`
**File**: `apps/discord-bot/src/handlers/server-parity.ts`

Lines 83-110: First upserts all channels in batch, then calls `syncChannel()` on each - which also upserts. Each channel gets upserted twice.

**Recommendation**: Remove the batch upsert, just use `syncChannel()`.

### 6. Duplicate Consent Update Logic (2 files, identical code)
Same pattern in:
- `apps/discord-bot/src/handlers/forum-guidelines-consent.ts` (lines 84-106)
- `apps/discord-bot/src/handlers/read-the-rules-consent.ts` (lines 71-93)

**Recommendation**: Extract `grantPublicDisplayConsent(database, userId, serverId)` helper.

### 7. Duplicate `makeDismissButton` (2 files, identical function)
- `apps/discord-bot/src/handlers/quick-action.ts` (lines 27-33)
- `apps/discord-bot/src/handlers/send-mark-solution-instructions.ts` (lines 16-22)

**Recommendation**: Extract to shared utility like `apps/discord-bot/src/utils/discord-components.ts`.

---

## Low Priority (Nice to Have)

### 8. Duplicate Discord Account Functions
**File**: `packages/database/convex/private/discord_accounts.ts`

`updateDiscordAccount` and `upsertDiscordAccount` do nearly the same thing.

**Recommendation**: Consolidate to just upsert.

### 9. Missing Composite Index for Reactions
**File**: `packages/database/convex/schema.ts` lines 256-259

No efficient way to look up a specific reaction by `messageId + userId + emojiId`.

**Recommendation**: Add composite index `by_messageId_userId_emojiId`.

### 10. Inconsistent Query Patterns
Mix of `getOneFrom()` vs manual `.query().withIndex().unique()` patterns for the same lookups.

**Recommendation**: Standardize on `getOneFrom()` everywhere.

### 11. Duplicate Message Upsert Object Construction
**Files**:
- `apps/discord-bot/src/handlers/message-parity.ts` (lines 67-91 and 189-213)
- `apps/discord-bot/src/handlers/indexing.ts` (lines 191-216)
- `apps/discord-bot/src/handlers/mark-solution-command.ts` (lines 181-205)

All manually destructure and rebuild message objects for upsert.

**Recommendation**: Create `upsertMessageFromAO(database, aoMessage)` helper.

### 12. Server Lookup Pattern Duplication
Nearly every handler has this pattern:
```typescript
const serverLiveData = yield* database.private.servers.getServerByDiscordId({
  discordId: BigInt(guildId),
});
if (!server) {
  return;
}
```

**Files**: message-parity.ts, channel-parity.ts, forum-guidelines-consent.ts, read-the-rules-consent.ts, mark-solution-command.ts, channel-settings-command.ts, manage-account-command.ts

**Recommendation**: Create `getServerOrFail(database, guildId)` helper that returns `Effect<Server, ServerNotFoundError>`.

### 13. Duplicate Ignored Account Check
**Files**:
- `apps/discord-bot/src/handlers/forum-guidelines-consent.ts` (lines 58-67)
- `apps/discord-bot/src/handlers/read-the-rules-consent.ts` (lines 45-54)
- `apps/discord-bot/src/handlers/manage-account-command.ts` (lines 194-200)

**Recommendation**: Extract `isAccountIgnored(database, userId): Effect<boolean>` helper.
