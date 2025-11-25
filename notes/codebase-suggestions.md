# 10 Suggestions for the AnswerOverflow Rewrite

## 1. **Split `shared.ts` into Domain-Specific Modules**

The `packages/database/convex/shared/shared.ts` file is 1000+ lines with mixed concerns. Split it into focused modules:

```
convex/shared/
├── permissions.ts      # hasPermission, DISCORD_PERMISSIONS, getHighestRoleFromPermissions
├── channels.ts         # getChannelWithSettings, deleteChannelInternalLogic, CHANNEL_TYPE
├── messages.ts         # message CRUD, enrichMessageForDisplay, findMessagesByChannelId
├── servers.ts          # getServerByDiscordId, validateCustomDomain, sortServersByBotAndRole
├── users.ts            # getDiscordAccountById, user settings logic
├── mentions.ts         # extractMentionIds, getMentionMetadata, extractDiscordLinks
└── index.ts            # re-exports
```

This improves maintainability and makes it easier to find/modify specific functionality.

---

## 2. **Fix Inefficient Custom Domain Validation**

`validateCustomDomainUniqueness` at `shared.ts:121` iterates ALL servers to check uniqueness:

```typescript
const allServers = await ctx.db.query("servers").collect();
for (const server of allServers) { ... }
```

**Fix:** Use the existing `by_customDomain` index on `serverPreferences`:

```typescript
export async function validateCustomDomainUniqueness(
  ctx: QueryCtx | MutationCtx,
  customDomain: string | null | undefined,
  excludePreferencesId?: Id<"serverPreferences">,
): Promise<string | null> {
  if (!customDomain) return null;
  
  const existing = await ctx.db
    .query("serverPreferences")
    .withIndex("by_customDomain", (q) => q.eq("customDomain", customDomain))
    .first();
  
  if (existing && existing._id !== excludePreferencesId) {
    return `Server with custom domain ${customDomain} already exists`;
  }
  return null;
}
```

---

## 3. **Replace Collect-Sort-Slice with Index-Based Pagination**

Functions like `findMessagesByChannelId` (`shared.ts:506`) fetch all messages then sort/slice in memory:

```typescript
const allMessages = await getManyFrom(ctx.db, "messages", "by_channelId", channelId, "channelId");
let messages = allMessages.sort((a, b) => compareIds(a.id, b.id));
return messages.slice(0, effectiveLimit);
```

**Fix:** Add a compound index `by_channelId_and_id: ["channelId", "id"]` and query directly:

```typescript
export async function findMessagesByChannelId(
  ctx: QueryCtx | MutationCtx,
  channelId: bigint,
  limit?: number,
  after?: bigint,
) {
  let query = ctx.db
    .query("messages")
    .withIndex("by_channelId_and_id", (q) => {
      const base = q.eq("channelId", channelId);
      return after ? base.gt("id", after) : base;
    })
    .order("asc");
  
  return await query.take(limit ?? 100);
}
```

---

## 4. **Replace `.filter()` Queries with Proper Indexes**

Several queries use `.filter()` instead of indexes (e.g., `findIgnoredDiscordAccountById` at `shared.ts:151`):

```typescript
return await ctx.db
  .query("ignoredDiscordAccounts")
  .filter((q) => q.eq(q.field("id"), id))  // ❌ Table scan
  .first();
```

**Fix:** Use the existing index:

```typescript
return await ctx.db
  .query("ignoredDiscordAccounts")
  .withIndex("by_discordAccountId", (q) => q.eq("id", id))  // ✅ Index lookup
  .first();
```

Same issue exists for `getDiscordAccountById`, `getMessageById`, and emoji lookups.

---

## 5. **Implement Rate Limiting for Indexing**

The notes mention using `convex-helpers` rate limiting. For the Discord message indexing that runs every 6 hours, add rate limiting to prevent abuse and control resource usage:

