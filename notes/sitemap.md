# Sitemap Generation in Old Answer Overflow

> **Note**: This is reference documentation for the OLD codebase. See `new-sitemap.md` for the implementation plan for the rewrite using `@convex-dev/aggregate`.

## Overview

The sitemap system has two main parts:

1. **Global sitemap** - for the main site (answeroverflow.com)
2. **Per-community sitemaps** - for custom domains and community pages

## Global Sitemap Generation

**Location**: `packages/core/src/sitemap.ts`

**Process**:

1. **Data Collection** (`listPublicThreads`):

   - Fetches all public Discord threads in batches (50,000 limit per batch)
   - Filters threads where parent channels have `indexingEnabled` flag set
   - Excludes threads from servers with custom domains, subpaths, or that have been kicked
   - Fetches associated messages and server data

2. **Sitemap Generation** (`generateSitemap`):

   - Collects threads in chunks of 10,000
   - Creates individual sitemap files for each chunk (sitemap-0.xml, sitemap-1.xml, etc.)
   - Each entry includes:
     - URL: `/m/{threadId}`
     - Priority: 0.9
     - Last modified: Uses thread's `archivedTimestamp` or extracts date from Discord snowflake ID
   - Uploads sitemaps to S3 bucket at `sitemaps/sitemap-{i}.xml`
   - Creates a sitemap index file at `sitemaps/sitemap.xml` that references all individual sitemaps

3. **Scheduling** (`apps/discord-bot/src/listeners/events/sitemap-generator.ts`):
   - Runs as a cron job **daily at 1 AM PST**
   - Regenerates the global sitemap
   - Also caches per-server questions for sitemap generation

## Per-Community Sitemaps

**Locations**:

- `apps/main-site/src/pages/[domain]/sitemap.xml.ts` (custom domains)
- `apps/main-site/src/pages/c/[communityId]/sitemap.xml.ts` (community pages)

**Process**:

1. **Data Loading** (`findQuestionsForSitemap`):

   - Queries server with channels that have indexing enabled
   - Gets all threads under those channels
   - Fetches associated messages and checks privacy settings
   - Filters out messages from users who have privacy enabled
   - Respects server's "consider all messages public" flag

2. **Caching** (`cacheQuestionsForSitemap`):

   - Caches per-server sitemap data in Redis
   - Key: `questions:{serverId}`
   - Regenerated daily by the cron job

3. **Serving** (`generateCommunityPageSitemap`):
   - Loads cached sitemap data
   - Generates XML on-demand when `/sitemap.xml` is requested
   - Includes all thread URLs (`/m/{threadId}`)
   - For main site, also includes community page URL (`/c/{communityId}`)
   - Sets cache headers: 6-hour cache with 24-hour revalidation

## Key Components

**Sitemap Class** (`packages/utils/src/sitemap.ts`):

- Utility class for building sitemap XML
- Supports both `<urlset>` (regular sitemap) and `<sitemapindex>` (sitemap index)
- Enforces 50,000 entry limit per sitemap
- Generates proper XML with `<loc>`, `<lastmod>`, `<changefreq>`, and `<priority>` tags

**File Storage**:

- Sitemaps uploaded to AWS S3 bucket
- Path: `sitemaps/sitemap-{i}.xml` for individual sitemaps
- Path: `sitemaps/sitemap.xml` for the index

**Routing**:

- Uses Next.js Pages Router for dynamic sitemap routes
- Middleware handles custom domain routing
- Sitemap requests are matched in middleware config

## Data Flow

```
Discord Bot (Cron Job - Daily 1 AM PST)
  ↓
generateSitemap()
  ↓
listPublicThreads() → Filters & batches threads
  ↓
Creates XML sitemaps (10k entries each)
  ↓
Uploads to S3: sitemaps/sitemap-{i}.xml
  ↓
Creates index: sitemaps/sitemap.xml

---

User requests /{domain}/sitemap.xml
  ↓
Middleware routes to pages/[domain]/sitemap.xml.ts
  ↓
findQuestionsForSitemapCached() → Loads from Redis
  ↓
generateCommunityPageSitemap() → Builds XML
  ↓
Returns with cache headers (6hr cache, 24hr revalidate)
```

## Key Features

- **Privacy-aware**: Respects user privacy settings, excludes private messages
- **Scalable**: Chunks large sitemaps into multiple files
- **Cached**: Uses Redis to cache per-server sitemap data
- **Custom domains**: Generates separate sitemaps for servers with custom domains
- **Subpath support**: Handles servers with subpath routing
- **Date extraction**: Uses Discord snowflake IDs to extract creation timestamps

## Implementation Details

### Discord Snowflake Date Extraction

```typescript
const EPOCH = BigInt(1420070400000);
function getTimestamp(snowflake: string) {
  return Number((BigInt(snowflake) >> BigInt(22)) + EPOCH);
}
function getDate(snowflake: string) {
  return new Date(getTimestamp(snowflake));
}
```

### Sitemap XML Structure

Regular sitemap:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.answeroverflow.com/m/123456789</loc>
    <lastmod>2024-01-15T10:30:00.000Z</lastmod>
    <priority>0.9</priority>
  </url>
</urlset>
```

Sitemap index:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://www.answeroverflow.com/sitemap0.xml</loc>
  </sitemap>
</sitemapindex>
```

### Privacy Filtering Logic

- Checks `userServerSettings` for privacy flags
- Excludes messages from users with privacy enabled
- Respects server-wide "consider all messages public" setting
- Only includes threads from channels with indexing enabled

### Performance Optimizations

- Batches database queries (50,000 threads per batch)
- Uses database replicas for reads
- Caches per-server sitemap data in Redis
- Generates sitemaps asynchronously via cron job
- Sets aggressive CDN caching headers
