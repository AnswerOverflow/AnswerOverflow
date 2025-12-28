# Confect Migration Status

## Completed

### 1. Vendored Confect Package
- Created `packages/confect/` by vendoring `@rjdellecese/confect`
- Converted path aliases to relative imports
- Added to workspace as `@packages/confect`

### 2. Fixed Effect Version Mismatch
- Added overrides in root `package.json`:
  ```json
  "overrides": {
    "effect": "^3.19.8",
    "@effect/platform": "^0.93.6"
  }
  ```

### 3. Unified Schema with Effect
- File: `packages/database/convex/schema.ts`
- Now uses Effect schemas with `Schema.Struct`, `Schema.BigIntFromSelf`, etc.
- Uses `Id.Id("_storage")` for storage IDs
- Exports both the confect schema and compiled validators

### 4. Fixed Readonly Array Type Issue
**Problem:** Effect Schema produces `readonly T[]` for arrays, but Convex's `GenericDataModel` expects mutable arrays (`Value[]`).

**Root Cause:** When `DataModelFromSchemaDefinition` extracts document types from validators, the Effect Schema's readonly arrays don't satisfy `GenericDocument = Record<string, Value>`.

**Solution:** Use `Schema.mutable` on array fields:
```typescript
embeds: Schema.optional(Schema.Array(EmbedSchema).pipe(Schema.mutable)),
stickers: Schema.optional(Schema.Array(StickerSchema).pipe(Schema.mutable)),
availableTags: Schema.optional(Schema.Array(ForumTagSchema).pipe(Schema.mutable)),
fields: Schema.optional(Schema.Array(EmbedFieldSchema).pipe(Schema.mutable)),
```

### 5. Fixed publicSchemas.ts Validator Access
**Problem:** `compileSchema()` returns `VAny` for complex schemas (hits type depth limit), which doesn't have `.fields` property.

**Solution:** Defined native Convex validators directly in `publicSchemas.ts`:
- Created local field definitions (`channelFields`, `serverFields`, `messageFields`, etc.)
- Used `v.object()` with spread syntax to build validators with system fields
- This avoids the complexity of `compileSchema` for validators that need `.fields`

### 6. Simplified Triggers.ts
**Problem:** The `Triggers` class from convex-helpers requires `DataModel extends GenericDataModel`, which failed due to readonly arrays.

**Current State:** Temporarily disabled triggers (simplified to just re-export raw mutations). Triggers need to be re-enabled once we verify the mutable arrays fix works in production.

### 7. Removed CustomBuilder Type Mismatch Issue
**Problem:** `customMutation` from convex-helpers returns `CustomBuilder` type which isn't assignable to `MutationBuilder` in confect.

**Solution:** Removed the custom mutation builders from `makeFunctions()` call in `confect.ts`. The default Convex mutations are used instead.

### 8. Created Function Constructors & Context Tags
- File: `packages/database/convex/confect.ts`
- Exports function constructors: `query`, `mutation`, `action`, `internalQuery`, `internalMutation`, `internalAction`
- Exports typed context tags: `ConfectQueryCtx`, `ConfectMutationCtx`, `ConfectActionCtx`
- Exports type helper: `ConfectDoc<TableName>`

### 9. Created Example Functions
- File: `packages/database/convex/examples/confect-example.ts`
- Shows how to use confect for queries and mutations

### 10. Migrated Internal Functions to Confect

**Files migrated:**

1. **`convex/internal/rateLimiter.ts`** - Rate limiter internal mutations
   - `checkGitHubCreateIssue` - Rate limits GitHub issue creation
   - `checkGitHubFetchRepos` - Rate limits GitHub repo fetching

2. **`convex/stripe/internal.ts`** - Stripe-related internal functions
   - `getServerForStripe` - Query server with Stripe info
   - `updateServerStripeCustomer` - Mutation to update Stripe customer
   - `updateServerSubscription` - Mutation to update subscription

3. **`convex/private/github.ts`** - GitHub issue record creation
   - `createGitHubIssueRecordInternal` - Internal mutation to create GitHub issue records

4. **`convex/admin/findThreadsMissingRootMessagePage.ts`** - Admin pagination query
   - `findThreadsMissingRootMessagePage` - Paginated query to find threads missing root messages
   - Uses confect's pagination support with Effect-based db queries
   - Demonstrates mixing confect db with convex-helpers (`getOneFrom`)

5. **`convex/private/server_preferences.ts`** - Server preferences query
   - `getServerPreferencesByCustomDomain` - Internal query to fetch preferences by custom domain

