# Sitemap Implementation Plan

> **Status**: NOT IMPLEMENTED - This is the next major feature to build.
> **Priority**: Critical for SEO

## Requirements Summary

<start>
# Sitemap Generation Requirements

The sitemap system enables search engines to discover and index Discord threads that have been made public on Answer Overflow.

## Sitemap Types

The system operates in two modes:

- **Global sitemap** - For the main Answer Overflow site that includes all public threads from servers without custom domains
- **Per-community sitemaps** - Generated dynamically for individual servers with custom domains or community pages

## URL Structure & Chunking

### Global Sitemap URLs

The global sitemap uses a chunked structure to handle large volumes of threads:

- **Sitemap index**: `/sitemap.xml` - The main entry point that references all individual sitemap files
- **Individual sitemaps**: `/sitemap0.xml`, `/sitemap1.xml`, `/sitemap2.xml`, etc. - Each contains up to 10,000 thread URLs
- **Thread URLs**: Each sitemap entry points to `/m/{threadId}` where `{threadId}` is the Discord thread ID

When the number of threads exceeds 10,000, the system automatically splits them into multiple sitemap files. The sitemap index file lists all these individual sitemaps, allowing search engines to discover and crawl them efficiently.

### Per-Community Sitemap URLs

Per-community sitemaps are served as single files:

- **Custom domains**: `/{domain}/sitemap.xml` - For servers with custom domains
- **Community pages**: `/c/{communityId}/sitemap.xml` - For community pages on the main site
- **Thread URLs**: Same format as global sitemap (`/m/{threadId}`)
- **Community page URL**: For main site community pages, also includes `/c/{communityId}` in the sitemap

Unlike the global sitemap, per-community sitemaps are generated as single files containing all threads for that specific server, generated on-demand when requested.

## Generation Strategy

- The global sitemap is regenerated daily and stored as a static file
- Per-community sitemaps are generated on-demand when requested but rely on cached data that is refreshed daily

## Privacy & Filtering

Both sitemap types respect user privacy settings:

- Excludes threads containing messages from users who have opted out of public indexing
- Only includes threads from channels where the server owner has explicitly enabled indexing
- Excludes threads from servers that have been removed or have custom routing configurations to prevent duplicate content issues

## Content Details

When generating sitemaps, the system:

- Automatically extracts last-modified dates from Discord thread metadata or derives them from Discord's snowflake ID timestamps
- Assigns a priority of 0.9 to all thread URLs to indicate their importance for search indexing
- Splits large sitemaps into multiple files to comply with search engine limits

## Custom Domain Handling

The system handles servers with custom domains by generating separate sitemaps that only include threads from that specific server.

## Technical Standards

All sitemaps follow the standard XML sitemap protocol and include proper cache headers to balance freshness with performance, allowing search engines to efficiently crawl and index the public Discord conversations that Answer Overflow makes discoverable.

<end>

And here is the plan to implement it:

<start>
# Sitemap Implementation Plan - Revised with Expert Review

## Executive Summary

Implementation of sitemap generation using `@convex-dev/aggregate` to efficiently track and serve sitemaps for Answer Overflow threads. This approach uses denormalization on the `channels` table (threads are channels in Discord) with incremental updates and namespace isolation.

## Key Architectural Decisions

### 1. Type Consistency: Use `bigint` Throughout

- Discord snowflakes stored as `v.int64()` in Convex → TypeScript `bigint`
- **Decision**: Use `bigint` for all `Key` and `Namespace` types
- Aggregate definitions use `sortKey: (doc) => doc.id` (already bigint)
- Queries/mutations pass `bigint` values directly

### 2. Denormalized `hasPublicMessage` Field

**Problem**: `hasPublicMessageInThread()` queries messages table on every visibility check, which is expensive in triggers.

**Solution**: Add `hasPublicMessage: boolean` field to channels table:

- Updated whenever messages are created/deleted
- Updated when user privacy settings change
- Updated when server "considerAllMessagesPublic" toggles
- Makes visibility checks O(1) instead of O(messages)

### 3. Visibility Changes Across Multiple Tables

Threads become public/private when:

- User privacy settings change
- Server "consider all messages public" toggles
- Channel settings `indexingEnabled` changes
- Server gains/loses custom domain
- Messages deleted → thread loses "has public message" status

**Solution**: Create dedicated helpers that re-evaluate affected threads + triggers on messages table

### 4. Prevent Aggregate Drift with Triggers

**Problem**: If code bypasses upsert functions, aggregates go stale.

**Solution**: Use `Triggers` from `convex-helpers` to automatically update aggregates on any channel write.

### 5. Metadata Storage in Convex

**Problem**: Reading S3 to find `lastThreadId` is brittle.

**Solution**: Add `sitemapMetadata` table to track generation state in Convex with proper indexing.

### 6. Shared Constants for URL Limits

**Problem**: Hardcoded `10000` and `50000` scattered throughout code.

**Solution**: Centralize in `sitemapConstants.ts` to prevent inconsistencies.

### 7. S3 Helpers in Shared Package

**Problem**: Convex actions can't import from `apps/main-site`.

**Solution**: Create `packages/infrastructure` for S3 operations importable by both Convex and Next.js.

---

## Architecture

### Schema Changes

