# Database Migration Plan: PlanetScale MySQL → Convex

## Overview

Migrate data from old AnswerOverflow database (PlanetScale MySQL with Drizzle ORM) to new Convex database.

- **Source**: PlanetScale MySQL (~14GB, ~21.5M rows)
- **Target**: Convex
- **Strategy**: Direct DB connection → Transform → ZIP export → `convex import`

## Data Volume

| Table | Rows | New Tables |
|-------|------|------------|
| Server | 1,533 | `servers` + `serverPreferences` |
| Channel | 611,533 | `channels` + `channelSettings` |
| DiscordAccount | 1,390,919 | `discordAccounts` |
| Message | 18,633,432 | `messages` |
| Emoji | 138 | `emojis` |
| Reaction | 236 | `reactions` |
| UserServerSettings | 954,096 | `userServerSettings` |
| IgnoredDiscordAccount | 186 | `ignoredDiscordAccounts` |
| Attachment | 1,389,293 | `attachments` |

## Bitfield Mappings

### Server Bitfield
| Bit | Value | Field |
|-----|-------|-------|
| 0 | 1 | `readTheRulesConsentEnabled` |
| 1 | 2 | `considerAllMessagesPublicEnabled` |
| 2 | 4 | `anonymizeMessagesEnabled` |

### Channel Bitfield
| Bit | Value | Field |
|-----|-------|-------|
| 0 | 1 | `indexingEnabled` |
| 1 | 2 | `markSolutionEnabled` |
| 2 | 4 | `sendMarkSolutionInstructionsInNewThreads` |
| 3 | 8 | `autoThreadEnabled` |
| 4 | 16 | `forumGuidelinesConsentEnabled` |

### UserServerSettings Bitfield
| Bit | Value | Field |
|-----|-------|-------|
| 0 | 1 | `canPubliclyDisplayMessages` |
| 1 | 2 | `messageIndexingDisabled` |

## Field Mappings

### Server → servers + serverPreferences

| Old Field | New Table | New Field | Transform |
|-----------|-----------|-----------|-----------|
| id | servers | discordId | `String(bigint)` |
| name | servers | name | Direct |
| icon | servers | icon | `null → undefined` |
| description | servers | description | `null → undefined` |
| vanityInviteCode | servers | vanityInviteCode | `null → undefined` |
| kickedTime | servers | kickedTime | `Date.getTime()` or `undefined` |
| approximateMemberCount | servers | approximateMemberCount | Direct |
| bitfield | serverPreferences | (decoded) | See bitfield mapping |
| id | serverPreferences | serverId | `String(bigint)` |
| plan | serverPreferences | plan | Direct |
| stripeCustomerId | serverPreferences | stripeCustomerId | `null → undefined` |
| stripeSubscriptionId | serverPreferences | stripeSubscriptionId | `null → undefined` |
| customDomain | serverPreferences | customDomain | `null → undefined` |
| subpath | serverPreferences | subpath | `null → undefined` |
| vanityUrl | - | - | **DROPPED** |

### Channel → channels + channelSettings

| Old Field | New Table | New Field | Transform |
|-----------|-----------|-----------|-----------|
| id | channels | id | `String(bigint)` |
| serverId | channels | serverId | `String(bigint)` |
| name | channels | name | Direct |
| type | channels | type | Direct |
| parentId | channels | parentId | `String(bigint)` or `undefined` |
| archivedTimestamp | channels | archivedTimestamp | Direct or `undefined` |
| - | channels | availableTags | `undefined` (new field) |
| - | channels | botPermissions | `undefined` (new field) |
| id | channelSettings | channelId | `String(bigint)` |
| bitfield | channelSettings | (decoded) | See bitfield mapping |
| solutionTagId | channelSettings | solutionTagId | `String(bigint)` or `undefined` |
| lastIndexedSnowflake | channelSettings | lastIndexedSnowflake | `String(bigint)` or `undefined` |
| inviteCode | channelSettings | inviteCode | `null → undefined` |

### Message → messages

All bigint IDs converted to String. Embeds JSON passed through directly.

### UserServerSettings → userServerSettings

| Old Field | New Field | Transform |
|-----------|-----------|-----------|
| userId | userId | `String(bigint)` |
| serverId | serverId | `String(bigint)` |
| - | permissions | `0` (new field, default) |
| bitfield | (decoded) | See bitfield mapping |
| apiKey | apiKey | `null → undefined` |
| apiCallsUsed | apiCallsUsed | Direct |
| - | botAddedTimestamp | `undefined` (new field) |

## Usage

```bash
# Set environment variable
export OLD_DATABASE_URL="mysql://..."

# Run migration
cd packages/migration
bun run migrate

# Import to Convex dev (test)
cd ../database
bunx convex import ../../git-ignored/migration-output/migration-export.zip

# Validate (optional)
cd ../migration
bun run validate

# Import to Convex prod
cd ../database
bunx convex import --prod --replace ../../git-ignored/migration-output/migration-export.zip
```

## Convex Import Format

The migration generates a ZIP file with:
- `tableName/documents.jsonl` - One JSON object per line
- `tableName/generated_schema.jsonl` - Type hints (declares int64 fields)

Int64 values are exported as strings in JSONL. The `generated_schema.jsonl` tells Convex to convert them to BigInt on import.

## Error Handling

- Failed rows are logged to `failures-{tableName}.json`
- Migration continues on row-level failures
- Progress logged every 2 seconds or 10k records

## Estimated Time

- Small tables: <1 min total
- Medium tables (channels, accounts, settings): 10-15 min
- Messages (18.6M rows): 45-90 min
- ZIP creation: 2-5 min
- **Total: ~60-100 minutes**
