# Fullstack monorepo template feat. Expo, Turbo, Next.js, Convex, Clerk

This is a modern TypeScript monorepo template with AI web and native apps
featuring:

- Turborepo: Monorepo management
- React 19: Latest React with concurrent features
- Next.js 15: Web app & marketing page with App Router
- Tailwind CSS v4: Modern CSS-first configuration
- React Native [Expo](https://expo.dev/): Mobile/native app with New Architecture
- [Convex](https://convex.dev): Backend, database, server functions
- [Clerk](https://clerk.dev): User authentication
- OpenAI: Text summarization (optional)

The example app is a note taking app that can summarize notes using AI. Features
include:

- Marketing page
- Dashboard page (web & native)
- Note taking page (web & native)
- Backend API that serves web & native with the same API
- Relational database
- End to end type safety (schema definition to frontend API clients)
- User authentication
- Asynchronous call to an OpenAI
- Everything is realtime by default

## Using this example

### 1. Install dependencies

If you don't have `yarn` installed, run `npm install --global yarn`.

Run `yarn`.

### 2. Configure Convex

> Note: The following command will print an error and ask you to add the
> appropriate environment variable to proceed. Continue reading on for how to do
> that.

```sh
npm run setup --workspace packages/backend
```

The script will log you into Convex if you aren't already and prompt you to
create a project (free). It will then wait to deploy your code until you set the
environment variables in the dashboard.

Configure Clerk with [this guide](https://docs.convex.dev/auth/clerk). Then add
the `CLERK_ISSUER_URL` found in the "convex" template
[here](https://dashboard.clerk.com/last-active?path=jwt-templates), to your
Convex environment variables
[here](https://dashboard.convex.dev/deployment/settings/environment-variables&var=CLERK_ISSUER_URL).

Make sure to enable **Google and Apple** as possible Social Connection
providers, as these are used by the React Native login implementation.

After that, optionally add the `OPENAI_API_KEY` env var from
[OpenAI](https://platform.openai.com/account/api-keys) to your Convex
environment variables to get AI summaries.

The `setup` command should now finish successfully.

### 3. Configure both apps

In each app directory (`apps/web`, `apps/native`) create a `.env.local` file
using the `.example.env` as a template and fill out your Convex and Clerk
environment variables.

- Use the `CONVEX_URL` from `packages/backend/.env.local` for
  `{NEXT,EXPO}_PUBLIC_CONVEX_URL`.
- The Clerk publishable & secret keys can be found
  [here](https://dashboard.clerk.com/last-active?path=api-keys).

### 4. Run both apps

Run the following command to run both the web and mobile apps:

```sh
npm run dev
```

This will allow you to use the ⬆ and ⬇ keyboard keys to see logs for each
of the Convex backend, web app, and mobile app separately.
If you'd rather see all of the logs in one place, delete the
`"ui": "tui",` line in [turbo.json](./turbo.json).

## Deploying

In order to both deploy the frontend and Convex, run this as the build command from the apps/web directory:

```sh
cd ../../packages/backend && npx convex deploy --cmd 'cd ../../apps/web && turbo run build' --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL
```

There is a vercel.json file in the apps/web directory with this configuration for Vercel.

## What's inside?

This monorepo template includes the following packages/apps:

### Apps and Packages

- `web`: a [Next.js 15](https://nextjs.org/) app with Tailwind CSS and Clerk
- `native`: a [React Native](https://reactnative.dev/) app built with
  [expo](https://docs.expo.dev/)
- `packages/backend`: a [Convex](https://www.convex.dev/) folder with the
  database schema and shared functions

Each package/app is 100% [TypeScript](https://www.typescriptlang.org/).

To install a new package, `cd` into that directory, such as [packages/backend](./packages/backend/), and then run `yarn add mypackage@latest`

### Utilities

This Turborepo has some additional tools already setup for you:

- [Expo](https://docs.expo.dev/) for native development
- [TypeScript](https://www.typescriptlang.org/) for static type checking
- [Prettier](https://prettier.io) for code formatting

# What is Convex?

[Convex](https://convex.dev) is a hosted backend platform with a built-in
reactive database that lets you write your
[database schema](https://docs.convex.dev/database/schemas) and
[server functions](https://docs.convex.dev/functions) in
[TypeScript](https://docs.convex.dev/typescript). Server-side database
[queries](https://docs.convex.dev/functions/query-functions) automatically
[cache](https://docs.convex.dev/functions/query-functions#caching--reactivity)
and [subscribe](https://docs.convex.dev/client/react#reactivity) to data,
powering a
[realtime `useQuery` hook](https://docs.convex.dev/client/react#fetching-data)
in our [React client](https://docs.convex.dev/client/react). There are also
clients for [Python](https://docs.convex.dev/client/python),
[Rust](https://docs.convex.dev/client/rust),
[ReactNative](https://docs.convex.dev/client/react-native), and
[Node](https://docs.convex.dev/client/javascript), as well as a straightforward
[HTTP API](https://github.com/get-convex/convex-js/blob/main/src/browser/http_client.ts#L40).

The database supports
[NoSQL-style documents](https://docs.convex.dev/database/document-storage) with
[relationships](https://docs.convex.dev/database/document-ids) and
[custom indexes](https://docs.convex.dev/database/indexes/) (including on fields
in nested objects).

The [`query`](https://docs.convex.dev/functions/query-functions) and
[`mutation`](https://docs.convex.dev/functions/mutation-functions) server
functions have transactional, low latency access to the database and leverage
our [`v8` runtime](https://docs.convex.dev/functions/runtimes) with
[determinism guardrails](https://docs.convex.dev/functions/runtimes#using-randomness-and-time-in-queries-and-mutations)
to provide the strongest ACID guarantees on the market: immediate consistency,
serializable isolation, and automatic conflict resolution via
[optimistic multi-version concurrency control](https://docs.convex.dev/database/advanced/occ)
(OCC / MVCC).

The [`action` server functions](https://docs.convex.dev/functions/actions) have
access to external APIs and enable other side-effects and non-determinism in
either our [optimized `v8` runtime](https://docs.convex.dev/functions/runtimes)
or a more
[flexible `node` runtime](https://docs.convex.dev/functions/runtimes#nodejs-runtime).

Functions can run in the background via
[scheduling](https://docs.convex.dev/scheduling/scheduled-functions) and
[cron jobs](https://docs.convex.dev/scheduling/cron-jobs).

Development is cloud-first, with
[hot reloads for server function](https://docs.convex.dev/cli#run-the-convex-dev-server)
editing via the [CLI](https://docs.convex.dev/cli). There is a
[dashboard UI](https://docs.convex.dev/dashboard) to
[browse and edit data](https://docs.convex.dev/dashboard/deployments/data),
[edit environment variables](https://docs.convex.dev/production/environment-variables),
[view logs](https://docs.convex.dev/dashboard/deployments/logs),
[run server functions](https://docs.convex.dev/dashboard/deployments/functions),
and more.

There are built-in features for
[reactive pagination](https://docs.convex.dev/database/pagination),
[file storage](https://docs.convex.dev/file-storage),
[reactive search](https://docs.convex.dev/text-search),
[https endpoints](https://docs.convex.dev/functions/http-actions) (for
webhooks),
[streaming import/export](https://docs.convex.dev/database/import-export/), and
[runtime data validation](https://docs.convex.dev/database/schemas#validators)
for [function arguments](https://docs.convex.dev/functions/args-validation) and
[database data](https://docs.convex.dev/database/schemas#schema-validation).

Everything scales automatically, and it’s
[free to start](https://www.convex.dev/plans).