```typescript
// Updated channels table
channels: defineTable({
  // ... existing fields ...
  hasPublicMessage: v.optional(v.boolean()), // NEW: denormalized for performance
}).index(/* existing indexes */);

// New table for sitemap generation metadata
sitemapMetadata: defineTable({
  scopeType: v.union(v.literal("global"), v.literal("community")),
  serverId: v.optional(v.int64()), // Only set for community scope
  fileIndex: v.number(),
  urlCount: v.number(),
  lastThreadId: v.int64(),
  lastGeneratedAt: v.number(),
}).index("by_scope", ["scopeType", "serverId"]);
```

### Shared Constants

```typescript
// packages/database/convex/shared/sitemapConstants.ts
export const MAX_URLS_PER_SITEMAP = 10000;
export const MAX_SITEMAP_PROTOCOL_LIMIT = 50000;
export const COMMUNITY_SITEMAP_LIMIT = 50000;
```

### Aggregate Definitions

```typescript
// packages/database/convex/aggregates/sitemap.ts
import { components } from "../_generated/api";
import { DataModel } from "../_generated/dataModel";
import { TableAggregate } from "@convex-dev/aggregate";

// Global sitemap - all public threads without custom domains
export const globalSitemapAggregate = new TableAggregate<{
  Key: bigint; // Thread ID (Discord snowflake)
  DataModel: DataModel;
  TableName: "channels";
}>(components.globalSitemap, {
  sortKey: (doc) => doc.id, // Returns bigint
});

// Per-community sitemap - namespaced by server
export const communitySitemapAggregate = new TableAggregate<{
  Namespace: bigint; // Server ID (Discord snowflake)
  Key: bigint; // Thread ID
  DataModel: DataModel;
  TableName: "channels";
}>(components.communitySitemap, {
  namespace: (doc) => doc.serverId, // Returns bigint
  sortKey: (doc) => doc.id, // Returns bigint
});
```

### Trigger Integration

```typescript
// packages/database/convex/triggers/sitemap.ts
import { Triggers } from "convex-helpers/server/triggers";
import { DataModel } from "../_generated/dataModel";
import {
  globalSitemapAggregate,
  communitySitemapAggregate,
} from "../aggregates/sitemap";
import {
  isThreadPublicForSitemap,
  isThreadPublicForGlobalSitemap,
} from "../shared/sitemapVisibility";

export const sitemapTriggers = new Triggers<DataModel>();

// Automatically update aggregates when channels change
sitemapTriggers.register("channels", async (ctx, change) => {
  // Only care about threads
  const doc = change.newDoc ?? change.oldDoc;
  if (!doc || !isThreadType(doc.type)) return;

  if (change.operation === "insert" || change.operation === "update") {
    const isPublic = await isThreadPublicForSitemap(ctx, change.newDoc);
    const isGlobalPublic = await isThreadPublicForGlobalSitemap(
      ctx,
      change.newDoc
    );

    if (isPublic) {
      await communitySitemapAggregate.replaceOrInsert(ctx, change.newDoc);
    } else if (change.oldDoc) {
      await communitySitemapAggregate.deleteIfExists(ctx, change.oldDoc);
    }

    if (isGlobalPublic) {
      await globalSitemapAggregate.replaceOrInsert(ctx, change.newDoc);
    } else if (change.oldDoc) {
      await globalSitemapAggregate.deleteIfExists(ctx, change.oldDoc);
    }
  } else if (change.operation === "delete") {
    await communitySitemapAggregate.deleteIfExists(ctx, change.oldDoc);
    await globalSitemapAggregate.deleteIfExists(ctx, change.oldDoc);
  }
});

// Trigger when messages change (affects hasPublicMessage)
sitemapTriggers.register("messages", async (ctx, change) => {
  // When message added/deleted/updated, recompute hasPublicMessage for thread
  const message = change.newDoc ?? change.oldDoc;
  if (!message) return;

  // Update hasPublicMessage field on channel
  await ctx.db.patch(message.channelId, {
    hasPublicMessage: await computeHasPublicMessage(ctx, message.channelId),
  });

  // Note: The channel trigger will then update aggregates
});
```

### Custom Mutation Wrapper

```typescript
// packages/database/convex/client.ts (or appropriate file)
import { customMutation as createCustomMutation } from "convex-helpers/server/customFunctions";
import { mutation } from "./_generated/server";
import { sitemapTriggers } from "./triggers/sitemap";

export const sitemapMutation = createCustomMutation(
  mutation,
  sitemapTriggers.wrapDB
);
```

---

## File Structure

```
packages/
├── database/
│   └── convex/
│       ├── aggregates/
│       │   └── sitemap.ts                    # Aggregate definitions
│       ├── shared/
│       │   ├── sitemapConstants.ts           # Shared constants
│       │   ├── sitemapVisibility.ts          # Visibility computation helpers
│       │   └── sitemapMaintenance.ts         # Re-evaluation helpers
│       ├── private/
│       │   └── sitemap.ts                    # Internal queries/mutations/actions
│       ├── public/
│       │   └── sitemap.ts                    # Public sitemap queries
│       ├── triggers/
│       │   └── sitemap.ts                    # Trigger registration
│       └── crons.ts                          # Cron job registration
├── infrastructure/
│   ├── src/
│   │   └── sitemapStorage.ts                 # S3 upload/download helpers
│   ├── package.json
│   └── tsconfig.json
└── ui/
    └── src/
        └── lib/
            └── sitemap.ts                    # Sitemap XML builder class

apps/main-site/src/app/
├── sitemap.xml/
│   └── route.ts                              # Global sitemap index proxy
├── c/[serverId]/
│   └── sitemap.xml/route.ts                  # Community sitemap
└── [domain]/
    └── sitemap.xml/route.ts                  # Custom domain sitemap
```

