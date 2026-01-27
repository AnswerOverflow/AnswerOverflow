# Create GitHub Issue

A Discord context menu command that uses AI to extract GitHub issues from Discord messages, lets the user review/edit them, pick a repository, and create them on GitHub — all from within Discord. A web dashboard settings page also exists for managing the GitHub integration.

## Entry Points

### Discord Bot (Primary)

Right-click any message in Discord → Apps → **"Create GitHub Issue"**

Registered as a global context menu command (`ApplicationCommandType.Message`, guild-only) in `apps/discord-bot/src/commands/register.ts:51-54`.

### Web Dashboard (Settings)

`apps/main-site/src/app/(main-site)/dashboard/settings/page.tsx` — The `GitHubAccountCard` component shows GitHub connection status, lists accessible repositories, and provides a link to install the GitHub App on more repos. Uses `useAuthenticatedQuery` to fetch the account and `useAction` to call `getAccessibleRepos`.

## Architecture Overview

```
Discord User
  │
  ▼
Context Menu Interaction
  │
  ├─ 1. Defer reply (ephemeral)
  ├─ 2. Fetch target message
  ├─ 3. Get channel settings + server preferences (for footer content)
  ├─ 4. Rate limit check (AI extraction)
  ├─ 5. AI extraction (Gemini 2.0 Flash via Vercel AI SDK)
  ├─ 5b. Upload attachments to Convex storage → permanent CDN URLs
  ├─ 6. Render Reacord UI (MultiIssueCreator)
  │     ├─ RepoSelector (fetches repos via authenticated action)
  │     ├─ Issue preview with edit modal
  │     ├─ Create Issue button → authenticated action → Octokit → GitHub API
  │     └─ Recap with send-to-channel/thread buttons
  └─ 7. Record issue in Convex `githubIssues` table
```

## Detailed Flow

### Step 1: Command Handler Setup

**File:** `apps/discord-bot/src/commands/convert-to-github-issue-reacord.tsx`

`ConvertToGitHubIssueReacordLayer` registers a listener on `interactionCreate`. When the command name matches `"Create GitHub Issue"`, it calls `handleConvertToGitHubIssueCommand` wrapped with:
- A 25-second timeout (`GitHubIssueTimeoutError`)
- Error reporting via `catchAllWithReport` and `catchAllDefectWithReport`
- Fallback interaction replies if anything fails

### Step 2: Message Fetch & Context Gathering

`handleConvertToGitHubIssueCommand` (line 721):
1. Defers the reply as ephemeral
2. Fetches the target message from the channel
3. Determines channel context: is it a thread? a forum? what's the parent channel?
4. Fetches channel settings (`database.private.channels.findChannelByDiscordId`) to check `indexingEnabled`
5. Fetches server preferences (`database.private.server_preferences.getServerPreferencesByServerId`) to check `plan !== "FREE"`

These are used to build the issue footer (see Step 4).

### Step 3: Rate Limit Check (AI Extraction)

Before calling the AI, the bot checks the `aiIssueExtraction` rate limit:

```
Bot → database.private.github.checkAiIssueExtractionRateLimit
  → resolves Discord ID to Better Auth user ID
  → internal.internal.rateLimiter.checkAiIssueExtraction
  → rateLimiter.limit(ctx, "aiIssueExtraction", { key: userId })
```

**Config:** Token bucket, 100 tokens per 10 minutes, capacity 100.

If rate limited, the user sees: "You're using this too quickly. Please try again in X seconds."

### Step 4: AI Issue Extraction

**File:** `apps/discord-bot/src/commands/extract-github-issues.ts`

Uses Vercel AI SDK's `generateText` with:
- **Model:** `gateway("google/gemini-2.0-flash")`
- **Output:** Structured output via `Output.object({ schema: ExtractionSchema })`
- **Schema:** `{ issues: [{ title: string, body: string }] }`

The prompt includes:
- Thread name (if in a thread)
- Author username
- Parent channel name
- Message content
- Attachment metadata (filenames, content types) — if the message has attachments

The AI is instructed to mention attachments contextually (e.g. "See attached screenshot") but NOT embed URLs — permanent CDN URLs are appended automatically by `buildAttachmentsSection()`.

It instructs the AI to create well-structured issues with sections like Description, Steps to Reproduce, Expected/Actual Behavior, and Additional Context.

**Fallback:** If AI extraction fails, `generateFallbackTitle` uses the thread name or first line of the message, and `generateFallbackBody` quotes the entire message content.

### Step 5: Issue Footer

**File:** `apps/discord-bot/src/commands/github-issue-utils.ts`

`buildIssueFooter()` appends metadata to each issue body:
- A link to the original message — either on Answer Overflow (`/m/{messageId}`) if indexing is enabled, or a Discord link
- Author attribution
- "Created by Answer Overflow" branding (only on free plan)

