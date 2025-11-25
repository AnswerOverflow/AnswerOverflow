# Missing Features: AnswerOverflow Rewrite

## Priority 1: Critical for Launch (Core Functionality)

| Feature | Description | Status |
|---------|-------------|--------|
| **Stripe Billing Integration** | Subscription management, checkout, customer portal, plan enforcement | Schema exists, no implementation |
| **Custom Domain Routing** | Multi-tenant routing for custom domains (Vercel domain API) | UI exists, routing not implemented |
| **Sitemap Generation** | Per-server sitemaps for SEO (`/sitemap.xml`, `/c/[serverId]/sitemap.xml`) | Not implemented |
| **OG Image Generation** | Dynamic Open Graph images for message pages | Not implemented |

## Priority 2: High (User-Facing Features)

| Feature | Description | Status |
|---------|-------------|--------|
| **Analytics Dashboard UI** | Charts for page views, Q&A stats, top solvers, invite clicks | Backend queries exist, UI is placeholder |
| **API Key Management** | Generate/refresh API keys for server owners | Schema field exists, no UI/endpoints |
| **Elasticsearch/Vector Search** | Production-grade search (Convex search may not scale) | Using Convex search only |
| **Email Notifications** | Account verification, subscription updates | Not implemented |

## Priority 3: Medium (Polish & Experience)

| Feature | Description | Status |
|---------|-------------|--------|
| **Checkmark Reaction Mark Solution** | Legacy ✅ reaction to mark solution (in addition to context menu) | Not implemented |
| **Quick Action Context Menu** | Redirect users to appropriate help channels | Not implemented |
| **/consent Slash Command** | Standalone consent command (exists via /manage-account but not standalone) | Partial |
| **Bot Onboarding Flow** | Guided setup when bot joins a server | Partial (web onboarding exists) |
| **Domain Verification UI** | Show Vercel domain DNS verification status | Not implemented |

## Priority 4: Lower (Nice to Have)

| Feature | Description | Status |
|---------|-------------|--------|
| **Rate Limiting** | API rate limits for public endpoints | Not implemented |
| **Webhook Notifications** | Notify servers of events via webhook | Not implemented |
| **Export Data** | Allow users to export their data (GDPR compliance) | Not implemented |
| **Server Kick Handling** | Cleanup when bot is kicked from server | Schema field exists, no logic |

---

## Detailed Breakdown

### 1. Stripe Billing (Critical)

**What's needed:**
- Stripe webhook handler (`/api/stripe/webhook`)
- Checkout session creation
- Customer portal redirect
- Plan enforcement (gate features by plan)
- Trial period handling (14 days)
- Subscription status sync

**Old code location:** `.context/AnswerOverflow/packages/payments/`

### 2. Custom Domain Routing (Critical)

**What's needed:**
- Middleware to detect custom domain requests
- Vercel Domain API integration (`addDomain`, `removeDomain`, `getDomainConfig`)
- DNS verification status display
- Route rewriting for custom domains

**Old code location:** `.context/AnswerOverflow/apps/main-site/middleware.ts`

### 3. Sitemap Generation (Critical for SEO)

**What's needed:**
- `/sitemap.xml` - Index of all server sitemaps
- `/c/[serverId]/sitemap.xml` - Per-server message URLs
- Sitemap index with proper pagination
- Robots.txt updates

**Old code location:** `.context/AnswerOverflow/apps/main-site/src/app/sitemap.ts`

### 4. OG Images (Critical for Social Sharing)

**What's needed:**
- Dynamic OG image generation for message pages
- Server branding in images
- Edge function for image generation (`@vercel/og`)

**Old code location:** `.context/AnswerOverflow/apps/main-site/src/app/og/`

### 5. Analytics Dashboard UI (High)

**What's needed:**
- Chart components (line charts, bar charts)
- Date range picker
- Page views chart
- Q&A statistics chart
- Top pages table
- Top solvers leaderboard
- Server invites chart

**Backend ready:** Queries exist in `authenticated/dashboard.ts`

### 6. Production Search (High)

**Current state:** Using Convex's built-in search
**Concern:** May not scale for large communities
**Options:**
- Keep Convex search (simplest)
- Add Elasticsearch (production-grade)
- Add Typesense (alternative)

---

## Recommended Implementation Order

1. **Sitemap Generation** - Quick win, essential for SEO
2. **OG Image Generation** - Quick win, essential for social sharing  
3. **Stripe Billing** - Required for monetization
4. **Custom Domain Routing** - Paid feature, depends on Stripe
5. **Analytics Dashboard UI** - Backend ready, just needs UI
6. **API Key Management** - Lower priority, schema exists