---

## Implementation Phases

### Phase 1: Foundation (Day 1)

**Goals**: Set up infrastructure, schema, constants, and aggregates

#### 1.1 Install Dependencies

```bash
cd packages/database
bun add @convex-dev/aggregate
bun add convex-helpers
```

#### 1.2 Create Infrastructure Package

```bash
mkdir -p packages/infrastructure/src
cd packages/infrastructure
```

**File**: `packages/infrastructure/package.json`

```json
{
  "name": "@packages/infrastructure",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    "./sitemap-storage": "./src/sitemapStorage.ts"
  },
  "dependencies": {
    "@aws-sdk/client-s3": "^3.0.0"
  },
  "devDependencies": {
    "typescript": "^5.9.2"
  }
}
```

**File**: `packages/infrastructure/tsconfig.json`

```json
{
  "extends": "@packages/typescript-config/base.json",
  "compilerOptions": {
    "outDir": "./dist"
  },
  "include": ["src"]
}
```

#### 1.3 Create Shared Constants

**File**: `packages/database/convex/shared/sitemapConstants.ts`

```typescript
// Sitemap URL limits
export const MAX_URLS_PER_SITEMAP = 10000;
export const MAX_SITEMAP_PROTOCOL_LIMIT = 50000;
export const COMMUNITY_SITEMAP_LIMIT = 50000;

// Batch sizes for pagination
export const SITEMAP_QUERY_BATCH_SIZE = 1000;
```

#### 1.4 Configure Convex Components

```typescript
// packages/database/convex/convex.config.ts
import { defineApp } from "convex/server";
import aggregate from "@convex-dev/aggregate/convex.config";

const app = defineApp();
app.use(aggregate, { name: "globalSitemap" });
app.use(aggregate, { name: "communitySitemap" });
export default app;
```

#### 1.5 Create Aggregate Definitions

**File**: `packages/database/convex/aggregates/sitemap.ts`

- Define `globalSitemapAggregate` with `Key: bigint`
- Define `communitySitemapAggregate` with `Namespace: bigint`, `Key: bigint`
- Export both aggregates

#### 1.6 Add Schema Changes

**File**: `packages/database/convex/schema.ts`

```typescript
// Add to channels table
channels: defineTable({
  // ... existing fields ...
  hasPublicMessage: v.optional(v.boolean()),
}).index(/* existing indexes */);

// New table
sitemapMetadata: defineTable({
  scopeType: v.union(v.literal("global"), v.literal("community")),
  serverId: v.optional(v.int64()),
  fileIndex: v.number(),
  urlCount: v.number(),
  lastThreadId: v.int64(),
  lastGeneratedAt: v.number(),
}).index("by_scope", ["scopeType", "serverId"]);
```

#### 1.7 Create Visibility Helpers

**File**: `packages/database/convex/shared/sitemapVisibility.ts`

Functions:

- `isThreadPublicForSitemap(ctx, thread)` - Check if thread is public
  - Must be thread type (10, 11, 12)
  - Must have `parentId`
  - Parent must have `indexingEnabled: true`
  - Server must not be kicked
  - Must have `hasPublicMessage: true` (denormalized field)
- `isThreadPublicForGlobalSitemap(ctx, thread)` - Check for global sitemap

  - **Calls `isThreadPublicForSitemap` first** (avoid duplicate work)
  - Additionally excludes custom domains and subpaths

