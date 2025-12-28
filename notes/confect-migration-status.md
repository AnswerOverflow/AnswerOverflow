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

## Key Files
- `packages/confect/` - Vendored confect package
- `packages/database/convex/schema.ts` - Unified Effect-based schema
- `packages/database/convex/confect.ts` - Function constructors & context tags
- `packages/database/convex/client/confectAuthenticated.ts` - Authenticated function wrappers
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
