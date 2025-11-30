# Missing Features: AnswerOverflow Rewrite

## Priority 1: Critical for Launch (Core Functionality)

| Feature                | Description                                                               | Status          |
| ---------------------- | ------------------------------------------------------------------------- | --------------- |
| **Sitemap Generation** | Per-server sitemaps for SEO (`/sitemap.xml`, `/c/[serverId]/sitemap.xml`) | Not implemented |

## Detailed Breakdown

### 1. Sitemap Generation (Critical for SEO)

**What's needed:**

- `/sitemap.xml` - Index of all server sitemaps
- `/c/[serverId]/sitemap.xml` - Per-server message URLs
- Sitemap index with proper pagination
- Aggregate component for efficient thread counting

**Implementation plan exists:** See `notes/new-sitemap.md` for detailed implementation plan using `@convex-dev/aggregate`

## Recently Implemented

| Feature                  | Description                                        | Status      |
| ------------------------ | -------------------------------------------------- | ----------- |
| **Date Range Picker**    | Date range picker for filtering analytics          | Implemented |
| **Top Solvers UI**       | Top question solvers leaderboard table             | Implemented |
| **Popular Pages Table**  | Table showing most viewed pages                    | Implemented |
| **Stripe Billing UI**    | Subscription status, upgrade buttons, manage billing | Implemented |
| **Domain Removal**       | Clearing custom domain by saving empty value       | Implemented |

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