- `computeHasPublicMessage(ctx, threadId)` - Compute public message status
  - Query messages by `channelId` (thread ID) using index
  - Use `.first()` to short-circuit (don't scan all messages)
  - Check user privacy settings
  - Check server "consider all messages public" setting
  - Check ignored accounts
  - Returns boolean

**Implementation**:

```typescript
export async function isThreadPublicForSitemap(
  ctx: QueryCtx | MutationCtx,
  thread: Doc<"channels">
): Promise<boolean> {
  // Must be a thread type
  if (!isThreadType(thread.type)) return false;

  // Must have parent channel
  if (!thread.parentId) return false;

  // Check hasPublicMessage (denormalized field)
  if (!thread.hasPublicMessage) return false;

  // Parent channel must have indexing enabled
  const parent = await ctx.db.get(thread.parentId);
  if (!parent) return false;

  const parentSettings = await getChannelSettings(ctx, thread.parentId);
  if (!parentSettings?.indexingEnabled) return false;

  // Server must not be kicked
  const server = await ctx.db.get(thread.serverId);
  if (!server || server.kickedTime) return false;

  return true;
}

export async function isThreadPublicForGlobalSitemap(
  ctx: QueryCtx | MutationCtx,
  thread: Doc<"channels">
): Promise<boolean> {
  // First check base visibility (avoids duplicate work)
  const isPublic = await isThreadPublicForSitemap(ctx, thread);
  if (!isPublic) return false;

  // Exclude servers with custom domains
  const prefs = await getServerPreferences(ctx, thread.serverId);
  if (prefs?.customDomain) return false;
  if (prefs?.subpath) return false;

  return true;
}

export async function computeHasPublicMessage(
  ctx: QueryCtx | MutationCtx,
  threadId: Id<"channels">
): Promise<boolean> {
  const thread = await ctx.db.get(threadId);
  if (!thread) return false;

  const server = await ctx.db.get(thread.serverId);
  if (!server) return false;

  const prefs = await getServerPreferences(ctx, thread.serverId);

  // If server considers all messages public, short-circuit
  if (prefs?.considerAllMessagesPublicEnabled) {
    const anyMessage = await ctx.db
      .query("messages")
      .withIndex("by_channelId", (q) => q.eq("channelId", threadId))
      .first();
    return anyMessage !== null;
  }

  // Find first public message
  const publicMessage = await ctx.db
    .query("messages")
    .withIndex("by_channelId", (q) => q.eq("channelId", threadId))
    .filter(async (q) => {
      // Check user privacy settings
      const userSettings = await getUserServerSettings(
        ctx,
        q.authorId,
        thread.serverId
      );
      if (!userSettings?.canPubliclyDisplayMessages) return false;

      // Check if user is ignored
      const isIgnored = await isIgnoredAccount(ctx, q.authorId);
      if (isIgnored) return false;

      return true;
    })
    .first();

  return publicMessage !== null;
}
```

#### 1.8 Run Tests

```bash
bun run test -- sitemapVisibility
```

---

### Phase 2: Trigger Integration (Day 2)

**Goals**: Automatically maintain aggregates and hasPublicMessage field

#### 2.1 Create Trigger Setup

**File**: `packages/database/convex/triggers/sitemap.ts`

```typescript
import { Triggers } from "convex-helpers/server/triggers";
import { DataModel } from "../_generated/dataModel";
import {
  globalSitemapAggregate,
  communitySitemapAggregate,
} from "../aggregates/sitemap";
import {
  isThreadPublicForSitemap,
  isThreadPublicForGlobalSitemap,
  computeHasPublicMessage,
} from "../shared/sitemapVisibility";

export const sitemapTriggers = new Triggers<DataModel>();

// Update aggregates when channels change
sitemapTriggers.register("channels", async (ctx, change) => {
  const doc = change.newDoc ?? change.oldDoc;
  if (!doc || !isThreadType(doc.type)) return;

  if (change.operation === "insert" || change.operation === "update") {
    const isPublic = await isThreadPublicForSitemap(ctx, change.newDoc);
    const isGlobalPublic = await isThreadPublicForGlobalSitemap(
      ctx,
      change.newDoc
    );

    if (isPublic) {
      await communitySitemapAggregate.replaceOrInsert(ctx, change.newDoc);
    } else if (change.oldDoc) {
      await communitySitemapAggregate.deleteIfExists(ctx, change.oldDoc);
    }

    if (isGlobalPublic) {
      await globalSitemapAggregate.replaceOrInsert(ctx, change.newDoc);
    } else if (change.oldDoc) {
      await globalSitemapAggregate.deleteIfExists(ctx, change.oldDoc);
    }
  } else if (change.operation === "delete") {
    await communitySitemapAggregate.deleteIfExists(ctx, change.oldDoc);
    await globalSitemapAggregate.deleteIfExists(ctx, change.oldDoc);
  }
});

// Update hasPublicMessage when messages change
sitemapTriggers.register("messages", async (ctx, change) => {
  const message = change.newDoc ?? change.oldDoc;
  if (!message) return;

  const hasPublic = await computeHasPublicMessage(ctx, message.channelId);
  await ctx.db.patch(message.channelId, { hasPublicMessage: hasPublic });

  // Channel trigger will then update aggregates
});
```

#### 2.2 Create Custom Mutation Wrapper

**File**: `packages/database/convex/client.ts`

```typescript
import { customMutation as createCustomMutation } from "convex-helpers/server/customFunctions";
import { mutation } from "./_generated/server";
import { sitemapTriggers } from "./triggers/sitemap";

export const sitemapMutation = createCustomMutation(
  mutation,
  sitemapTriggers.wrapDB
);
```

#### 2.3 Update Existing Mutations

Replace `privateMutation` with `sitemapMutation` in:

- `packages/database/convex/private/channels.ts`
- `packages/database/convex/private/messages.ts`
- Any other files that write to `channels` or `messages`

**Note**: Ensure all mutations that affect visibility use the wrapped mutation.

#### 2.4 Create Maintenance Helpers

**File**: `packages/database/convex/shared/sitemapMaintenance.ts`

Functions:

- `reevaluateThreadsForServer(ctx, serverId)` - When server settings change

  ```typescript
  export async function reevaluateThreadsForServer(
    ctx: MutationCtx,
    serverId: Id<"servers">
  ) {
    // Get all threads for server
    const threads = await getManyFrom(ctx.db, "channels", "serverId", serverId);

    // Re-evaluate each thread
    for (const thread of threads) {
      if (!isThreadType(thread.type)) continue;

      const isPublic = await isThreadPublicForSitemap(ctx, thread);
      const isGlobalPublic = await isThreadPublicForGlobalSitemap(ctx, thread);

      // Update aggregates
      if (isPublic) {
        await communitySitemapAggregate.replaceOrInsert(ctx, thread);
      } else {
        await communitySitemapAggregate.deleteIfExists(ctx, thread);
      }

      if (isGlobalPublic) {
        await globalSitemapAggregate.replaceOrInsert(ctx, thread);
      } else {
        await globalSitemapAggregate.deleteIfExists(ctx, thread);
      }
    }
  }
  ```

- `reevaluateThreadsForChannel(ctx, channelId)` - When channel settings change

  ```typescript
  export async function reevaluateThreadsForChannel(
    ctx: MutationCtx,
    channelId: Id<"channels">
  ) {
    // Get all threads with parentId = channelId
    const threads = await getManyFrom(
      ctx.db,
      "channels",
      "parentId",
      channelId
    );

    // Re-evaluate each thread (same logic as above)
    for (const thread of threads) {
      // ... same as reevaluateThreadsForServer
    }
  }
  ```

- `reevaluateThreadsForUser(ctx, userId, serverId)` - When user privacy changes
  ```typescript
  export async function reevaluateThreadsForUser(
    ctx: MutationCtx,
    userId: Id<"users">,
    serverId: Id<"servers">
  ) {
    // Get all messages by user in server
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_authorId_and_serverId", (q) =>
        q.eq("authorId", userId).eq("serverId", serverId)
      )
      .collect();

    // Get unique thread IDs
    const threadIds = new Set(messages.map((m) => m.channelId));

    // Re-compute hasPublicMessage for each thread
    for (const threadId of threadIds) {
      const hasPublic = await computeHasPublicMessage(ctx, threadId);
      await ctx.db.patch(threadId, { hasPublicMessage: hasPublic });

      // Channel trigger will update aggregates
    }
  }
  ```

#### 2.5 Hook Into Settings Mutations

Update mutations that change:

- `serverPreferences.customDomain` → call `reevaluateThreadsForServer`
- `serverPreferences.subpath` → call `reevaluateThreadsForServer`
- `serverPreferences.considerAllMessagesPublicEnabled` → call `reevaluateThreadsForServer`
- `servers.kickedTime` → call `reevaluateThreadsForServer`
- `channelSettings.indexingEnabled` → call `reevaluateThreadsForChannel`
- `userServerSettings.canPubliclyDisplayMessages` → call `reevaluateThreadsForUser`

#### 2.6 Backfill hasPublicMessage Field

**File**: `packages/database/convex/private/sitemap.ts`

```typescript
export const backfillHasPublicMessage = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx, args) => {
    const threads = await ctx.db
      .query("channels")
      .filter((q) =>
        q.or(
          q.eq(q.field("type"), 10),
          q.eq(q.field("type"), 11),
          q.eq(q.field("type"), 12)
        )
      )
      .collect();

    for (const thread of threads) {
      const hasPublic = await computeHasPublicMessage(ctx, thread._id);
      await ctx.db.patch(thread._id, { hasPublicMessage: hasPublic });
    }

    return null;
  },
});
```

Run once after deploying:

```bash
# In Convex dashboard or via CLI
npx convex run internal.sitemap.backfillHasPublicMessage
```

#### 2.7 Run Tests

```bash
bun run test -- sitemapTriggers
bun run test -- sitemapMaintenance
```

---

### Phase 3: Sitemap Generation (Day 3)

**Goals**: Generate and upload sitemaps incrementally

#### 3.1 Create Sitemap XML Builder

**File**: `packages/ui/src/lib/sitemap.ts`

```typescript
import { MAX_URLS_PER_SITEMAP } from "@packages/database/convex/shared/sitemapConstants";

export class Sitemap {
  private urls: Array<{
    loc: string;
    lastmod?: Date;
    changefreq?: string;
    priority?: number;
  }> = [];

  addUrl(
    loc: string,
    options?: {
      lastmod?: Date;
      changefreq?: string;
      priority?: number;
    }
  ) {
    if (this.urls.length >= MAX_URLS_PER_SITEMAP) {
      throw new Error(`Sitemap cannot exceed ${MAX_URLS_PER_SITEMAP} URLs`);
    }
    this.urls.push({ loc, ...options });
  }

  getUrlCount(): number {
    return this.urls.length;
  }

  toString(): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    for (const url of this.urls) {
      xml += "  <url>\n";
      xml += `    <loc>${escapeXml(url.loc)}</loc>\n`;
      if (url.lastmod) {
        xml += `    <lastmod>${url.lastmod.toISOString()}</lastmod>\n`;
      }
      if (url.changefreq) {
        xml += `    <changefreq>${url.changefreq}</changefreq>\n`;
      }
      if (url.priority !== undefined) {
        xml += `    <priority>${url.priority}</priority>\n`;
      }
      xml += "  </url>\n";
    }

    xml += "</urlset>";
    return xml;
  }
}

export class SitemapIndex {
  private sitemaps: Array<{ loc: string; lastmod?: Date }> = [];

  addSitemap(loc: string, lastmod?: Date) {
    this.sitemaps.push({ loc, lastmod });
  }

  toString(): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml +=
      '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    for (const sitemap of this.sitemaps) {
      xml += "  <sitemap>\n";
      xml += `    <loc>${escapeXml(sitemap.loc)}</loc>\n`;
      if (sitemap.lastmod) {
        xml += `    <lastmod>${sitemap.lastmod.toISOString()}</lastmod>\n`;
      }
      xml += "  </sitemap>\n";
    }

    xml += "</sitemapindex>";
    return xml;
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
```

#### 3.2 Create S3 Upload Helpers

**File**: `packages/infrastructure/src/sitemapStorage.ts`

```typescript
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { Sitemap, SitemapIndex } from "@packages/ui/lib/sitemap";

const s3 = new S3Client({ region: process.env.AWS_REGION });

export async function uploadSitemapToS3(fileIndex: number, sitemap: Sitemap) {
  const key = `sitemaps/sitemap${fileIndex}.xml`;

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: sitemap.toString(),
      ContentType: "application/xml",
      CacheControl: "public, max-age=3600, s-maxage=86400",
    })
  );

  console.log(`Uploaded sitemap to s3://${process.env.S3_BUCKET}/${key}`);
}

