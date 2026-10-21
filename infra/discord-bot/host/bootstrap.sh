#!/bin/bash
# EC2 user data. Installs Docker and the deploy command. It does not start the
# bot: the first start is an explicit `answeroverflow-bot-deploy <sha>`.
set -euo pipefail

COMPOSE_VERSION=v5.6.0
COMPOSE_SHA256=40343e21ca777173e69cff5dbafeb37c6f81f3b0d57d9e597f036e95eb63e76a

dnf install -y docker git jq

mkdir -p /etc/docker
cat >/etc/docker/daemon.json <<'JSON'
{
  "log-driver": "local",
  "log-opts": { "max-size": "50m", "max-file": "5" },
  "live-restore": true
}
JSON

mkdir -p /usr/local/lib/docker/cli-plugins
curl -fsSL -o /tmp/docker-compose \
	"https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-linux-x86_64"
echo "${COMPOSE_SHA256}  /tmp/docker-compose" | sha256sum -c -
install -m 0755 /tmp/docker-compose /usr/local/lib/docker/cli-plugins/docker-compose
rm /tmp/docker-compose

systemctl enable --now docker

install -d -m 0700 /etc/answeroverflow
cat >/etc/answeroverflow/discord-bot.conf <<'CONF'
PARAMETER_PATH=__PARAMETER_PATH__
CONF
chmod 0600 /etc/answeroverflow/discord-bot.conf

# Stable entry point. Everything else about a deploy comes from the commit.
cat >/usr/local/bin/answeroverflow-bot-deploy <<'DEPLOY'
#!/bin/bash
set -euo pipefail
sha="${1:-}"
if [[ ! "$sha" =~ ^[0-9a-f]{40}$ ]]; then
	echo "usage: answeroverflow-bot-deploy <full 40-character commit sha>" >&2
	exit 64
fi
repo=/opt/answeroverflow/AnswerOverflow
if [ ! -d "$repo/.git" ]; then
	git clone --filter=blob:none https://github.com/AnswerOverflow/AnswerOverflow.git "$repo"
fi
git -C "$repo" fetch --filter=blob:none origin "$sha"
git -C "$repo" -c advice.detachedHead=false checkout --force --detach "$sha"
exec "$repo/infra/discord-bot/host/deploy.sh" "$sha"
DEPLOY
chmod 0755 /usr/local/bin/answeroverflow-bot-deploy
