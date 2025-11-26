# Missing Features: AnswerOverflow Rewrite

## Priority 1: Critical for Launch (Core Functionality)

| Feature                   | Description                                                               | Status                             |
| ------------------------- | ------------------------------------------------------------------------- | ---------------------------------- |
| **Custom Domain Routing** | Multi-tenant routing for custom domains (Vercel domain API)               | UI exists, routing not implemented |
| **Sitemap Generation**    | Per-server sitemaps for SEO (`/sitemap.xml`, `/c/[serverId]/sitemap.xml`) | Not implemented                    |

## Priority 2: High (User-Facing Features)

| Feature                    | Description                                                  | Status                                   |
| -------------------------- | ------------------------------------------------------------ | ---------------------------------------- |
| **Analytics Dashboard UI** | Charts for page views, Q&A stats, top solvers, invite clicks | Backend queries exist, UI is placeholder |

## Priority 3: Medium (Polish & Experience)

| Feature                       | Description                                 | Status          |
| ----------------------------- | ------------------------------------------- | --------------- |
| **Quick Action Context Menu** | Redirect users to appropriate help channels | Not implemented |
| **Domain Verification UI**    | Show Vercel domain DNS verification status  | Not implemented |

---

## Detailed Breakdown

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

---

## Recommended Implementation Order

1. **Sitemap Generation** - Quick win, essential for SEO
2. **Custom Domain Routing** - Paid feature, depends on Stripe
3. **Analytics Dashboard UI** - Backend ready, just needs UI

---

## Intentionally Omitted

These features were removed from the missing features list as they are not planned for the initial launch or have been intentionally excluded:

### Priority 2 (Removed)

| Feature                         | Description                                           | Reason                                            |
| ------------------------------- | ----------------------------------------------------- | ------------------------------------------------- |
| **API Key Management**          | Generate/refresh API keys for server owners           | No one uses it, we'll bring it back in the future |
| **Elasticsearch/Vector Search** | Production-grade search (Convex search may not scale) | Using Convex search only                          |
| **Email Notifications**         | Account verification, subscription updates            | Original version didn't have email                |

### Priority 3 (Removed)

| Feature                              | Description                                                                | Reason                          |
| ------------------------------------ | -------------------------------------------------------------------------- | ------------------------------- |
| **Checkmark Reaction Mark Solution** | Legacy ✅ reaction to mark solution (in addition to context menu)          | Not implemented                 |
| **/consent Slash Command**           | Standalone consent command (exists via /manage-account but not standalone) | Partial                         |
| **Bot Onboarding Flow**              | Guided setup when bot joins a server                                       | Partial (web onboarding exists) |

### Priority 4 (Removed)

| Feature                   | Description                                        | Reason                        |
| ------------------------- | -------------------------------------------------- | ----------------------------- |
| **Rate Limiting**         | API rate limits for public endpoints               | Not implemented               |
| **Webhook Notifications** | Notify servers of events via webhook               | Not implemented               |
| **Export Data**           | Allow users to export their data (GDPR compliance) | Not implemented               |
| **Server Kick Handling**  | Cleanup when bot is kicked from server             | Schema field exists, no logic |

### Detailed Breakdown (Removed)

**Production Search (High)**

- Current state: Using Convex's built-in search
- Concern: May not scale for large communities
- Options:
  - Keep Convex search (simplest)
  - Add Elasticsearch (production-grade)
  - Add Typesense (alternative)