### 11. Added PaginationOpts Schema
- File: `packages/confect/src/server/schemas/PaginationOpts.ts`
- Provides Effect schema for Convex pagination options
- Exported from `@packages/confect/server` as `PaginationOpts.PaginationOpts`

### 12. Added runQuery/runMutation to Confect Contexts
- File: `packages/confect/src/server/ctx.ts`
- `ConfectQueryCtx` now has `runQuery` method
- `ConfectMutationCtx` now has `runQuery` and `runMutation` methods
- These are Effect-wrapped methods that can be yielded in Effect.gen blocks
- Returns `Effect.Effect<T>` instead of `Promise<T>`

### 13. Added success/error Specs to Query and Mutation
- File: `packages/confect/src/server/functions.ts`
- Query and mutation now support the `{ args, success, error, handler }` signature (like actions)
- Added function overloads and helper functions:
  - `confectQueryFunctionWithResult`
  - `confectMutationFunctionWithResult`
- This enables typed error handling in public API functions

### 14. Created Authenticated Function Wrappers
- File: `packages/database/convex/client/confectAuthenticated.ts`
- `authenticatedQuery`, `authenticatedMutation`, `authenticatedAction`
- Automatically check auth and provide `AuthenticatedUser` Effect service
- User can be accessed via `yield* AuthenticatedUser` instead of prop drilling ctx
- Exports:
  - `AuthenticatedUser` - Context.Tag for accessing authenticated user
  - `NotAuthenticatedError` - Error type for unauthenticated requests
  - `NotAuthenticatedErrorSchema` - Schema for error serialization
  - `UserSchema` - Schema for user data

### 15. Added getGitHubAccountByUserIdOrFail
- File: `packages/database/convex/shared/auth/github.ts`
- New function that fails with `GitHubNotLinkedError` instead of returning `Option`
- Useful when you need to ensure GitHub is linked

### 16. Refactored GitHub Repo Fetching
- File: `packages/database/convex/shared/auth/github.ts`
- Split the while loop into:
  - `fetchInstallationReposPage` - Fetches a single page of repos
  - `fetchAllInstallationRepos` - Fetches all repos for an installation
- Cleaner separation of concerns

### 17. Added onExcessProperty: "ignore" to Schemas
- Updated `RawGitHubAccountSchema`, `AccountWithUserIdSchema`, `GitHubTokenRefreshResponseSchema`, `UserSchema`
- Ensures graceful parsing when extra properties exist in responses

### 18. Created @packages/github-api Package
- File: `packages/github-api/`
- Effect-based generated client to replace Octokit
- Uses `@tim-smart/openapi-gen` like the Discord API package
- Structure:
  - `open-api.json` - Minimal subset of GitHub's OpenAPI spec
  - `scripts/sync-openapi.ts` - Fetches and extracts needed endpoints
  - `src/generated.ts` - Generated Effect-based API client
- Endpoints included:
  - `appsListInstallationsForAuthenticatedUser`
  - `appsListInstallationReposForAuthenticatedUser`
  - `issuesListForRepo`
  - `issuesCreate`

### 19. Updated authenticated/github.ts
- Uses the new `authenticatedAction` wrapper
- Uses `AuthenticatedUser` service for auth context

### 20. Replaced Octokit with Generated GitHub API Client
- Replaced `octokit` package with generated Effect-based client from `@packages/github-api`
- `createOctokitClient` → `createGitHubClient` - Returns Effect-based `Client` instead of `Octokit`
- Updated all callers:
  - `convex/authenticated/github.ts`
  - `convex/private/github.ts`
  - `convex/shared/github.ts` (re-exports)
- Uses `@effect/platform` `HttpClient` with `FetchHttpClient.layer`
- Auth token injected via `HttpClient.mapRequest` with `Authorization: token ${accessToken}`
- Removed `octokit` and `@octokit/auth-oauth-user` dependencies
- Added `@packages/github-api` as a dependency

## Usage Patterns

### Query Example
```typescript
import { Effect, Schema } from "effect";
import { ConfectQueryCtx, query } from "./confect";
import { ServerSchema } from "./schema";

export const getServerByDiscordId = query({
  args: Schema.Struct({
    discordId: Schema.BigIntFromSelf,
  }),
  returns: Schema.Option(ServerSchema),
  handler: ({ discordId }) =>
    Effect.gen(function* () {
      const { db } = yield* ConfectQueryCtx;
      return yield* db
        .query("servers")
        .withIndex("by_discordId", (q) => q.eq("discordId", discordId))
        .first();
    }),
});
```

