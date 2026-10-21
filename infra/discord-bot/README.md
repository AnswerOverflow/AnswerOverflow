# Discord bot host (AWS EC2)

One EC2 instance runs the production Discord bot in Docker Compose. Alchemy
(`alchemy.run.ts`) owns the infrastructure; the host builds the bot image from
a pinned commit. Convex, Vercel, and the S3 bucket stay where they are.

## What the stack creates

- A one-AZ VPC with a public subnet and no NAT gateway.
- A security group with **no inbound rules**. Shell access is SSM Session Manager.
- An IAM role and instance profile: SSM managed-instance access, read access to
  the bot's parameter path, and `s3:PutObject` / `s3:AbortMultipartUpload` on
  the bot bucket. The bot uses this role; there are no static AWS keys.
- The `BUCKET_NAME` parameter (non-secret, from `BOT_BUCKET_NAME`).
- One instance (via Cloud Control): 40 GiB encrypted gp3 root, IMDSv2 required
  (hop limit 2 so the container can reach the role), `r7i.large` by default.

Alchemy state lives in the account's `alchemy-state-{account}-{region}-an`
S3 bucket under `answeroverflow-discord-bot/`. Secrets never enter state.

## Runtime parameters

Under `/answeroverflow/<stage>/discord-bot/`, one parameter per env var, named
exactly as the variable. Values must be single-line. Use the default `aws/ssm`
key for SecureStrings.

| Name | Type |
| --- | --- |
| `DISCORD_TOKEN` | SecureString |
| `BACKEND_ACCESS_TOKEN` | SecureString |
| `PUBLIC_BACKEND_ACCESS_TOKEN` | SecureString |
| `AI_GATEWAY_API_KEY` | SecureString |
| `AXIOM_API_TOKEN` | SecureString |
| `POSTHOG_PERSONAL_API_KEY` | SecureString |
| `SENTRY_DSN` | SecureString |
| `NEXT_PUBLIC_CONVEX_URL` | String |
| `NEXT_PUBLIC_BASE_URL` | String |
| `NEXT_PUBLIC_POSTHOG_TOKEN` | String |
| `POSTHOG_PROJECT_ID` | String |
| `BUCKET_NAME` | String, written by Alchemy |

`deploy.sh` refuses to start the bot if any of these is missing.

## Provision

Deploy into the AWS account that owns the bot bucket, in `us-east-1`.

```sh
cd infra/discord-bot
bun install
export AWS_REGION=us-east-1
export BOT_BUCKET_NAME=<bucket>
export BOT_AMI_ID="$(aws ssm get-parameter \
  --name /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64 \
  --query Parameter.Value --output text)"
bun run plan
bun run deploy
```

Keep `BOT_AMI_ID` pinned across deploys; the AMI is create-only, so a new
value fails the update. Override the size with `BOT_INSTANCE_TYPE`.

The instance boots inert: user data installs Docker, Compose, and
`answeroverflow-bot-deploy`, but does not start the bot. User data runs only
on first boot.

## Start or update the bot

Make sure no other copy of the production bot is running, write the runtime
parameters, then run the deploy command with a full commit SHA:

```sh
aws ssm send-command --region us-east-1 \
  --instance-ids <instanceId> \
  --document-name AWS-RunShellScript \
  --parameters 'commands=["answeroverflow-bot-deploy <40-char sha>"]'
```

The command checks out that commit, renders `/etc/answeroverflow/discord-bot.env`
(root-only) from SSM, builds `apps/discord-bot/Dockerfile` from the repository
root, and replaces the single container. Docker restarts it on failure and on
reboot. The container is capped at 85% of host memory; logs rotate at
5 × 50 MB.

Rotating a secret: update the parameter, then rerun the deploy command.

Inspect: `aws ssm start-session --target <instanceId>`, then
`sudo docker compose -p answeroverflow-discord-bot logs -f`.

## Replacing the instance

Changes to the AMI, subnet, or availability zone need a new instance. Stop the
bot on the old host (`docker compose -p answeroverflow-discord-bot down`)
before starting it on the new one, so two bots never run at once.
