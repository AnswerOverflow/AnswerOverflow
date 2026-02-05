import {
	Client,
	type Guild,
	type Message,
	type TextChannel,
	type ThreadChannel,
} from "discord.js-selfbot-v13";

const DISCORD_API_BASE = "https://discord.com/api/v9";
const TOKEN_FILE = new URL("../.discord-token", import.meta.url).pathname;

interface ApplicationCommand {
	id: string;
	application_id: string;
	name: string;
	type: number;
	version: string;
}

async function loadToken(): Promise<string> {
	const tokenFile = Bun.file(TOKEN_FILE);
	if (!(await tokenFile.exists())) {
		throw new Error(`Token file not found at ${TOKEN_FILE}`);
	}
	return (await tokenFile.text()).trim();
}

let clientInstance: Client | null = null;
let tokenCache: string | null = null;

async function getClient(): Promise<Client> {
	if (clientInstance?.isReady()) {
		return clientInstance;
	}

	const client = new Client({ checkUpdate: false } as ConstructorParameters<
		typeof Client
	>[0]);
	const token = await loadToken();
	tokenCache = token;

	await new Promise<void>((resolve, reject) => {
		const timeout = setTimeout(() => {
			reject(new Error("Login timed out after 30 seconds"));
		}, 30000);

		client.once("ready", () => {
			clearTimeout(timeout);
			console.log(`Logged in as ${client.user?.tag}`);
			resolve();
		});

		client.once("error", (err) => {
			clearTimeout(timeout);
			reject(err);
		});

		client.login(token).catch((err) => {
			clearTimeout(timeout);
			reject(err);
		});
	});

	clientInstance = client;
	return client;
}

async function cleanup(): Promise<void> {
	if (clientInstance) {
		try {
			clientInstance.destroy();
		} catch {}
		clientInstance = null;
	}
}

function getGuild(client: Client, guildName: string): Guild {
	const guild = client.guilds.cache.find((g) => g.name === guildName);
	if (!guild) {
		const available = client.guilds.cache.map((g) => g.name).join(", ");
		throw new Error(`Guild "${guildName}" not found. Available: ${available}`);
	}
	return guild;
}

function getTextChannel(guild: Guild, channelName: string): TextChannel {
	const channel = guild.channels.cache.find(
		(c): c is TextChannel =>
			c.isText() && !c.isThread() && c.name === channelName,
	);
	if (!channel) {
		const available = guild.channels.cache
			.filter((c) => c.isText() && !c.isThread())
			.map((c) => c.name)
			.join(", ");
		throw new Error(
			`Channel "${channelName}" not found. Available: ${available}`,
		);
	}
	return channel;
}

async function sendMessage(
	channel: TextChannel | ThreadChannel,
	content: string,
): Promise<Message> {
	const message = await channel.send(content);
	console.log(`Message sent: ${message.id}`);
	return message;
}

async function createThread(
	message: Message,
	name: string,
): Promise<ThreadChannel> {
	const thread = await message.startThread({
		name,
		autoArchiveDuration: 1440,
	});
	console.log(`Thread created: ${thread.id}`);
	return thread;
}

function getRawApiHeaders(): Record<string, string> {
	if (!tokenCache) {
		throw new Error("Token not loaded - call getClient() first");
	}

	const superProperties = Buffer.from(
		JSON.stringify({
			os: "Linux",
			browser: "Chrome",
			device: "",
			system_locale: "en-US",
			browser_user_agent:
				"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
			browser_version: "120.0.0.0",
			os_version: "",
			referrer: "",
			referring_domain: "",
			referrer_current: "",
			referring_domain_current: "",
			release_channel: "stable",
			client_build_number: 254573,
			client_event_source: null,
		}),
	).toString("base64");

	return {
		"Content-Type": "application/json",
		"User-Agent":
			"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
		Authorization: tokenCache,
		"X-Super-Properties": superProperties,
		"X-Discord-Locale": "en-US",
		"X-Discord-Timezone": "America/New_York",
	};
}

async function getApplicationCommands(
	guildId: string,
): Promise<Array<ApplicationCommand>> {
	const response = await fetch(
		`${DISCORD_API_BASE}/guilds/${guildId}/application-command-index`,
		{
			method: "GET",
			headers: getRawApiHeaders(),
		},
	);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(`Failed to get commands: ${JSON.stringify(error)}`);
	}

	const data = (await response.json()) as {
		application_commands: Array<ApplicationCommand>;
	};
	return data.application_commands;
}

async function findCommand(
	guildId: string,
	commandName: string,
	commandType: number,
): Promise<ApplicationCommand> {
	const commands = await getApplicationCommands(guildId);
	const command = commands.find(
		(cmd) => cmd.name === commandName && cmd.type === commandType,
	);
	if (!command) {
		const available = commands
			.filter((c) => c.type === commandType)
			.map((c) => c.name)
			.join(", ");
		throw new Error(
			`Command "${commandName}" (type ${commandType}) not found. Available: ${available}`,
		);
	}
	return command;
}

async function invokeMessageContextMenu(
	guildId: string,
	channelId: string,
	messageId: string,
	command: ApplicationCommand,
): Promise<void> {
	console.log(`Invoking context menu "${command.name}"...`);

	const response = await fetch(`${DISCORD_API_BASE}/interactions`, {
		method: "POST",
		headers: getRawApiHeaders(),
		body: JSON.stringify({
			type: 2,
			application_id: command.application_id,
			guild_id: guildId,
			channel_id: channelId,
			session_id: crypto.randomUUID(),
			data: {
				version: command.version,
				id: command.id,
				name: command.name,
				type: 3,
				target_id: messageId,
			},
			nonce: Date.now().toString(),
		}),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(`Failed to invoke context menu: ${JSON.stringify(error)}`);
	}

	console.log("Context menu command invoked successfully");
}

async function invokeSlashCommand(
	guildId: string,
	channelId: string,
	command: ApplicationCommand,
	options: Array<{ type: number; name: string; value: string }> = [],
): Promise<void> {
	console.log(`Invoking slash command /${command.name}...`);

	const response = await fetch(`${DISCORD_API_BASE}/interactions`, {
		method: "POST",
		headers: getRawApiHeaders(),
		body: JSON.stringify({
			type: 2,
			application_id: command.application_id,
			guild_id: guildId,
			channel_id: channelId,
			session_id: crypto.randomUUID(),
			data: {
				version: command.version,
				id: command.id,
				name: command.name,
				type: 1,
				options,
			},
			nonce: Date.now().toString(),
		}),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(`Failed to invoke slash command: ${JSON.stringify(error)}`);
	}

	console.log("Slash command invoked successfully");
}

export {
	getClient,
	cleanup,
	getGuild,
	getTextChannel,
	sendMessage,
	createThread,
	getApplicationCommands,
	findCommand,
	invokeMessageContextMenu,
	invokeSlashCommand,
};
export type { ApplicationCommand };
