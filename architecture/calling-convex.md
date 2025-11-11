# Notes on how we need to handle protecting access to convex functions:

In order to call a function outside of the Convex environment, it has to be public regardless of if it's just internal or not
Due to this, we need to be mindful about how functions are called
Keep all functions as public internal by default

## Language:

- Public means any Convex functions that are non internal
- User facing means any Convex functions that are meant to be called by the user
- Public internal means any Convex functions that are meant to be called by the backend but are public in order to be able to be called
- On permissions 'view the dashboard' means anyone with the 'Manage Guild' permission

## Code Structure:

- Use customFunctions (https://github.com/get-convex/convex-helpers) to make reusable logic (import { } from "convex-helpers/server/customFunctions";)
- Follow the rules of the convex_rules.mdc and convex-tips.mdc files when writing convex functions
- **For public internal functions** (functions called from backend but not dashboard/main site), use the reusable wrappers from `./publicInternal.ts`:
  - `publicInternalQuery` - for queries
  - `publicInternalMutation` - for mutations
  - `publicInternalAction` - for actions

## How to handle convex function calls that need to be made from backend to Convex:

The following applies to all public internal functions (functions not called from dashboard or main site)

- The backend sends a 'backendAccessToken' as part of the request args to the convex function
- The convex function validates the 'backendAccessToken' by comparing it to the 'BACKEND_ACCESS_TOKEN' environment variable
- If the 'backendAccessToken' is valid, the convex function proceeds with the request
- If the 'backendAccessToken' is invalid, the convex function throws an error

### Using the Public Internal Wrappers

Instead of manually checking the token in each function, use the reusable wrappers:

```typescript
import { publicInternalMutation } from "./publicInternal";

export const createServer = publicInternalMutation({
  args: {
    data: serverSchema,
  },
  handler: async (ctx, args) => {
    // args.data is available, backendAccessToken has been validated and removed
    return await ctx.db.insert("servers", args.data);
  },
});
```

When calling from the backend:

```typescript
await ctx.runMutation(api.servers.createServer, {
  backendAccessToken: process.env.BACKEND_ACCESS_TOKEN,
  data: serverData,
});
```

## Preventing abuse

- All public functions must have a signed in user calling them
- All public functions must have rate limits based on the user's id