### Mutation Example (with automatic trigger support)
```typescript
import { Effect, Schema } from "effect";
import { ConfectMutationCtx, internalMutation } from "./confect";

export const deleteMessageById = internalMutation({
  args: Schema.Struct({
    id: Schema.BigIntFromSelf,
  }),
  returns: Schema.Null,
  handler: ({ id }) =>
    Effect.gen(function* () {
      const { db } = yield* ConfectMutationCtx;
      const message = yield* db
        .query("messages")
        .withIndex("by_messageId", (q) => q.eq("id", id))
        .first();

      if (message._tag === "Some") {
        yield* db.delete(message.value._id);
      }

      return null;
    }),
});
```

### Authenticated Action Example
```typescript
import { Effect, Schema } from "effect";
import { authenticatedAction, AuthenticatedUser, ConfectActionCtx } from "./client/confectAuthenticated";
import { GitHubRepoSchema } from "./shared/auth/github";

export const getAccessibleRepos = authenticatedAction({
  args: Schema.Struct({}),
  success: Schema.Array(GitHubRepoSchema),
  error: GetAccessibleReposErrorSchema,
  handler: () =>
    Effect.gen(function* () {
      const user = yield* AuthenticatedUser;
      const { ctx } = yield* ConfectActionCtx;
      // user._id is available here
      // ...
    }),
});
```

## Migration Strategy

### For New Functions
Use confect pattern for all new Convex functions. They automatically get:
- Effect-based handlers with proper error handling
- Type-safe database access

### For Existing Functions
1. **Gradual migration** - Convert functions incrementally, starting with simple internal functions
2. **Keep existing wrappers** - Don't replace custom function wrappers (`privateQuery`, `publicQuery`, etc.) yet
3. **Refactor shared logic** - Move business logic to Effect-based shared functions

### 21. Re-enabled Triggers with Mutable Array Fix
- The `Schema.mutable` fix on array fields resolved the `GenericDataModel` constraint issue
- Triggers now work correctly with the DataModel
- Both "messages" and "channels" tables have trigger registration for count tracking

### 22. Created Private Function Wrappers
- File: `packages/database/convex/client/confectPrivate.ts`
- `privateQuery`, `privateMutation`, `privateAction` - Wrappers that validate `backendAccessToken`
- Provides `ConfectQueryCtx`, `ConfectMutationCtx`, `ConfectActionCtx` with both `ctx` (raw Convex) and `db` (confect)
- Returns typed `RegisteredQuery`, `RegisteredMutation`, `RegisteredAction` for proper inference

### 23. Migrated Private Functions to Confect

**Fully Migrated:**
1. **`private/servers.ts`** - Server CRUD operations
2. **`private/discord_accounts.ts`** - Discord account operations  
3. **`private/user_server_settings.ts`** - User server settings
4. **`private/ignored_discord_accounts.ts`** - Ignored accounts
5. **`private/threadTags.ts`** - Thread tag operations
6. **`private/cache.ts`** - Cache-related operations
7. **`private/channels.ts`** - Channel CRUD and settings
8. **`private/github.ts`** - GitHub issue records
9. **`private/server_preferences.ts`** - Server preferences

**Not Migrated (keeping old pattern):**
1. **`private/messages.ts`** - Uses `ctx.cache` (not available in confect) and complex shared functions expecting mutable arrays
2. **`private/attachments.ts`** - Uses `ctx.runMutation(api.private.*)` which creates circular type inference issues
3. **`private/counts.ts`** - Just exports aggregates, no functions to migrate

### 24. Created Public Function Wrapper with Cache Support
- File: `packages/database/convex/client/confectPublic.ts`
- `publicQuery`, `publicMutation`, `publicAction` - Wrappers that handle public auth args
- Provides `DataCache` Effect service for accessing the data cache
- Handles optional `publicBackendAccessToken`, `backendAccessToken`, `discordAccountId`, etc.

### 25. Migrated Public Functions to Confect

**Fully Migrated:**
1. **`public/servers.ts`** - All three query functions migrated:
   - `getServerByDomain` - Get server by custom domain
   - `getBrowseServers` - List browseable servers
   - `getServerByDiscordIdWithChannels` - Get server with indexed channels
2. **`public/threadTags.ts`** - Thread tag queries
3. **`public/discord_accounts.ts`** - Discord account queries
4. **`public/channels.ts`** - All channel queries with cache support:
   - `getChannelPageThreads` - Paginated threads for a channel
   - `getServerPageThreads` - Paginated threads for a server
   - `getCommunityPageHeaderData` - Header data for community pages
