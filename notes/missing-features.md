# Missing Features: AnswerOverflow Rewrite

> Last updated after comprehensive subagent investigation

## Priority 1: Critical for Launch

| Feature                | Description                          | Status                                           |
| ---------------------- | ------------------------------------ | ------------------------------------------------ |
| **Sitemap Generation** | Global + per-server sitemaps for SEO | Not implemented - plan in `notes/new-sitemap.md` |

## Priority 2: High (User-Facing Features)

| Feature                   | Description                                 | Status                         |
| ------------------------- | ------------------------------------------- | ------------------------------ |
| **Client-side Analytics** | PostHog JS initialization and event capture | TrackLoad only logs to console |

## Priority 3: Medium (Bot Features)

| Feature                        | Description                                                                  | Status |
| ------------------------------ | ---------------------------------------------------------------------------- | ------ |
| **Mark Solution Guards**       | Prevent marking question itself, handle already-solved, change-solution flow |
| **Mark Solution Post-Actions** | Archive thread after 5min, re-index, add solver emoji/tag                    |
| **Question/Solve Analytics**   | "Asked Question" and "Solved Question" PostHog events                        |
| **Bot Status Rotation**        | Dynamic status with message counts (only static status now)                  |

## Priority 4: Lower Priority

| Feature                       | Description                       | Status          |
| ----------------------------- | --------------------------------- | --------------- |
| **Vestaboard Stats Reporter** | Daily stats to Vestaboard display | Not implemented |

## Schema/Database Gaps

| Issue                     | Description                                                     | Impact               |
| ------------------------- | --------------------------------------------------------------- | -------------------- |
| **No Unique Constraints** | vanityUrl, customDomain, inviteCode, apiKey not enforced unique | Potential duplicates |

## API/Backend Gaps

| Feature                           | Description                                         | Status                    |
| --------------------------------- | --------------------------------------------------- | ------------------------- |
| **Custom Domain Plan Gating**     | Require PRO+ plan for custom domains                | No plan check             |
| **Consolidated Dashboard+Stripe** | Single endpoint returning dashboard + billing state | Split into multiple calls |

## Web App Gaps

| Feature                               | Description                                | Status                    |
| ------------------------------------- | ------------------------------------------ | ------------------------- |
| **Custom Domain Canonical Redirects** | Redirect from main site to tenant domain   | Not implemented           |
| **Posts Index Pages**                 | `/c/[serverId]/posts/[page]` bulk listings | Removed                   |
| **Server Filter in Root Search**      | `?s=serverId` parameter for search         | Only tenant search scoped |

## Intentionally Omitted

| Feature                              | Reason                                                                       |
| ------------------------------------ | ---------------------------------------------------------------------------- |
| **Elasticsearch**                    | Using Convex search for simplicity                                           |
| **Email Notifications**              | Original didn't have this                                                    |
| **Webhook Notifications**            | Not needed for launch                                                        |
| **GDPR Export**                      | Can add later                                                                |
| **Rate Limiting**                    | Can add later                                                                |
| **PRO/ENTERPRISE Checkout**          | Stripe checkout for higher-tier plans                                        |
| **`/consent` Slash Command**         | handled via /manage-account                                                  |
| **Consent Button in Mark Solution**  | CTA button to grant consent after marking solution, removed due to low usage |
| **Checkmark Reaction Mark Solution** | ✅ reaction to mark solution (Reactiflux feature)                            |
| **Sentry Error Logging**             | May add back later                                                           |
| **Command Lifecycle Logging**        | Not needed                                                                   |
| **Leave Server Button**              | Not needed                                                                   |
| **API Key Refresh**                  | Not needed                                                                   |
| **Integrations Dashboard Page**      | Unused                                                                       |

## Recently Implemented

| Feature                                              | Status |
| ---------------------------------------------------- | ------ |
| Analytics Dashboard UI (charts, date picker, tables) | Done   |
| Quick Action Context Menu                            | Done   |
| Blog with MDX                                        | Done   |
| OG Images (post, community, blog)                    | Done   |
| Tenant Pages for Custom Domains                      | Done   |
| Query Result Caching                                 | Done   |
