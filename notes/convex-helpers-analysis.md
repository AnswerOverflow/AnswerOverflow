# Convex-Helpers Analysis

## Summary Table

| Helper | Value | Why |
|--------|-------|-----|
| **Custom Functions** | ✅ High | Already using them! But could tighten further - repeated auth checks, backend token fetching, permission verification still scattered across handlers. |
| **Triggers** | ✅ High | Cascading deletes and denormalization logic is manually repeated across 5+ places (message→attachments/reactions, channel→threads, account→messages). Would centralize invariants. |
| **QueryStreams** | ✅ High | Thread timelines, user feeds, recent threads all hand-roll unions/joins with post-filter pagination causing sparse pages. Would simplify and stabilize pagination. |
| **Row-Level Security** | ✅ High | Permission checks scattered in wrappers and handlers. Message visibility logic (`isMessagePublic`) reimplemented ad-hoc. RLS would centralize and prevent accidental data leaks. |
| **Rate Limiting** | ✅ High | **No rate limiting exists today.** `publicSearch`, user listings, webhooks all exposed. `rateLimitKey: "testing"` is a placeholder that does nothing. Use the newer component. |
| **Query Caching** | ✅ High | Dashboard queries re-fetch on every route change causing loading flashes. `getDashboardData` and `getUserServersForDropdown` would benefit most. |
| **Action Retries** | ✅ High | Discord API calls, Stripe webhooks, Vercel domains, attachment downloads have no retry/backoff. Transient failures just fail. Use the newer `action-retrier` component. |
| **Manual Pagination** | 🟡 Medium | Current pagination shrinks pages after filtering (sparse pages UX). Would help `publicSearch`, `getUserPosts`, `getUserComments`. |
| **Filter** | 🟡 Medium | Multiple queries `.collect()` then filter in JS. `getUserPageData` loads ALL user messages. Would help but some need better indexes. |
| **Validator Utilities** | 🟡 Medium | 6+ `v.union(x, v.null())` patterns, repeated literal unions (`signed-in/anonymous/admin`), duplicate `serverPreferences` validator. Would reduce boilerplate. |
| **CORS HttpRouter** | 🟡 Medium-High | No CORS handling on Convex HTTP routes. Better Auth endpoints need it for browser access. Stripe webhook should stay locked down. |
| **Hono Integration** | 🟡 Medium | Only one custom endpoint today (`/stripe/webhook`). If HTTP surface grows, Hono would help with middleware/routing. Not urgent. |

## Top Priority Actions

### 1. Rate Limiting (Critical Security Gap)
Implement the `rate-limiter` component for `publicSearch`, user listings, and webhooks immediately.

### 2. Triggers
Would eliminate the repeated cascade/denormalization code in:
- `shared/messages.ts` (delete attachments/reactions)
- `shared/channels.ts` (cascade thread deletion)
- `private/discord_accounts.ts` (cascade user data deletion)
- `private/user_server_settings.ts` (indexing disabled → delete messages)

### 3. QueryStreams
Would simplify and fix pagination for:
- Thread timelines (union of channel messages + thread starters)
- User feeds (posts + comments with consistent pagination)
- Recent threads (channels → first messages with stable page sizes)

### 4. Query Caching
Quick win for dashboard UX. Wrap `useAuthenticatedQuery` with cached variant.

### 5. Action Retries
Add the `action-retrier` component for Discord API calls, webhook processing, attachment downloads.

## Already Working Well

- **Custom Functions** - Already have `publicQuery`, `privateQuery`, `authenticatedQuery`, `guildManagerQuery` etc. Just need to push more context into wrappers.
- **Relationship helpers** - Already preferred per cursor rules.

---

## Detailed Findings

### Custom Functions

**Current State:** Already using custom wrappers:
- `publicQuery/publicMutation/publicAction` in `packages/database/convex/public/custom_functions.ts`
- `privateQuery/privateMutation/privateAction` in `packages/database/convex/client/private.ts`
- `authenticatedQuery/authenticatedMutation/authenticatedAction` in `packages/database/convex/client/authenticated.ts`
- `guildManagerQuery/guildManagerMutation/guildManagerAction` in `packages/database/convex/client/guildManager.ts`

**Remaining Issues:**
- Discord account presence checks still occur inside handlers even after wrappers inject IDs
- Backend access token fetching repeated in several handlers instead of injected once
- Permission checks for manage/admin reimplemented in multiple places
- `rateLimitKey` hardcoded to `"testing"` and never enforced
- Error messaging inconsistent across handlers

**Improvements:**
- Extend `authenticated*`/`guildManager*` wrappers to return validated Discord account/token
- Add optional permission hooks (e.g., `requiresManageGuild`)
- Provide backend token helper on ctx
- Standardize error surface

### Triggers

**Current Manual Cascade Patterns:**
- Message delete → attachments + reactions (`shared/messages.ts:145-184`)
- Message upsert → attachments/reactions cleared and re-inserted (`shared/messages.ts:186-277`)
- Channel delete → recursive thread deletion + channelSettings (`shared/channels.ts:68-100`)
- UserServerSettings `messageIndexingDisabled` toggle → delete all user's messages (`private/user_server_settings.ts:80-155`)
- Discord account delete → account + ignored marker + all messages + user-server settings (`private/discord_accounts.ts:87-121`)

**Benefits:**
- Register on `messages` delete to auto-remove attachments/reactions
- Register on `channels` delete to cascade to channelSettings and child threads
- Register on `userServerSettings` update to handle side effects atomically
- Could populate derived counters at write time