```typescript
import { RateLimiter } from "convex-helpers/server/rateLimit";

const indexingRateLimiter = new RateLimiter(components.rateLimiter, {
  indexServer: { kind: "fixed window", rate: 1, period: "6 hours" },
  fetchMessages: { kind: "token bucket", rate: 100, period: "minute", capacity: 100 },
});
```

This also provides observability into indexing activity.

---

## 6. **Use `convex-helpers/server/validators` to DRY Up Schema**

The schema has repetitive union patterns (e.g., `plan` field). Use `literals` helper:

```typescript
import { literals, nullable } from "convex-helpers/server/validators";

// Before
plan: v.union(
  v.literal("FREE"),
  v.literal("STARTER"),
  // ...
),

// After
plan: literals("FREE", "STARTER", "ADVANCED", "PRO", "ENTERPRISE", "OPEN_SOURCE"),
```

Also use `nullable` for optional fields that can be explicitly null.

---

## 7. **Add Compound Indexes for Common Query Patterns**

Based on the query patterns in `shared.ts`, add these missing compound indexes to `schema.ts`:

```typescript
messages: defineTable(messageSchema)
  .index("by_channelId_and_id", ["channelId", "id"])  // For sorted pagination
  .index("by_serverId_and_id", ["serverId", "id"])    // For server-scoped pagination
  .index("by_authorId_and_id", ["authorId", "id"])    // For user message history
  // ... existing indexes
```

This enables efficient cursor-based pagination without in-memory sorting.

---

## 8. **Implement Workpool for Background Message Fetching**

The indexing system could benefit from the Convex Workpool component for managing background message fetching jobs:

```typescript
import { Workpool } from "@convex-dev/workpool";

const workpool = new Workpool(components.workpool, {
  maxParallelism: 10,
  actionTimeoutMs: 5 * 60 * 1000, // 5 minutes
});

// Instead of scheduling many individual actions
await workpool.enqueueAction(internal.indexing.fetchChannelMessages, {
  channelId,
  serverId,
});
```

This provides better observability, retry handling, and parallelism control.

---

## 9. **Add Missing Content Pages with SEO Optimization**

The notes show many incomplete pages. Prioritize implementing:

1. `/m/[messageId]` - Individual message/thread pages (primary SEO landing pages)
2. `/c/[serverId]/[channelId]` - Channel thread listings
3. `/u/[userId]` - User profile pages

These are critical for the core value prop (making Discord content searchable). Each should include:
- Proper `<head>` meta tags and structured data (JSON-LD)
- OpenGraph images via `/og/post`
- Breadcrumb navigation

---

## 10. **Add Aggregate Component for Analytics**

For the analytics dashboard features (page views, Q&As over time, top solvers), use the Convex Aggregate component instead of querying raw data:

```typescript
import { Aggregate } from "@convex-dev/aggregate";

const pageViewsAggregate = new Aggregate<{ serverId: bigint; date: string }>(
  components.pageViewsAggregate,
);

// Track
await pageViewsAggregate.insert(ctx, { serverId, date: today });

// Query efficiently
const viewsThisWeek = await pageViewsAggregate.count(ctx, {
  bounds: { lower: { serverId, date: weekAgo }, upper: { serverId, date: today } },
});
```

This is much more efficient than counting raw events for dashboard analytics.

---

## Summary Priority

| Priority | Suggestion | Impact |
|----------|-----------|--------|
| **High** | #2 Fix custom domain validation | Performance bug |
| **High** | #4 Replace .filter() with indexes | Performance |
| **High** | #9 Add missing content pages | Core functionality |
| **Medium** | #3 Index-based pagination | Performance at scale |
| **Medium** | #7 Add compound indexes | Performance |
| **Medium** | #1 Split shared.ts | Maintainability |
| **Medium** | #10 Aggregate for analytics | New feature enabler |
| **Low** | #5 Rate limiting | Operational safety |
| **Low** | #6 Validator helpers | Code cleanliness |
| **Low** | #8 Workpool for indexing | Operational improvement |