### Step 5b: Attachment Upload & Section

**Files:**
- `apps/discord-bot/src/commands/convert-to-github-issue-reacord.tsx` — upload logic using `Storage` Effect service
- `apps/discord-bot/src/commands/github-issue-utils.ts` — `buildAttachmentsSection()`

Discord CDN URLs expire, so attachments are uploaded to our CDN before issue creation:

1. **Upload**: The bot uses the `Storage` Effect service (`yield* Storage`) to call `storage.uploadFileFromUrl()` for each Discord attachment. This uses the existing storage abstraction (S3 in production, Convex storage in dev). CDN URLs are constructed as `https://{CDN_DOMAIN}/{attachmentId}/{filename}`.

2. **Section building**: `buildAttachmentsSection()` creates a markdown `### Attachments` section:
   - Images (png, jpg, gif, webp, svg) are embedded as `![filename](url)`
   - Other files (logs, zips, etc.) are linked as `[filename](url)`
   - Returns empty string if there are no attachments
   - Uses permanent CDN URLs (not expiring Discord CDN URLs)

### Step 6: Reacord UI

The entire interactive UI is built with Reacord (React for Discord). Three main components:

#### `RepoSelector`

Uses an Atom family (`reposAtomFamily`) keyed by Discord user ID. The atom runs:
```
database.authenticated.github.getAccessibleRepos({}, { discordAccountId })
```

States:
- **Not linked:** Shows `InstallFlow` with "Connect GitHub" link + "I've installed it" refresh button
- **Token expired:** Shows `InstallFlow` with "Reconnect GitHub"
- **No repos:** Shows `InstallFlow` with "Install on a repository"
- **Has repos:** Shows a `<Select>` dropdown with:
  - Search option (opens a modal for text input filtering)
  - Sorted repo list (max 22 shown, client-side filtered)
  - "Install on more repos" option

#### `MultiIssueCreator`

Manages multiple extracted issues with pagination:
- Shows the current issue's title + body preview (truncated to 4000 chars)
- Pagination buttons (Prev/Next) if multiple issues
- Edit button → opens a Discord modal with title + body text inputs
- **Create Issue** button triggers `createIssueAtom`
- Progress tracking: `"1/3 · 1 created"` footer

When all issues are created, shows `RecapContent` with send buttons.

#### `RecapContent`

Displays a green-accented container with:
- Header: "GitHub Issue Created" or "N GitHub Issues Created"
- Repository name
- Each issue as `[#number](url) title`

Send buttons:
- **"Send to #channel"** — sends recap to the parent channel (if in a thread, non-forum)
- **"Reply in channel"** — replies to the original message (if not in a thread)
- **"Send in thread"** — sends to the current thread, or creates a new thread on the original message

Sending uses `reacord.send()` which was enhanced with `SendOptions.reply.messageReference` for reply support.

### Step 7: Issue Creation (Backend)

#### Authentication Architecture

**File:** `packages/database/convex/client/authenticated.ts`

The `authenticatedAction` custom wrapper accepts optional `backendAccessToken` + `discordAccountId` args. `resolveAuthentication()` handles two paths:

1. **Bot path:** `backendAccessToken` + `discordAccountId` provided → validates the token against `BACKEND_ACCESS_TOKEN` env var, uses `discordAccountId` directly
2. **Web path:** No backend token → resolves user from Better Auth session via `getAuthUserId()` + `getDiscordAccountIdForWrapper()`

The Database service proxy (`packages/database/src/database.ts`) automatically injects `backendAccessToken` from env when the bot calls authenticated actions.

#### `createIssue` Action

**File:** `packages/database/convex/authenticated/github.ts:279`

1. Validates repo owner/name against `GITHUB_REPO_NAME_REGEX` (`/^[\w.-]+$/`)
2. Validates title length (max 256) and body length (max 65536)
3. Resolves Discord ID → Better Auth user ID via `getBetterAuthUserIdByDiscordId`
4. Checks `githubCreateIssue` rate limit (100 tokens per 10 minutes, capacity 100)
5. Looks up GitHub account via `getGitHubAccountByDiscordId`
6. Creates an Octokit client (with automatic token refresh if expired)
7. Calls `octokit.rest.issues.create`
8. Records the issue in Convex via `internal.private.github.createGitHubIssueRecordInternal`
9. Returns `{ success: true, issue: { id, number, url, title } }`

#### Token Refresh

**File:** `packages/database/convex/shared/auth/github.ts`

`createOctokitClient` checks if the access token is expired (with a 5-minute buffer). If expired, it calls GitHub's OAuth token refresh endpoint, updates the tokens in Better Auth's account store, and creates the Octokit client with the fresh token.

#### `getAccessibleRepos` Action

**File:** `packages/database/convex/authenticated/github.ts:41`

