#!/bin/bash
# Runs as root on the bot host, through `answeroverflow-bot-deploy <sha>`,
# after that commit is checked out. Renders the runtime env from SSM, then
# builds and (re)starts the single bot container.
set -euo pipefail

sha="$1"
here="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=/dev/null
source /etc/answeroverflow/discord-bot.conf
env_file=/etc/answeroverflow/discord-bot.env

required=(
	DISCORD_TOKEN
	BACKEND_ACCESS_TOKEN
	PUBLIC_BACKEND_ACCESS_TOKEN
	AI_GATEWAY_API_KEY
	AXIOM_API_TOKEN
	POSTHOG_PERSONAL_API_KEY
	SENTRY_DSN
	NEXT_PUBLIC_CONVEX_URL
	NEXT_PUBLIC_BASE_URL
	NEXT_PUBLIC_POSTHOG_TOKEN
	POSTHOG_PROJECT_ID
	BUCKET_NAME
)

imds_token="$(curl -fsS -X PUT http://169.254.169.254/latest/api/token \
	-H 'X-aws-ec2-metadata-token-ttl-seconds: 60')"
region="$(curl -fsS -H "X-aws-ec2-metadata-token: $imds_token" \
	http://169.254.169.254/latest/meta-data/placement/region)"

umask 077
tmp="$(mktemp /etc/answeroverflow/.discord-bot.env.XXXXXX)"
trap 'rm -f "$tmp"' EXIT

aws ssm get-parameters-by-path --region "$region" --path "$PARAMETER_PATH" \
	--with-decryption --output json |
	jq -r --arg prefix "$PARAMETER_PATH/" '
		.Parameters[]
		| if (.Value | test("\n")) then error("\(.Name) contains a newline") else . end
		| "\(.Name | ltrimstr($prefix))=\(.Value)"' >"$tmp"

missing=()
for key in "${required[@]}"; do
	grep -q "^${key}=" "$tmp" || missing+=("$key")
done
if [ "${#missing[@]}" -gt 0 ]; then
	echo "Refusing to deploy; missing parameters under $PARAMETER_PATH: ${missing[*]}" >&2
	exit 1
fi
echo "SENTRY_RELEASE=$sha" >>"$tmp"
mv "$tmp" "$env_file"
trap - EXIT

# Leave the host ~15% of RAM so a bot leak kills the container, not the host.
mem_kb="$(awk '/^MemTotal:/ { print $2 }' /proc/meminfo)"
export BOT_MEMORY_LIMIT="$((mem_kb * 85 / 100 / 1024))m"

compose=(docker compose -f "$here/compose.yaml")
"${compose[@]}" build --pull
"${compose[@]}" up -d --remove-orphans
docker image prune -f
"${compose[@]}" ps