export async function uploadSitemapIndex(numSitemaps: number) {
  const index = new SitemapIndex();

  for (let i = 0; i < numSitemaps; i++) {
    index.addSitemap(
      `https://www.answeroverflow.com/sitemap${i}.xml`,
      new Date()
    );
  }

  const key = "sitemaps/sitemap.xml";

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: index.toString(),
      ContentType: "application/xml",
      CacheControl: "public, max-age=3600, s-maxage=86400",
    })
  );

  console.log(`Uploaded sitemap index to s3://${process.env.S3_BUCKET}/${key}`);
}

export async function fetchSitemapFromS3(fileIndex: number): Promise<Sitemap> {
  const key = `sitemaps/sitemap${fileIndex}.xml`;

  const response = await s3.send(
    new GetObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
    })
  );

  const xml = await response.Body?.transformToString();
  if (!xml) throw new Error(`Failed to fetch sitemap from ${key}`);

  // Parse XML and reconstruct Sitemap object
  // For now, return empty sitemap (implement XML parsing if needed for incremental)
  return new Sitemap();
}
```

#### 3.3 Create Query Helpers

**File**: `packages/database/convex/private/sitemap.ts`

```typescript
import {
  internalQuery,
  internalMutation,
  internalAction,
} from "./_generated/server";
import { v } from "convex/values";
import { globalSitemapAggregate } from "../aggregates/sitemap";
import { SITEMAP_QUERY_BATCH_SIZE } from "../shared/sitemapConstants";

