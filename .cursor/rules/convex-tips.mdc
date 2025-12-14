---
alwaysApply: true
globs: packages/database/convex/**/*.ts,packages/convex-test/convex/**/*.ts
---

# Convex Function Architecture Rules

**No Cross-Function Calls:** NEVER use `ctx.runQuery`, `ctx.runMutation`, or `ctx.runAction` between Convex functions.

**Instead:**
1. Extract shared logic to `shared.ts` functions
2. Call shared functions directly from Convex functions
3. Public API endpoints call shared functions internally

**Exception:** Actions MUST use `ctx.runQuery` for database access (Convex limitation).

**Shared Functions:**
- Location: `shared.ts`
- Accept: `QueryCtx | MutationCtx` (or `ActionCtx`)
- Pure database ops, no Convex wrappers