1. Resolves Discord ID → Better Auth user ID
2. Checks `githubFetchRepos` rate limit (30 per minute, capacity 10)
3. Looks up GitHub account
4. Creates Octokit client
5. Lists all installations for the authenticated user
6. For each installation, paginates through `listInstallationReposForAuthenticatedUser` (max 500 repos per installation)
7. Returns repo list with `{ id, name, fullName, owner, private, installationId }`

## Database Schema

### `githubIssues` Table

```
issueId: number
issueNumber: number
repoOwner: string
repoName: string
issueUrl: string
issueTitle: string
discordServerId: bigint
discordChannelId: bigint
discordMessageId: bigint
discordThreadId?: bigint
createdByUserId: string
status: "open" | "closed"
```

**Indexes:**
- `by_repoOwner_and_repoName_and_issueNumber` — lookup by repo + issue number
- `by_discordMessageId` — find issues created from a specific Discord message
- `by_createdByUserId` — find issues created by a specific user

## Rate Limits

All rate limits use token bucket algorithm via `@convex-dev/rate-limiter`. Keyed by Better Auth user ID.

| Name | Rate | Period | Capacity | Where |
|------|------|--------|----------|-------|
| `aiIssueExtraction` | 100 | 10 min | 100 | Before AI call in bot command handler |
| `githubFetchRepos` | 30 | 1 min | 10 | In `getAccessibleRepos` action |
| `githubCreateIssue` | 100 | 10 min | 100 | In `createIssue` action |

## Error Handling

### Error Codes (`GitHubErrorCodes`)

| Code | Meaning |
|------|---------|
| `NOT_LINKED` | No GitHub account linked to this user |
| `NO_TOKEN` | No access or refresh token available |
| `REFRESH_REQUIRED` | Token expired, refresh needed |
| `REFRESH_FAILED` | Token refresh attempt failed |
| `FETCH_FAILED` | GitHub API call to fetch repos failed |
| `CREATE_FAILED` | GitHub API call to create issue failed |
| `USER_NOT_FOUND` | Discord ID doesn't map to a Better Auth user |
| `INVALID_REPO` | Repo owner/name contains invalid characters |
| `INVALID_INPUT` | Title too long, body too long, or title empty |
| `RATE_LIMITED` | Rate limit exceeded |

### Tagged Errors (Effect)

| Error | Used In |
|-------|---------|
| `ExtractIssuesError` | AI extraction failure |
| `GitHubNotLinkedError` | `reposAtomFamily` — no GitHub account |
| `GitHubTokenExpiredError` | `reposAtomFamily` — session/token expired |
| `GitHubFetchError` | `reposAtomFamily` — generic fetch failure |
| `GitHubSessionExpiredError` | `createIssueEffect` — session expired on create |
| `GitHubCreateIssueError` | `createIssueEffect` — issue creation failed |
| `GitHubIssueTimeoutError` | Command handler — 25s timeout exceeded |

## File Map

| File | Purpose |
|------|---------|
| `apps/discord-bot/src/commands/register.ts` | Registers the context menu command |
| `apps/discord-bot/src/commands/extract-github-issues.ts` | AI extraction with Vercel AI SDK + Gemini |
| `apps/discord-bot/src/commands/github-issue-utils.ts` | Footer builder, attachments section builder, fallback generators, shared types/constants |
| `apps/discord-bot/src/commands/convert-to-github-issue-reacord.tsx` | Full Reacord UI (RepoSelector, MultiIssueCreator, RecapContent), command handler, Effect layer |
| `packages/database/convex/authenticated/github.ts` | `getGitHubAccount`, `getAccessibleRepos`, `searchRepos`, `getOrgRepos`, `getFeatured`, `createIssue` |
| `packages/database/src/storage.ts` | `Storage` Effect service — S3 (prod) / Convex (dev) abstraction for file uploads |
| `packages/database/convex/private/github.ts` | `checkAiIssueExtractionRateLimit`, `createGitHubIssueRecordInternal`, issue status queries |
| `packages/database/convex/shared/auth/github.ts` | Octokit client creation, token refresh, repo fetching, GitHub API wrappers, validation |
| `packages/database/convex/shared/rateLimiter.ts` | Rate limit configs (aiIssueExtraction, githubCreateIssue, githubFetchRepos) |
| `packages/database/convex/internal/rateLimiter.ts` | Internal mutations that check each rate limit |
| `packages/database/convex/client/authenticated.ts` | `authenticatedAction`/`authenticatedQuery`/`authenticatedMutation` wrappers with dual auth paths |
| `apps/main-site/src/app/(main-site)/dashboard/settings/page.tsx` | Web dashboard GitHub integration card |
| `apps/main-site/src/lib/use-authenticated-query.ts` | Hook that skips Convex queries when no session |
| `packages/reacord/src/reacord.tsx` | `SendOptions` with `reply.messageReference` support |
