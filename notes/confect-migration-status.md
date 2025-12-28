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

### 3. Created Confect Schema
- File: `packages/database/convex/confectSchema.ts`
- Defines Effect schemas for all tables using `Schema.Struct`, `Schema.BigIntFromSelf`, etc.
- Uses `Id.Id("_storage")` for storage IDs

### 4. Fixed Type Extraction Bug
**Problem:** Complex nested schemas (like MessageSchema with deeply nested EmbedSchema) caused TypeScript to fail extracting field paths for indexes.

**Root Cause:** When schemas have too many nested optional structs with many fields, the `ValueToValidator` type evaluation hits TypeScript's complexity limits, causing it to resolve to `VAny` which only has `"_creationTime"` as fieldPaths.

**Solution:** Simplified the embed-related schemas in confectSchema.ts:
- Reduced fields in EmbedFooterSchema, EmbedImageSchema, etc.
- Removed storage ID fields from nested embed structs
- This allows TypeScript to properly compute the validator types

**Trade-off:** Some schema fidelity is lost for embeds, but:
- Runtime validation still works via Convex's native validators in `schema.ts`
- Embeds are never used in indexes anyway
- The simplified schema is sufficient for type-safe access patterns

### 5. Created Function Constructors & Context Tags
- File: `packages/database/convex/confect.ts`
- Exports function constructors: `query`, `mutation`, `action`, `internalQuery`, `internalMutation`, `internalAction`
- Exports typed context tags: `ConfectQueryCtx`, `ConfectMutationCtx`, `ConfectActionCtx`
- Exports type helper: `ConfectDoc<TableName>`

### 6. Integrated Triggers with Confect
- Modified vendored confect to accept custom mutation builders via `MakeFunctionsOptions`
- `confect.ts` now uses trigger-wrapped mutations:
  ```typescript
  import { mutation as triggerMutation, internalMutation as triggerInternalMutation } from "./triggers";
  
  export const { mutation, internalMutation, ... } = makeFunctions(confectSchema, {
    mutationBuilder: triggerMutation,
    internalMutationBuilder: triggerInternalMutation,
  });
  ```
- This means all confect mutations automatically trigger count updates for messages and channels

### 7. Created Example Functions
- File: `packages/database/convex/examples/confect-example.ts`
- Shows how to use confect for queries and mutations

### 8. Migrated Internal Functions to Confect

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

### 9. Added PaginationOpts Schema
- File: `packages/confect/src/server/schemas/PaginationOpts.ts`
- Provides Effect schema for Convex pagination options
- Exported from `@packages/confect/server` as `PaginationOpts.PaginationOpts`

### 10. Added runQuery/runMutation to Confect Contexts
- File: `packages/confect/src/server/ctx.ts`
- `ConfectQueryCtx` now has `runQuery` method
- `ConfectMutationCtx` now has `runQuery` and `runMutation` methods
- These are Effect-wrapped methods that can be yielded in Effect.gen blocks
- Returns `Effect.Effect<T>` instead of `Promise<T>`

### 11. Added success/error Specs to Query and Mutation
- File: `packages/confect/src/server/functions.ts`
- Query and mutation now support the `{ args, success, error, handler }` signature (like actions)
- Added function overloads and helper functions:
  - `confectQueryFunctionWithResult`
  - `confectMutationFunctionWithResult`
- This enables typed error handling in public API functions

### 12. Created Authenticated Function Wrappers
- File: `packages/database/convex/client/confectAuthenticated.ts`
- `authenticatedQuery`, `authenticatedMutation`, `authenticatedAction`
- Automatically check auth and provide `AuthenticatedUser` Effect service
- User can be accessed via `yield* AuthenticatedUser` instead of prop drilling ctx
- Exports:
  - `AuthenticatedUser` - Context.Tag for accessing authenticated user
  - `NotAuthenticatedError` - Error type for unauthenticated requests
  - `NotAuthenticatedErrorSchema` - Schema for error serialization
  - `UserSchema` - Schema for user data

### 13. Added getGitHubAccountByUserIdOrFail
- File: `packages/database/convex/shared/auth/github.ts`
- New function that fails with `GitHubNotLinkedError` instead of returning `Option`
- Useful when you need to ensure GitHub is linked

### 14. Refactored GitHub Repo Fetching
- File: `packages/database/convex/shared/auth/github.ts`
- Split the while loop into:
  - `fetchInstallationReposPage` - Fetches a single page of repos
  - `fetchAllInstallationRepos` - Fetches all repos for an installation
- Cleaner separation of concerns

### 15. Added onExcessProperty: "ignore" to Schemas
- Updated `RawGitHubAccountSchema`, `AccountWithUserIdSchema`, `GitHubTokenRefreshResponseSchema`, `UserSchema`
- Ensures graceful parsing when extra properties exist in responses

### 16. Created @packages/github-api Package
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

### 17. Updated authenticated/github.ts
- Uses the new `authenticatedAction` wrapper
- Uses `AuthenticatedUser` service for auth context

## Usage Patterns

### Query Example
```typescript
import { Effect, Schema } from "effect";
import { ConfectQueryCtx, query } from "./confect";
import { ServerSchema } from "./confectSchema";

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
- Trigger support for count tracking

### For Existing Functions
1. **Gradual migration** - Convert functions incrementally, starting with simple internal functions
2. **Keep existing wrappers** - Don't replace custom function wrappers (`privateQuery`, `publicQuery`, etc.) yet
3. **Refactor shared logic** - Move business logic to Effect-based shared functions

### 18. Replaced Octokit with Generated GitHub API Client ✅
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

## Future Work

### Create confect-based versions of custom wrappers that:
- Integrate with Effect for error handling
- Provide data access cache as an Effect service
- Handle authentication and rate limiting as Effects

## Key Files
- `packages/confect/` - Vendored confect package (modified to support custom mutation builders)
- `packages/database/convex/confectSchema.ts` - Effect-based schema
- `packages/database/convex/confect.ts` - Function constructors & context tags (with trigger integration)
- `packages/database/convex/client/confectAuthenticated.ts` - Authenticated function wrappers
- `packages/database/convex/examples/confect-example.ts` - Example usage
- `packages/database/convex/schema.ts` - Original Convex schema (kept for runtime validation)
- `packages/database/convex/triggers.ts` - Trigger system for count tracking
- `packages/github-api/` - Generated Effect-based GitHub API client
