# Missing Features: AnswerOverflow Rewrite

## Priority 1: Critical for Launch (Core Functionality)

| Feature                | Description                                                               | Status          |
| ---------------------- | ------------------------------------------------------------------------- | --------------- |
| **Sitemap Generation** | Per-server sitemaps for SEO (`/sitemap.xml`, `/c/[serverId]/sitemap.xml`) | Not implemented |

## Priority 2: High (User-Facing Features)

| Feature               | Description                                    | Status                                       |
| --------------------- | ---------------------------------------------- | -------------------------------------------- |
| **Date Range Picker** | Allow users to select date range for analytics | Not implemented - charts have args but no UI |
| **Top Solvers UI**    | Show top question solvers leaderboard          | Backend ready, UI not implemented            |

## Detailed Breakdown

### 1. Sitemap Generation (Critical for SEO)

**What's needed:**

- `/sitemap.xml` - Index of all server sitemaps
- `/c/[serverId]/sitemap.xml` - Per-server message URLs
- Sitemap index with proper pagination
- Aggregate component for efficient thread counting

**Implementation plan exists:** See `notes/new-sitemap.md` for detailed implementation plan using `@convex-dev/aggregate`

### 3. Date Range Picker for Analytics

**Current state:**

- Chart components accept `from`/`to` parameters
- Backend queries support date filtering

**What's needed:**

- Date picker UI component in dashboard
- Wire picker to chart components

### 4. Top Solvers UI

**Current state:**

- Backend query exists: `getTopQuestionSolversForServer`

**What's needed:**

- Leaderboard component in dashboard

## Intentionally Omitted

These features were removed from the missing features list as they are not planned for the initial launch or have been intentionally excluded:

| Feature                              | Description                                           | Reason                                            |
| ------------------------------------ | ----------------------------------------------------- | ------------------------------------------------- |
| **API Key Management**               | Generate/refresh API keys for server owners           | No one uses it, we'll bring it back in the future |
| **Elasticsearch/Vector Search**      | Production-grade search (Convex search may not scale) | Using Convex search only                          |
| **Email Notifications**              | Account verification, subscription updates            | Original version didn't have email                |
| **Checkmark Reaction Mark Solution** | Legacy ✅ reaction to mark solution                   | Not implemented                                   |
| **Rate Limiting**                    | API rate limits for public endpoints                  | Not implemented                                   |
| **Webhook Notifications**            | Notify servers of events via webhook                  | Not implemented                                   |
| **Export Data**                      | Allow users to export their data (GDPR compliance)    | Not implemented                                   |
