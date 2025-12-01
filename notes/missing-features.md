# Missing Features: AnswerOverflow Rewrite

> Last updated after comprehensive subagent investigation

## Priority 1: Critical for Launch

| Feature                | Description                          | Status                                           |
| ---------------------- | ------------------------------------ | ------------------------------------------------ |
| **Sitemap Generation** | Global + per-server sitemaps for SEO | Not implemented - plan in `notes/new-sitemap.md` |

## Priority 2: High (User-Facing Features)

| Feature                     | Description                                                   | Status                               |
| --------------------------- | ------------------------------------------------------------- | ------------------------------------ |
| **User Consent Mutations**  | User-facing mutations to grant/deny consent, disable indexing | Missing - only backend upsert exists |
| **Solved Tag Selection**    | Dashboard UI to select solved tag per forum channel           | Missing from channel settings page   |
| **PRO/ENTERPRISE Checkout** | Stripe checkout for higher-tier plans                         | Only STARTER/ADVANCED supported      |
| **Client-side Analytics**   | PostHog JS initialization and event capture                   | TrackLoad only logs to console       |

## Priority 3: Medium (Bot Features)

| Feature                              | Description                                                                  | Status          |
| ------------------------------------ | ---------------------------------------------------------------------------- | --------------- |
| **`/consent` Slash Command**         | Standalone consent command (not just via /manage-account)                    | Removed         |
| **Consent Button in Mark Solution**  | CTA button to grant consent after marking solution                           | Missing         |
| **Checkmark Reaction Mark Solution** | ✅ reaction to mark solution (Reactiflux feature)                            | Not implemented |
| **Mark Solution Guards**             | Prevent marking question itself, handle already-solved, change-solution flow | Missing         |
| **Mark Solution Post-Actions**       | Archive thread after 5min, re-index, add solver emoji/tag                    | Missing         |
| **Question/Solve Analytics**         | "Asked Question" and "Solved Question" PostHog events                        | Missing         |
| **Bot Status Rotation**              | Dynamic status with message counts (only static status now)                  | Partial         |

## Priority 4: Lower Priority

| Feature                         | Description                                      | Status                     |
| ------------------------------- | ------------------------------------------------ | -------------------------- |
| **Vestaboard Stats Reporter**   | Daily stats to Vestaboard display                | Not implemented            |
| **Sentry Error Logging**        | Bot error reporting to Sentry                    | Not implemented            |
| **Command Lifecycle Logging**   | Success/denied/error listeners for commands      | Not implemented            |
| **Leave Server Button**         | Admin button to DM owner and leave server        | Not implemented            |
| **Mention Prefix Response**     | Response when bot is mentioned                   | Not implemented            |
| **API Key Refresh**             | Generate/refresh per-server API keys             | Schema exists, no mutation |
| **Integrations Dashboard Page** | `/dashboard/[serverId]/integrations` with InKeep | Not implemented            |

## Schema/Database Gaps

| Issue                          | Description                                                     | Impact                 |
| ------------------------------ | --------------------------------------------------------------- | ---------------------- |
| **No Unique Constraints**      | vanityUrl, customDomain, inviteCode, apiKey not enforced unique | Potential duplicates   |
| **Missing referenceId Index**  | Messages table lacks index on referenceId                       | Slow reference lookups |
| **Attachment URLs Not Stored** | Only storageId stored, not original Discord URLs                | May need URL on-demand |

## API/Backend Gaps

| Feature                           | Description                                         | Status                           |
| --------------------------------- | --------------------------------------------------- | -------------------------------- |
| **Public Message Page Query**     | `threadFromMessageId` was public, now only private  | Client can't fetch directly      |
| **Channel-filtered Search**       | Old search supported channel filter                 | Only server filter (post-search) |
| **Bot-assisted Indexing**         | Enable indexing + fetch forum tags via bot          | Just toggles flags now           |
| **Vercel Domain Hook**            | Actually call Vercel API when setting custom domain | Only saves to DB, no API call    |
| **Custom Domain Plan Gating**     | Require PRO+ plan for custom domains                | No plan check                    |
| **Consolidated Dashboard+Stripe** | Single endpoint returning dashboard + billing state | Split into multiple calls        |

## Web App Gaps

| Feature                               | Description                                    | Status                    |
| ------------------------------------- | ---------------------------------------------- | ------------------------- |
| **Tenant User Profiles**              | `/[domain]/u/[userId]` for custom domain sites | Missing                   |
| **Custom Domain Canonical Redirects** | Redirect from main site to tenant domain       | Not implemented           |
| **Posts Index Pages**                 | `/c/[serverId]/posts/[page]` bulk listings     | Removed                   |
| **Server Filter in Root Search**      | `?s=serverId` parameter for search             | Only tenant search scoped |

## Intentionally Omitted

| Feature                   | Reason                             |
| ------------------------- | ---------------------------------- |
| **Elasticsearch**         | Using Convex search for simplicity |
| **Email Notifications**   | Original didn't have this          |
| **Webhook Notifications** | Not needed for launch              |
| **GDPR Export**           | Can add later                      |
| **Rate Limiting**         | Can add later                      |

## Recently Implemented

| Feature                                              | Status |
| ---------------------------------------------------- | ------ |
| Analytics Dashboard UI (charts, date picker, tables) | Done   |
| Quick Action Context Menu                            | Done   |
| Blog with MDX                                        | Done   |
| OG Images (post, community, blog)                    | Done   |
| Tenant Pages for Custom Domains                      | Done   |
| Query Result Caching                                 | Done   |
