# Stripe Implementation in Old AnswerOverflow Codebase

## Overview

The old AnswerOverflow codebase implements a subscription-based billing system using Stripe with multiple pricing tiers. This document summarizes all Stripe-related code for reference during the rewrite.

## Files Summary

### 1. Core Stripe Module
**File:** `packages/core/src/stripe.ts`

The main Stripe utility module that wraps the Stripe SDK:

- **Client Initialization:** Creates a Stripe client using `STRIPE_SECRET_KEY` env var (API version `2022-11-15`)
- **Functions:**
  - `fetchSubscriptionInfo(subscriptionId)` - Retrieves subscription details including trial status
  - `updateServerCustomerName(customerId, name, serverId)` - Updates customer metadata
  - `createNewCustomer(name, serverId)` - Creates a new Stripe customer with server metadata
  - `createProPlanCheckoutSession(customerId, successUrl, cancelUrl)` - Creates checkout for Starter plan
  - `createEnterprisePlanCheckoutSession(customerId, successUrl, cancelUrl)` - Creates checkout for Advanced plan
  - `createPlanCheckoutSession(customerId, successUrl, cancelUrl, planId)` - Generic checkout session creator with:
    - 14-day free trial for new subscribers
    - No trial for returning subscribers
    - Automatic tax collection
    - Tax ID collection

### 2. Webhook Handler
**File:** `apps/dashboard/src/pages/api/v1/stripe/webhook.ts`

Next.js API route handling Stripe webhook events:

- **Handled Events:**
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`

- **Logic:**
  - Verifies webhook signature using `STRIPE_WEBHOOK_SECRET`
  - Finds server by `stripeCustomerId` or `stripeSubscriptionId`
  - Maps Stripe price IDs to plan types (ENTERPRISE, PRO, STARTER, ADVANCED)
  - Updates server record with subscription info
  - On deletion: resets plan to FREE, clears `stripeSubscriptionId` but keeps `stripeCustomerId`

### 3. Database Schema
**File:** `packages/core/src/schema.ts`

**Server table fields related to Stripe/billing:**
```typescript
stripeCustomerId: varchar('stripeCustomerId', { length: 191 }),
stripeSubscriptionId: varchar('stripeSubscriptionId', { length: 191 }),
plan: mysqlEnum('plan', ['FREE', 'STARTER', 'ADVANCED', 'PRO', 'ENTERPRISE', 'OPEN_SOURCE']).default('FREE').notNull(),
```

**Indexes:**
- `Server_stripeCustomerId_key` (unique)
- `Server_stripeSubscriptionId_key` (unique)

**Plan Types:** `FREE`, `STARTER`, `ADVANCED`, `PRO`, `ENTERPRISE`, `OPEN_SOURCE`

### 4. Server Lookup Functions
**File:** `packages/core/src/server.ts`

- `findServerByStripeCustomerId(stripeCustomerId)` - Find server by Stripe customer ID
- `findServerByStripeSubscriptionId(stripeSubscriptionId)` - Find server by subscription ID

### 5. Environment Variables
**File:** `packages/env/src/shared.ts`

**Required Stripe env vars:**
- `STRIPE_PRO_PLAN_LEGACY_PRICE_ID` - Legacy Pro plan price ID
- `STRIPE_ENTERPRISE_PLAN_LEGACY_PRICE_ID` - Legacy Enterprise plan price ID
- `STRIPE_STARTER_PLAN_PRICE_ID` - Current Starter plan price ID
- `STRIPE_ADVANCED_PLAN_PRICE_ID` - Current Advanced plan price ID
- `STRIPE_SECRET_KEY` - Stripe secret API key
- `STRIPE_WEBHOOK_SECRET` - Webhook signing secret
- `STRIPE_CHECKOUT_URL` - URL for Stripe checkout portal

### 6. Dashboard API Router
**File:** `packages/api/src/router/dashboard.ts`

**`fetchDashboardById` procedure:**
- If server has active subscription:
  - Fetches subscription info (cancel_at, current_period_end, trial_end)
  - Returns `stripeCheckoutUrl` for managing subscription
- If server has no subscription:
  - Creates new Stripe customer if none exists
  - Generates checkout URLs for Pro and Enterprise plans
  - Returns checkout URLs and `hasSubscribedBefore` flag

**Return type for dashboard includes:**
- `status`: 'active' | 'inactive'
- `stripeCheckoutUrl`: URL for customer portal (active only)
- `dateCancelationTakesEffect`: When cancellation takes effect
- `dateSubscriptionRenews`: Next renewal date
- `dateTrialEnds`: Trial end date
- `hasSubscribedBefore`: Whether customer had previous subscription
- `proPlanCheckoutUrl`: Checkout URL for Starter plan
- `enterprisePlanCheckoutUrl`: Checkout URL for Advanced plan

### 7. UI Components

**File:** `apps/dashboard/src/app/dashboard/[serverId]/settings/components.tsx`
- `CurrentPlanCard` - Displays current plan, renewal/cancellation dates, and upgrade CTAs

**File:** `packages/ui/src/pricing.tsx`
- `PricingDialog` - Modal with plan selection
- `ProPlan` (Starter) - $125/month with ad-free, custom domain, unlimited page views
- `EnterprisePlan` (Advanced) - $250/month with subpath hosting, priority support
- `PricingOptions` - Full pricing page with Public Platform (free) and Paid Platform options
- FAQ component for enterprise pricing questions

**File:** `apps/dashboard/src/app/dashboard/[serverId]/components/tier-access-only.tsx`
- `TierAccessOnly` - Wrapper component that locks features based on plan tier
- Shows pricing dialog when feature not available for current plan

### 8. Default Server Values
**File:** `packages/core/src/utils/serverUtils.ts`

Default server values include:
- `stripeCustomerId: null`
- `stripeSubscriptionId: null`
- `plan: 'FREE'`

## Subscription Flow

1. **New Server Setup:**
   - Server starts with `plan: 'FREE'`, no Stripe customer/subscription
   - When viewing dashboard, a Stripe customer is created if none exists
   - Checkout URLs generated for Starter ($125/mo) and Advanced ($250/mo) plans

2. **Checkout:**
   - New subscribers get 14-day free trial
   - Returning subscribers skip trial
   - Automatic tax and tax ID collection enabled

3. **Webhook Processing:**
   - On subscription create/update: Map price ID to plan, update server record
   - On subscription delete: Reset to FREE plan, keep customer ID

4. **Active Subscription:**
   - Dashboard shows customer portal link for plan management
   - Displays renewal/cancellation/trial dates

## Plan Feature Gating

The `TierAccessOnly` component restricts features by plan:
- Takes array of `enabledFor` plans
- Shows pricing dialog if current plan not in enabled list
- Used throughout dashboard for premium features

## Pricing Tiers Summary

| Plan | Price | Features |
|------|-------|----------|
| FREE | $0/mo | Hosted on answeroverflow.com, unlimited page views, ad supported |
| STARTER | $125/mo | Ad free, custom domain, unlimited page views |
| ADVANCED | $250/mo | All Starter features + subpath hosting, priority support |
| PRO | Legacy | (Mapped from legacy price ID) |
| ENTERPRISE | Legacy | (Mapped from legacy price ID) |
| OPEN_SOURCE | Special | Special tier for open source projects |
