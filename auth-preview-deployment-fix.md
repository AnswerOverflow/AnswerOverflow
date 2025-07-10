# Auth Fix for Preview Deployments

## Problem
The authentication system was hardcoded to redirect to `app.answeroverflow.com` instead of dynamically determining the correct URL for preview deployments. This caused authentication to fail on preview deployments as users were redirected to the production domain instead of staying on the preview deployment.

## Root Cause
Several files contained hardcoded references to `https://app.answeroverflow.com`:

1. **`packages/api/src/router/dashboard.ts`** - Line 170: Hardcoded return URL for Stripe checkout
2. **`apps/main-site/next.config.mjs`** - Multiple redirect rules hardcoded to production URLs
3. **`apps/main-site/src/app/(main-site)/app-auth/page.tsx`** - Authentication redirect hardcoded to production
4. **`packages/ui/src/pages/MessageResultPage.tsx`** - "Add your server" button link hardcoded to production

## Solution
Replaced hardcoded URLs with dynamic URL generation that:

1. **Detects the deployment environment** using `NEXT_PUBLIC_DEPLOYMENT_ENV`
2. **Uses appropriate URLs for each environment:**
   - Local development: `http://localhost:3002`
   - Production: `https://app.answeroverflow.com`
   - Preview deployments: Uses `VERCEL_URL` or `NEXT_PUBLIC_VERCEL_URL` environment variables
3. **Falls back to production URL** if environment detection fails

## Changes Made

### 1. Enhanced Constants Package (`packages/constants/src/links.ts`)
Added utility functions for dynamic dashboard URL generation:
- `getDashboardUrl()` - Returns appropriate dashboard URL based on environment
- `makeDashboardLink(path)` - Creates full dashboard links with paths

### 2. Dashboard API Router (`packages/api/src/router/dashboard.ts`)
Replaced hardcoded return URL in Stripe checkout with dynamic URL generation:
```typescript
// Before
const returnUrl = `https://app.answeroverflow.com/dashboard/${server.id}`;

// After
const getDashboardUrl = () => {
  const deploymentEnv = sharedEnvs.NEXT_PUBLIC_DEPLOYMENT_ENV;
  if (deploymentEnv === 'local') return 'http://localhost:3002';
  if (deploymentEnv === 'production') return 'https://app.answeroverflow.com';
  const vercelUrl = process.env.VERCEL_URL || process.env.NEXT_PUBLIC_VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;
  return 'https://app.answeroverflow.com';
};
const returnUrl = `${getDashboardUrl()}/dashboard/${server.id}`;
```

### 3. Main Site Redirects (`apps/main-site/next.config.mjs`)
Updated redirect configuration to use dynamic URLs:
```javascript
// Before: Hardcoded environment checks
destination: process.env.NODE_ENV === 'development' 
  ? 'http://localhost:3002/onboarding'
  : 'https://app.answeroverflow.com/onboarding'

// After: Dynamic URL generation with preview deployment support
const getDashboardUrl = () => {
  const deploymentEnv = process.env.NEXT_PUBLIC_DEPLOYMENT_ENV;
  const nodeEnv = process.env.NODE_ENV;
  if (deploymentEnv === 'local' || nodeEnv === 'development') return 'http://localhost:3002';
  if (deploymentEnv === 'production') return 'https://app.answeroverflow.com';
  if (process.env.NEXT_PUBLIC_VERCEL_URL || process.env.VERCEL_URL) {
    const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL || process.env.VERCEL_URL;
    return `https://${vercelUrl}`;
  }
  return 'https://app.answeroverflow.com';
};
destination: `${dashboardUrl}/onboarding`
```

### 4. App Auth Page (`apps/main-site/src/app/(main-site)/app-auth/page.tsx`)
Updated authentication redirect to use dynamic URL:
```typescript
// Before
redirect(
  process.env.NEXT_PUBLIC_DEPLOYMENT_ENV === 'local'
    ? 'http://localhost:3002'
    : 'https://app.answeroverflow.com'
);

// After
const dashboardUrl = process.env.NEXT_PUBLIC_VERCEL_URL
  ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
  : process.env.NEXT_PUBLIC_DEPLOYMENT_ENV === 'local'
  ? 'http://localhost:3002'
  : 'https://app.answeroverflow.com';
redirect(dashboardUrl);
```

### 5. Message Result Page (`packages/ui/src/pages/MessageResultPage.tsx`)
Updated "Add your server" button to use dynamic URL:
```typescript
// Before
href={'https://app.answeroverflow.com/onboarding'}

// After
href={
  process.env.NEXT_PUBLIC_VERCEL_URL
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}/onboarding`
    : process.env.NEXT_PUBLIC_DEPLOYMENT_ENV === 'local'
    ? 'http://localhost:3002/onboarding'
    : 'https://app.answeroverflow.com/onboarding'
}
```

## Environment Variables Used

The solution relies on these environment variables:

- **`NEXT_PUBLIC_DEPLOYMENT_ENV`** - Indicates deployment environment (`local`, `staging`, `production`)
- **`VERCEL_URL`** - Automatically set by Vercel for preview deployments
- **`NEXT_PUBLIC_VERCEL_URL`** - Client-side accessible version of VERCEL_URL
- **`NODE_ENV`** - Node.js environment indicator

## Testing

To test the fix:

1. **Local Development**: Auth should redirect to `http://localhost:3002`
2. **Preview Deployments**: Auth should stay on the preview URL (e.g., `https://your-branch-answeroverflow.vercel.app`)
3. **Production**: Auth should continue working with `https://app.answeroverflow.com`

## Impact

This fix ensures that:
- ✅ Preview deployments can be fully tested with working authentication
- ✅ Local development continues to work as expected  
- ✅ Production remains unaffected
- ✅ Stripe checkout flows work correctly in all environments
- ✅ All authentication redirects respect the current deployment environment