// Get total count
export const getGlobalThreadCount = internalQuery({
  args: {},
  returns: v.number(),
  handler: async (ctx, args) => {
    return await globalSitemapAggregate.size(ctx);
  },
});

// Count threads after a specific ID
export const countGlobalThreadsAfter = internalQuery({
  args: { afterThreadId: v.int64() },
  returns: v.number(),
  handler: async (ctx, args) => {
    return await globalSitemapAggregate.count(ctx, {
      bounds: {
        lower: { key: args.afterThreadId, inclusive: false },
      },
    });
  },
});

// Get threads after a specific ID (for incremental updates)
export const getGlobalThreadsAfter = internalQuery({
  args: {
    afterThreadId: v.int64(),
    cursor: v.optional(v.string()),
    limit: v.number(),
  },
  returns: v.object({
    page: v.array(channelSchema),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    return await globalSitemapAggregate.paginate(ctx, {
      bounds: {
        lower: { key: args.afterThreadId, inclusive: false },
      },
      cursor: args.cursor,
      numItems: args.limit,
    });
  },
});

// Get paginated threads (for full regeneration)
export const getGlobalThreadsPage = internalQuery({
  args: {
    cursor: v.optional(v.string()),
    limit: v.number(),
  },
  returns: v.object({
    page: v.array(channelSchema),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    return await globalSitemapAggregate.paginate(ctx, {
      cursor: args.cursor,
      numItems: args.limit,
    });
  },
});

// Metadata helpers
export const getGlobalSitemapMetadata = internalQuery({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("sitemapMetadata"),
      scopeType: v.literal("global"),
      serverId: v.optional(v.int64()),
      fileIndex: v.number(),
      urlCount: v.number(),
      lastThreadId: v.int64(),
      lastGeneratedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sitemapMetadata")
      .withIndex("by_scope", (q) =>
        q.eq("scopeType", "global").eq("serverId", undefined)
      )
      .first();
  },
});

export const updateGlobalSitemapMetadata = internalMutation({
  args: {
    fileIndex: v.number(),
    urlCount: v.number(),
    lastThreadId: v.int64(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("sitemapMetadata")
      .withIndex("by_scope", (q) =>
        q.eq("scopeType", "global").eq("serverId", undefined)
      )
      .first();

    const metadata = {
      scopeType: "global" as const,
      serverId: undefined,
      ...args,
      lastGeneratedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, metadata);
    } else {
      await ctx.db.insert("sitemapMetadata", metadata);
    }

    return null;
  },
});
```

#### 3.4 Create Generation Action

**File**: `packages/database/convex/private/sitemap.ts` (continued)

```typescript
import { internal } from "./_generated/api";
import { MAX_URLS_PER_SITEMAP } from "../shared/sitemapConstants";
import {
  uploadSitemapToS3,
  uploadSitemapIndex,
} from "@packages/infrastructure/sitemap-storage";
import { Sitemap } from "@packages/ui/lib/sitemap";
import { getDateFromSnowflake } from "@packages/database-utils/snowflakes";

export const generateGlobalSitemaps = internalAction({
  args: {
    forceFullRegeneration: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    console.log("Starting global sitemap generation...");

    // 1. Get current metadata
    const metadata = await ctx.runQuery(
      internal.sitemap.getGlobalSitemapMetadata,
      {}
    );

    // 2. Count total threads
    const totalCount = await ctx.runQuery(
      internal.sitemap.getGlobalThreadCount,
      {}
    );

    // 3. Decide: incremental or full
    const lastThreadId = metadata?.lastThreadId ?? 0n;
    const newCount = await ctx.runQuery(
      internal.sitemap.countGlobalThreadsAfter,
      { afterThreadId: lastThreadId }
    );

    console.log(`Total threads: ${totalCount}, New threads: ${newCount}`);

    // Force full regen if requested or if this is first run
    const shouldFullRegen = args.forceFullRegeneration || !metadata;

    if (!shouldFullRegen && newCount < MAX_URLS_PER_SITEMAP) {
      // Incremental update
      console.log("Running incremental update...");
      await incrementalUpdate(ctx, metadata!, newCount, lastThreadId);
    } else {
      // Full regeneration
      console.log("Running full regeneration...");
      await fullRegeneration(ctx, totalCount);
    }

    console.log("Global sitemap generation complete!");
    return null;
  },
});

async function incrementalUpdate(
  ctx: ActionCtx,
  metadata: {
    fileIndex: number;
    urlCount: number;
    lastThreadId: bigint;
  },
  newCount: number,
  lastThreadId: bigint
) {
  const currentFileIndex = metadata.fileIndex;
  const currentUrlCount = metadata.urlCount;
  const remainingCapacity = MAX_URLS_PER_SITEMAP - currentUrlCount;

  // Fetch new threads (loop through pages)
  const threads = [];
  let cursor: string | undefined;
  let fetched = 0;

  while (fetched < newCount) {
    const result = await ctx.runQuery(internal.sitemap.getGlobalThreadsAfter, {
      afterThreadId: lastThreadId,
      cursor,
      limit: Math.min(newCount - fetched, SITEMAP_QUERY_BATCH_SIZE),
    });

    threads.push(...result.page);
    fetched += result.page.length;

    if (result.isDone) break;
    cursor = result.continueCursor;
  }

  if (threads.length === 0) {
    console.log("No new threads to add");
    return;
  }

  // Check if we can append to existing sitemap
  if (threads.length <= remainingCapacity) {
    // Append to current file
    console.log(
      `Appending ${threads.length} threads to sitemap ${currentFileIndex}`
    );

    // TODO: Fetch existing sitemap from S3, append, re-upload
    // For now, we'll do a simpler approach: always create new file if can't fit
    const sitemap = new Sitemap();

    for (const thread of threads) {
      sitemap.addUrl(`https://www.answeroverflow.com/m/${thread.id}`, {
        lastmod: thread.archivedTimestamp
          ? new Date(thread.archivedTimestamp)
          : getDateFromSnowflake(thread.id),
        priority: 0.9,
      });
    }

    await uploadSitemapToS3(currentFileIndex, sitemap);

    // Update metadata
    await ctx.runMutation(internal.sitemap.updateGlobalSitemapMetadata, {
      fileIndex: currentFileIndex,
      urlCount: currentUrlCount + threads.length,
      lastThreadId: threads[threads.length - 1].id,
    });
  } else {
    // Create new sitemap file(s)
    console.log(`Creating new sitemap file(s) for ${threads.length} threads`);

    let fileIndex = currentFileIndex + 1;
    let sitemap = new Sitemap();
    let lastId = lastThreadId;

    for (const thread of threads) {
      if (sitemap.getUrlCount() >= MAX_URLS_PER_SITEMAP) {
        // Upload current sitemap and start new one
        await uploadSitemapToS3(fileIndex, sitemap);
        fileIndex++;
        sitemap = new Sitemap();
      }

      sitemap.addUrl(`https://www.answeroverflow.com/m/${thread.id}`, {
        lastmod: thread.archivedTimestamp
          ? new Date(thread.archivedTimestamp)
          : getDateFromSnowflake(thread.id),
        priority: 0.9,
      });

      lastId = thread.id;
    }

    // Upload last sitemap if it has URLs
    if (sitemap.getUrlCount() > 0) {
      await uploadSitemapToS3(fileIndex, sitemap);
    }

    // Update sitemap index
    const totalFiles = fileIndex + 1;
    await uploadSitemapIndex(totalFiles);

    // Update metadata
    await ctx.runMutation(internal.sitemap.updateGlobalSitemapMetadata, {
      fileIndex,
      urlCount: sitemap.getUrlCount(),
      lastThreadId: lastId,
    });
  }
}

async function fullRegeneration(ctx: ActionCtx, totalCount: number) {
  const numSitemaps = Math.ceil(totalCount / MAX_URLS_PER_SITEMAP);
  console.log(`Generating ${numSitemaps} sitemap files...`);

  let cursor: string | undefined;
  let lastThreadId = 0n;
  let fileIndex = 0;

  while (true) {
    const result = await ctx.runQuery(internal.sitemap.getGlobalThreadsPage, {
      cursor,
      limit: MAX_URLS_PER_SITEMAP,
    });

    if (result.page.length === 0) break;

    const sitemap = new Sitemap();

    for (const thread of result.page) {
      sitemap.addUrl(`https://www.answeroverflow.com/m/${thread.id}`, {
        lastmod: thread.archivedTimestamp
          ? new Date(thread.archivedTimestamp)
          : getDateFromSnowflake(thread.id),
        priority: 0.9,
      });

      lastThreadId = thread.id;
    }

    console.log(
      `Uploading sitemap ${fileIndex} with ${sitemap.getUrlCount()} URLs`
    );
    await uploadSitemapToS3(fileIndex, sitemap);

    if (result.isDone) break;

    cursor = result.continueCursor;
    fileIndex++;
  }

  const totalFiles = fileIndex + 1;

  // Upload sitemap index
  console.log(`Uploading sitemap index with ${totalFiles} files`);
  await uploadSitemapIndex(totalFiles);

  // Update metadata
  await ctx.runMutation(internal.sitemap.updateGlobalSitemapMetadata, {
    fileIndex: fileIndex,
    urlCount: totalCount % MAX_URLS_PER_SITEMAP || MAX_URLS_PER_SITEMAP,
    lastThreadId,
  });
}
```

---

### Phase 4: Cron Job & API Routes (Day 4)

**Goals**: Schedule daily generation and serve sitemaps

#### 4.1 Register Cron

**File**: `packages/database/convex/crons.ts`

```typescript
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Daily at 1 AM PST (9 AM UTC)
crons.interval(
  "generate-global-sitemaps",
  { hours: 24 },
  internal.sitemap.generateGlobalSitemaps,
  { forceFullRegeneration: false }
);

export default crons;
```

#### 4.2 Global Sitemap Index Route

**File**: `apps/main-site/src/app/sitemap.xml/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // Redirect to S3-hosted sitemap index
  const s3Url = `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/sitemaps/sitemap.xml`;

  return NextResponse.redirect(s3Url, { status: 301 });
}
```

#### 4.3 Individual Sitemap Routes

These will be handled by Next.js rewrites in `next.config.ts` (already configured to rewrite `/sitemap*.xml` to S3).

#### 4.4 Community Sitemap Route

**File**: `apps/main-site/src/app/c/[serverId]/sitemap.xml/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@packages/database";
import { Sitemap } from "@packages/ui/lib/sitemap";
import { getDateFromSnowflake } from "@packages/database-utils/snowflakes";