5. **`public/messages.ts`** - Message queries with cache support:
   - `getMessages` - Paginated messages for a channel
   - `getMessagePageHeaderData` - Header data for message pages

**Partially Migrated:**
1. **`public/search.ts`** - Public queries use confect, internal queries/actions kept old pattern

**Not Yet Migrated:**
1. **`authenticated/*`** - Dashboard, stripe, admin functions

## Key Files
- `packages/confect/` - Vendored confect package
- `packages/database/convex/schema.ts` - Unified Effect-based schema
- `packages/database/convex/confect.ts` - Function constructors & context tags
- `packages/database/convex/client/confectAuthenticated.ts` - Authenticated function wrappers
- `packages/database/convex/client/confectPrivate.ts` - Private function wrappers with backend token validation
- `packages/database/convex/client/confectPublic.ts` - Public function wrappers with cache support
- `packages/database/convex/examples/confect-example.ts` - Example usage
- `packages/database/convex/triggers.ts` - Trigger system for count tracking (currently simplified)
- `packages/database/convex/shared/publicSchemas.ts` - Native Convex validators for public APIs
- `packages/github-api/` - Generated Effect-based GitHub API client

## Technical Notes

### Schema.mutable for Array Fields
Effect Schema's arrays are readonly by default. Use `Schema.mutable` to make them mutable:
```typescript
Schema.Array(ItemSchema).pipe(Schema.mutable)
```

### ValueToValidator Depth Limits
The `ValueToValidator` type has a depth limit of 6 to prevent TypeScript from hitting complexity limits. Complex nested schemas may fall back to `VAny`. For such cases:
1. Use native Convex validators (`v.*`) directly
2. Or simplify the schema structure

### Mixing Confect with Raw Convex Context
When migrating functions that call shared helper functions expecting raw Convex types:
```typescript
const { ctx, db } = yield* ConfectQueryCtx;
const result = yield* Effect.promise(() =>
  someSharedFunction(ctx, args)  // ctx is raw QueryCtx
);
```

### Schema.Array Readonly Issue
Effect Schema produces `readonly T[]` for arrays. This doesn't match mutable `T[]` expected by:
- Some shared functions like `upsertManyMessagesOptimized`
- Functions that modify arrays in place

**Workarounds:**
1. Use spread operator: `[...array]` when passing to functions expecting mutable
2. Update shared functions to accept `ReadonlyArray<T>`
3. Use `Schema.mutable` on the array schema

### Cache Dependency - RESOLVED
Cache is now available via the `DataCache` Effect service in `confectPublic.ts`. Use:
```typescript
const ctxWithCache = yield* getQueryCtxWithCache;
// ctxWithCache has both ctx and cache properties
```

### Circular API References in Actions
Actions that use `ctx.runMutation(api.private.*)` create circular type inference issues with confect because:
- The API types are generated from the functions
- The functions depend on the API types for the runMutation calls

### 26. Migrated Authenticated Functions (Partial)

**Fully Migrated:**
1. **`authenticated/discord_token.ts`** - Token refresh logic:
   - `updateAccountTokens` - Internal mutation to update OAuth tokens
   - `refreshAndGetValidToken` - Internal action to refresh Discord tokens
   - Uses Effect.gen with proper error handling via DiscordTokenError

2. **`authenticated/vercel_domains.ts`** - Vercel domain management:
   - `getDomainStatus` - Check domain verification status
   - `addDomain` - Add domain to Vercel project
   - Uses authenticatedAction wrapper

**Not Yet Migrated (need custom confect wrappers):**
1. **`authenticated/dashboard.ts`** - Uses guildManagerAction, manageGuildAction
2. **`authenticated/dashboard_queries.ts`** - Uses guildManagerQuery, authenticatedQuery
3. **`authenticated/dashboard_mutations.ts`** - Uses guildManagerMutation
4. **`authenticated/stripe.ts`** - Uses manageGuildAction
5. **`authenticated/admin.ts`** - Uses adminQuery (needs admin wrapper)

## Next Steps
1. ~~Create `confectPublic.ts` wrapper that adds cache support~~ ✅ Done
2. ~~Continue migrating public functions~~ ✅ Done (channels, messages migrated)
3. ~~Migrate simple authenticated functions~~ ✅ Done (discord_token, vercel_domains)
4. Create confect versions of guildManager wrappers
5. Migrate dashboard and stripe functions
6. Consider updating shared functions to accept readonly arrays