### QueryStreams

**Current Complex Query Patterns:**
- `private/messages.ts:333-388`: Thread view merges channel messages + thread-starters, sorts in JS
- `public/search.ts:124-239`: Paginates author messages, filters posts vs comments post-pagination
- `public/search.ts:51-96`: Paginates thread channels, fetches first messages, enriches
- `public/search.ts:288-395`: Loads ALL messages for a user, sorts in memory

**Benefits:**
- Unified thread timelines with `mergedStream`
- User activity feeds with stable pagination
- Recent threads feed without post-filter shrinkage
- Pagination happens after filtering, so page sizes are predictable

### Row-Level Security

**Current Permission Patterns:**
- `privateQuery/mutation/action` enforce `BACKEND_ACCESS_TOKEN`
- `guildManagerQuery/mutation/action` load Discord account, require membership, mutations require ManageGuild/Admin
- Message visibility enforced ad-hoc in `dataAccess.enrichMessage`
- Roles/permissions stored as Discord bitfields in `userServerSettings.permissions`

**Tables Needing Access Control:**
- `messages`, `attachments`, `reactions` - read based on public/membership
- `servers`, `serverPreferences`, `channelSettings`, `userServerSettings`, `channels` - modify requires ManageGuild/Admin or backend token

**Benefits:**
- Guard reads by default with `defaultPolicy: "deny"`
- Ownership-enforced writes
- Per-server visibility rules
- Reduce risk from new functions using raw `ctx.db`

### Rate Limiting

**Current State:** None. `rateLimitKey: "testing"` placeholder does nothing.

**Abuse Risks:**
- `publicSearch`, `getRecentThreads`, user message listings can be hammered
- `/api/v1/webhooks/convex` is unauthenticated
- Stripe webhook could be flooded
- Dev auth endpoints exposed

**Implementation:**
- Use newer `rate-limiter` component
- Key by signed-in user id, anonymous session id, or IP fallback
- Apply to search (5-10 req/5s), listings, webhooks

### Query Caching

**Current State:** `useAuthenticatedQuery` wraps Convex `useQuery`, no caching layer.

**Reused Queries:**
- `getUserServersForDropdown` in dashboard layout
- `getDashboardData` across multiple dashboard routes

**Problem:** Users navigate `/dashboard/[serverId]` → `/channels` → `/settings` and each remounts, re-subscribes, shows loading spinners.

**Benefits:**
- Keep subscriptions alive during navigation
- Instant cached data on back/forward
- Fewer redundant network round-trips

### Action Retries

**External Calls Without Retry:**
- Discord REST via Effect client (`fetchDiscordGuilds`, `syncUserServerSettingsBackground`)
- Stripe webhook handling (`handleStripeWebhook`)
- Stripe management (`createCheckoutSession`, `createBillingPortalSession`)
- Vercel domain management (`getDomainStatus`, `addDomain`)
- Attachment ingestion (`uploadAttachmentFromUrl`)

**Safe to Retry (Idempotent):**
- Discord guild fetch
- Background sync
- Stripe webhook (ensure idempotent mutations)
- Attachment downloads
- Vercel status checks

**Not Safe to Retry:**
- Stripe checkout/billing portal session creation (non-idempotent)

**Recommendation:** Use `action-retrier` component for idempotent paths.

### Manual Pagination

**Current Issues:**
- `publicSearch` paginates, filters, slices to 10, but keeps original cursor → sparse pages
- `getUserPosts`/`getUserComments` paginate by author, filter out items → sparse pages
- `getRecentThreads` paginates channels, enriches, drops items → sparse pages

**Benefits:**
- Fetch until N valid items after filtering
- Multiple paginations in one query
- Index range control for deterministic slices

### Filter

**Current Post-Collection Filtering:**
- `publicSearch` slices then filters by serverId
- `getUserPosts`/`getUserComments` filter by optional serverId and thread checks
- `getUserPageData` loads ALL messages, sorts in memory
- `getTotalMessageCount` collects entire `messages` table
- `getTopQuestionSolversByServerId` pulls all messages for server, filters

**Benefits:**
- Streaming filters reduce memory
- Keep pagination consistent
- Works when no index matches predicate

### Validator Utilities

**Current Patterns:**
- Nullability: `v.union(v.string(), v.null())` repeated 6+ times
- Literal unions: `"signed-in"/"anonymous"/"admin"` repeated 3 times
- Duplicate `serverPreferences` validator in `private/server_preferences.ts`

**Benefits:**
- `nullable()` shorthand
- `literals()` for unions
- `partial()/pick()/omit()` utilities
- `doc()` for document validators with system fields
- `typedV()` for typed table IDs

### CORS HttpRouter

**Current State:** `http.ts` has `/stripe/webhook` and Better Auth routes. No CORS handling.

**Needs:**
- Better Auth endpoints need CORS for browser access
- Stripe webhook should stay locked down
- Future integrations (Discord callbacks, widgets) would benefit

**Benefits:**
- Automatic OPTIONS preflight
- Centralized origin enforcement
- Per-route overrides

### Hono Integration

**Current State:** Only `/stripe/webhook` endpoint with inline error handling.

**When to Adopt:**
- If HTTP surface grows (multiple webhooks, REST endpoints, versioning)
- Need shared middleware (auth, rate limiting, structured errors)
- Current minimal surface doesn't urgently need it
