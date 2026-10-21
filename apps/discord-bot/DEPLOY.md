# Deploying the Discord bot (Vercel Daemon)

Production runs as the `discord-bot` daemon in the `answer-overflow-discord-bot`
Vercel project: one 4 GiB instance (2 vCPU) in `iad1`. The project's root
directory is the repository root, as daemons require.

- `vercel.json` declares the daemon and turns the project's own build into a
  no-op. Dependencies install inside the image.
- `Dockerfile.discord-bot` (repository root) builds the image. Vercel uses the
  directory containing the Dockerfile as the build context and builds for
  `linux/amd64`. It is self-contained and does not use Vercel's install step.
- Daemons run only for production deployments. A deployment that becomes
  production (deploy, promote, or rollback) rolls the daemon out.

## Environment variables (Production)

| Name | Kind |
| --- | --- |
| `DISCORD_TOKEN` | Sensitive |
| `BACKEND_ACCESS_TOKEN` | Sensitive |
| `PUBLIC_BACKEND_ACCESS_TOKEN` | Sensitive |
| `AI_GATEWAY_API_KEY` | Sensitive |
| `AXIOM_API_TOKEN` | Sensitive |
| `POSTHOG_PERSONAL_API_KEY` | Sensitive |
| `SENTRY_DSN` | Sensitive |
| `NEXT_PUBLIC_CONVEX_URL` | Plain |
| `NEXT_PUBLIC_BASE_URL` | Plain |
| `NEXT_PUBLIC_POSTHOG_TOKEN` | Plain |
| `POSTHOG_PROJECT_ID` | Plain |
| `BUCKET_NAME` | Plain |
| `AWS_ROLE_ARN` | Plain; the S3 role below |
| `AWS_REGION` | Plain; `us-east-1` |

Vercel also passes every project variable to the image build as a build
argument. The Dockerfile declares no `ARG`, so none are used or stored in the
image.

There are no AWS access keys. Vercel sets `VERCEL_OIDC_TOKEN_FILE` on each
instance and rewrites that file about every 5 minutes (tokens last 30 minutes).
The image exports it as `AWS_WEB_IDENTITY_TOKEN_FILE`, so the AWS SDK's default
chain calls `AssumeRoleWithWebIdentity` with `AWS_ROLE_ARN` and re-reads the file
whenever it refreshes credentials. The container exits at start if the token
file variable is missing.

## AWS role

In the account that owns the bucket:

1. Add the Vercel OIDC identity provider. Team issuer mode:
   `https://oidc.vercel.com/<team-slug>`, audience `https://vercel.com/<team-slug>`.
   Global issuer mode: `https://oidc.vercel.com` with the same audience.
2. Create the role with this trust policy (team issuer mode shown):

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Principal": {
           "Federated": "arn:aws:iam::<account-id>:oidc-provider/oidc.vercel.com/<team-slug>"
         },
         "Action": "sts:AssumeRoleWithWebIdentity",
         "Condition": {
           "StringEquals": {
             "oidc.vercel.com/<team-slug>:aud": "https://vercel.com/<team-slug>",
             "oidc.vercel.com/<team-slug>:sub": "owner:<team-slug>:project:answer-overflow-discord-bot:environment:production"
           }
         }
       }
     ]
   }
   ```

3. Give it only what the bot uses:

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": ["s3:PutObject", "s3:AbortMultipartUpload"],
         "Resource": "arn:aws:s3:::<bucket>/*"
       }
     ]
   }
   ```

   Add `kms:GenerateDataKey` on the key if the bucket uses SSE-KMS.

## Running more than one copy

`"instances": { "iad1": 1 }` does not make the bot a singleton. During a
rollout (deploy, promote, or rollback) Vercel starts the new instance
immediately and sends `SIGTERM` to the old one, which keeps running for up to
`terminationGracePeriodSeconds`. On `SIGTERM` the bot closes its Discord
gateway before draining, which keeps any overlap short but does not rule it out.

So every rollout stops the old bot first, using a scaling override. Scaling
overrides persist across deployments, so the new deployment starts with zero
instances until the override is cleared. The bot is offline for the minute or
so this takes.

Do not run this daemon while another copy of the production bot (Railway, EC2)
is connected.

## Deploy

`apps/discord-bot/scripts/daemon-rollout.ts` drives the scaling override
through the Vercel REST API (`PUT /v1/projects/{project}/daemons/discord-bot/instances`
and `GET /v1/projects/{project}/daemons`). It needs a `VERCEL_TOKEN` with access
to the `answer-overflow` team and never prints it.

1. Set the environment variables above for Production.
2. Stop the running bot (skip on the very first deploy, when no daemon exists
   yet and the API returns 404):

   ```sh
   VERCEL_TOKEN=... bun apps/discord-bot/scripts/daemon-rollout.ts stop
   ```

   This sets a `{ "iad1": 0 }` override and waits until every production
   instance of every deployment reports `alive: false` with a `stoppedAt`,
   which includes the `SIGTERM` grace period.
3. Deploy the reviewed commit to production from a clean checkout of the
   repository root, linked to `answer-overflow-discord-bot`:
   `vercel deploy --prod`. The override persists across deployments, so the new
   deployment starts with zero instances. `daemon-rollout.ts status` should
   show the new deployment with `desired=0` and no live instance.
4. Start it:

   ```sh
   VERCEL_TOKEN=... bun apps/discord-bot/scripts/daemon-rollout.ts start
   ```

   This clears the override and waits for exactly one live instance.
5. Check `Bot is in N guilds` in `vercel logs --query 'daemon:discord-bot'`.

Promote or roll back the same way: `stop`, promote or roll back, `start`. A
deploy, promote, or rollback made without `stop` overlaps the old and new bot
briefly. Equivalent CLI commands are `vercel daemons scale discord-bot iad1=0`,
`vercel daemons instances ls discord-bot --json`, and
`vercel daemons scale discord-bot --reset`.

## Local check

```sh
docker build --platform linux/amd64 -f Dockerfile.discord-bot -t discord-bot .
```

Running it needs a token file mounted at the path in `VERCEL_OIDC_TOKEN_FILE`
and the variables above.
