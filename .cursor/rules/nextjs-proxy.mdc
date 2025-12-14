---
description: Understanding proxy.ts in Next.js 16+ (formerly middleware.ts)
globs: apps/main-site/**/*.ts,apps/main-site/**/*.tsx
---

# Next.js Proxy (formerly Middleware)

In Next.js 16 and higher, `middleware.ts` was renamed to `proxy.ts`, but it works the same way.

## Key Points

- **File name**: `proxy.ts` (or `proxy.js`) in the project root or `src/` directory
- **Runtime**: Runs in regular Node.js runtime (not Edge runtime)
- **Functionality**: Identical to previous `middleware.ts` - intercepts requests before they reach routes
- **Use cases**: Authentication, redirects, rewrites, headers modification, etc.

## Example

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  // Your proxy logic here
  return NextResponse.next();
}

export const config = {
  matcher: '/about/:path*',
};
```

## Notes

- The export name changed from `middleware` to `proxy`
- Configuration using `matcher` or conditional logic works the same
- Runs on every request that matches the configured paths