export async function GET(
  req: NextRequest,
  { params }: { params: { serverId: string } }
) {
  try {
    const serverId = BigInt(params.serverId);

    // Fetch threads for this community
    const threads = await fetchQuery(api.sitemap.getCommunityThreads, {
      serverId,
    });

    // Build sitemap
    const sitemap = new Sitemap();

    for (const thread of threads) {
      sitemap.addUrl(`https://www.answeroverflow.com/m/${thread.id}`, {
        lastmod: thread.archivedTimestamp
          ? new Date(thread.archivedTimestamp)
          : getDateFromSnowflake(thread.id),
        priority: 0.9,
      });
    }

    // Add community home page
    sitemap.addUrl(`https://www.answeroverflow.com/c/${serverId}`, {
      priority: 0.8,
    });

    return new NextResponse(sitemap.toString(), {
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=21600, s-maxage=86400",
      },
    });
  } catch (error) {
    console.error("Error generating community sitemap:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
```

#### 4.5 Custom Domain Sitemap Route

**File**: `apps/main-site/src/app/[domain]/sitemap.xml/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@packages/database";
import { Sitemap } from "@packages/ui/lib/sitemap";
import { getDateFromSnowflake } from "@packages/database-utils/snowflakes";

export async function GET(
  req: NextRequest,
  { params }: { params: { domain: string } }
) {
  try {
    // Look up server by custom domain
    const server = await fetchQuery(api.servers.getServerByCustomDomain, {
      customDomain: params.domain,
    });

    if (!server) {
      return new NextResponse("Not Found", { status: 404 });
    }

    // Ensure server is not kicked (getServerByCustomDomain should handle this)
    if (server.kickedTime) {
      return new NextResponse("Not Found", { status: 404 });
    }

    // Fetch threads for this community
    const threads = await fetchQuery(api.sitemap.getCommunityThreads, {
      serverId: server.discordId,
    });

    // Build sitemap
    const sitemap = new Sitemap();

    for (const thread of threads) {
      sitemap.addUrl(`https://${params.domain}/m/${thread.id}`, {
        lastmod: thread.archivedTimestamp
          ? new Date(thread.archivedTimestamp)
          : getDateFromSnowflake(thread.id),
        priority: 0.9,
      });
    }

    return new NextResponse(sitemap.toString(), {
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=21600, s-maxage=86400",
      },
    });
  } catch (error) {
    console.error("Error generating custom domain sitemap:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
```

#### 4.6 Add Public Query

**File**: `packages/database/convex/public/sitemap.ts`

```typescript
import { v } from "convex/values";
import { publicQuery } from "./custom_functions";
import { channelSchema } from "../schema";
import { communitySitemapAggregate } from "../aggregates/sitemap";
import { COMMUNITY_SITEMAP_LIMIT } from "../shared/sitemapConstants";

export const getCommunityThreads = publicQuery({
  args: {
    serverId: v.int64(),
  },
  returns: v.array(channelSchema),
  handler: async (ctx, args) => {
    // Fetch all threads for community (up to 50k limit)
    const result = await communitySitemapAggregate.paginate(ctx, {
      namespace: args.serverId,
      numItems: COMMUNITY_SITEMAP_LIMIT,
    });

    if (!result.isDone) {
      console.warn(
        `Community ${args.serverId} has more than ${COMMUNITY_SITEMAP_LIMIT} threads - consider implementing pagination`
      );
    }

    return result.page;
  },
});
```
