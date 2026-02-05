import {
	type CategoryChannel,
	type Channel,
	Client,
	type ForumChannel,
	type Guild,
	type Message,
	type TextChannel,
	type ThreadChannel,
} from "discord.js-selfbot-v13";
import { Context, Data, Effect, Layer } from "effect";

export const isThread = (c: Channel): c is ThreadChannel =>
	"isThread" in c && (c as ThreadChannel).isThread();

export const isCategory = (c: Channel): c is CategoryChannel =>
	"type" in c && (c as CategoryChannel).type === "GUILD_CATEGORY";

export const isRegularChannel = (c: Channel): boolean =>
	"type" in c && !isCategory(c) && !isThread(c);

const DISCORD_API_BASE = "https://discord.com/api/v9";

export class SelfbotError extends Data.TaggedError("SelfbotError")<{
	cause: unknown;
}> {
	override get message() {
		return this.cause instanceof Error
			? this.cause.message
			: "Unknown selfbot error";
	}
}

export class GuildNotFoundError extends Data.TaggedError("GuildNotFoundError")<{
	guildName: string;
	availableGuilds: ReadonlyArray<string>;
}> {
	override get message() {
		return `Guild "${this.guildName}" not found. Available: ${this.availableGuilds.join(", ")}`;
	}
}

export class ChannelNotFoundError extends Data.TaggedError(
	"ChannelNotFoundError",
)<{
	channelName: string;
	availableChannels: ReadonlyArray<string>;
}> {
	override get message() {
		return `Channel "${this.channelName}" not found. Available: ${this.availableChannels.join(", ")}`;
	}
}

export class CommandNotFoundError extends Data.TaggedError(
	"CommandNotFoundError",
)<{
	commandName: string;
	commandType: number;
	availableCommands: ReadonlyArray<string>;
}> {
	override get message() {
		return `Command "${this.commandName}" (type ${this.commandType}) not found. Available: ${this.availableCommands.join(", ")}`;
	}
}

interface ApplicationCommand {
	id: string;
	application_id: string;
	name: string;
	type: number;
	version: string;
}

const clientInstance: Client = new Client({
	checkUpdate: false,
} as ConstructorParameters<typeof Client>[0]);

let tokenCache: string | null = null;

export const createSelfbotService = Effect.sync(() => {
	const client: Client = clientInstance;

	const loadToken = () =>
		Effect.gen(function* () {
			if (process.env.DISCORD_E2E_TOKEN) {
				return process.env.DISCORD_E2E_TOKEN;
			}
			if (process.env.DISCORD_TOKEN) {
				return process.env.DISCORD_TOKEN;
			}
			return yield* Effect.fail(
				new SelfbotError({
					cause: new Error(
						"Discord token not found. Set DISCORD_E2E_TOKEN env var.",
					),
				}),
			);
		});

	const login = () =>
		Effect.gen(function* () {
			if (client.isReady()) {
				return;
			}

			const token = yield* loadToken();
			tokenCache = token;

			yield* Effect.async<void, SelfbotError>((resume) => {
				const c = clientInstance;
				const timeout = setTimeout(() => {
					resume(
						Effect.fail(
							new SelfbotError({
								cause: new Error("Login timed out after 30 seconds"),
							}),
						),
					);
				}, 30000);

				c.once("ready", () => {
					clearTimeout(timeout);
					console.log(`Logged in as ${c.user?.tag}`);
					resume(Effect.void);
				});

				c.once("error", (err: Error) => {
					clearTimeout(timeout);
					resume(Effect.fail(new SelfbotError({ cause: err })));
				});

				c.login(token).catch((err: Error) => {
					clearTimeout(timeout);
					resume(Effect.fail(new SelfbotError({ cause: err })));
				});
			});
		});

	const destroy = () =>
		Effect.sync(() => {
			try {
				client.destroy();
			} catch {}
		});

	const call = <T>(fn: (c: Client) => T | Promise<T>) =>
		Effect.tryPromise({
			try: async () => fn(client),
			catch: (cause) => new SelfbotError({ cause }),
		});

	const getGuild = (guildName: string) =>
		Effect.gen(function* () {
			const guild = client.guilds.cache.find((g) => g.name === guildName);
			if (!guild) {
				const available = client.guilds.cache.map((g) => g.name);
				return yield* Effect.fail(
					new GuildNotFoundError({
						guildName,
						availableGuilds: Array.from(available),
					}),
				);
			}
			return guild;
		});

	const getTextChannel = (guild: Guild, channelName: string) =>
		Effect.gen(function* () {
			const channel = guild.channels.cache.find(
				(c): c is TextChannel =>
					c.isText() && !c.isThread() && c.name === channelName,
			);
			if (!channel) {
				const available = guild.channels.cache
					.filter((c) => c.isText() && !c.isThread())
					.map((c) => c.name);
				return yield* Effect.fail(
					new ChannelNotFoundError({
						channelName,
						availableChannels: Array.from(available),
					}),
				);
			}
			return channel;
		});

	const sendMessage = (channel: TextChannel | ThreadChannel, content: string) =>
		call(async () => {
			const message = await channel.send(content);
			console.log(`Message sent: ${message.id}`);
			return message;
		});

	const createThread = (message: Message, name: string) =>
		call(async () => {
			const thread = await message.startThread({
				name,
				autoArchiveDuration: 1440,
			});
			console.log(`Thread created: ${thread.id}`);
			return thread;
		});

	const deleteChannel = (channel: {
		delete: () => Promise<unknown>;
		name: string;
	}) =>
		call(async () => {
			await channel.delete();
			console.log(`  Deleted: ${channel.name}`);
		});

	const createCategory = (guild: Guild, name: string) =>
		call(async () => {
			console.log(`📁 Creating category: ${name}`);
			const category = (await guild.channels.create(name, {
				type: "GUILD_CATEGORY",
			})) as CategoryChannel;
			return category;
		});

	const createTextChannelInCategory = (
		guild: Guild,
		name: string,
		topic: string,
		category: CategoryChannel,
	) =>
		call(async () => {
			console.log(`  📝 Creating text channel: #${name}`);
			const channel = (await guild.channels.create(name, {
				type: "GUILD_TEXT",
				topic,
				parent: category.id,
			})) as TextChannel;
			return channel;
		});

	const createForumChannel = (
		guild: Guild,
		name: string,
		topic: string,
		category: CategoryChannel,
	) =>
		call(async () => {
			console.log(`  💬 Creating forum channel: #${name}`);
			const channel = (await guild.channels.create(name, {
				type: "GUILD_FORUM",
				topic,
				parent: category.id,
			})) as ForumChannel;
			return channel;
		});

	const getRawApiHeaders = () =>
		Effect.gen(function* () {
			if (!tokenCache) {
				return yield* Effect.fail(
					new SelfbotError({
						cause: new Error("Token not loaded - call login() first"),
					}),
				);
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
		});

	const getApplicationCommands = (
		guildId: string,
	): Effect.Effect<ReadonlyArray<ApplicationCommand>, SelfbotError> =>
		Effect.gen(function* () {
			const headers = yield* getRawApiHeaders();

			const response = yield* Effect.tryPromise({
				try: () =>
					fetch(
						`${DISCORD_API_BASE}/guilds/${guildId}/application-command-index`,
						{
							method: "GET",
							headers,
						},
					),
				catch: (cause) => new SelfbotError({ cause }),
			});

			if (!response.ok) {
				const error = yield* Effect.tryPromise({
					try: () => response.json() as Promise<{ retry_after?: number }>,
					catch: (cause) => new SelfbotError({ cause }),
				});

				if (error.retry_after) {
					const waitTime = error.retry_after ?? 5;
					console.log(`Rate limited, waiting ${waitTime}s...`);
					yield* Effect.sleep(`${waitTime + 0.1} seconds`);
					return yield* getApplicationCommands(guildId);
				}

				return yield* Effect.fail(
					new SelfbotError({
						cause: new Error(
							`Failed to get commands: ${JSON.stringify(error)}`,
						),
					}),
				);
			}

			const data = yield* Effect.tryPromise({
				try: () =>
					response.json() as Promise<{
						application_commands: Array<ApplicationCommand>;
					}>,
				catch: (cause) => new SelfbotError({ cause }),
			});

			return data.application_commands;
		});

	const findCommand = (
		guildId: string,
		commandName: string,
		commandType: number,
	) =>
		Effect.gen(function* () {
			const commands = yield* getApplicationCommands(guildId);
			const command = commands.find(
				(cmd) => cmd.name === commandName && cmd.type === commandType,
			);
			if (!command) {
				const available = commands
					.filter((c) => c.type === commandType)
					.map((c) => c.name);
				return yield* Effect.fail(
					new CommandNotFoundError({
						commandName,
						commandType,
						availableCommands: available,
					}),
				);
			}
			return command;
		});

	const invokeMessageContextMenu = (
		guildId: string,
		channelId: string,
		messageId: string,
		command: ApplicationCommand,
	) =>
		Effect.gen(function* () {
			console.log(`Invoking context menu "${command.name}"...`);
			const headers = yield* getRawApiHeaders();

			const response = yield* Effect.tryPromise({
				try: () =>
					fetch(`${DISCORD_API_BASE}/interactions`, {
						method: "POST",
						headers,
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
					}),
				catch: (cause) => new SelfbotError({ cause }),
			});

			if (!response.ok) {
				const error = yield* Effect.tryPromise({
					try: () => response.json(),
					catch: (cause) => new SelfbotError({ cause }),
				});
				return yield* Effect.fail(
					new SelfbotError({
						cause: new Error(
							`Failed to invoke context menu: ${JSON.stringify(error)}`,
						),
					}),
				);
			}

			console.log("Context menu command invoked successfully");
		});

	const invokeSlashCommand = (
		guildId: string,
		channelId: string,
		command: ApplicationCommand,
		options: Array<{ type: number; name: string; value: string }> = [],
	) =>
		Effect.gen(function* () {
			console.log(`Invoking slash command /${command.name}...`);
			const headers = yield* getRawApiHeaders();

			const response = yield* Effect.tryPromise({
				try: () =>
					fetch(`${DISCORD_API_BASE}/interactions`, {
						method: "POST",
						headers,
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
					}),
				catch: (cause) => new SelfbotError({ cause }),
			});

			if (!response.ok) {
				const error = yield* Effect.tryPromise({
					try: () => response.json(),
					catch: (cause) => new SelfbotError({ cause }),
				});
				return yield* Effect.fail(
					new SelfbotError({
						cause: new Error(
							`Failed to invoke slash command: ${JSON.stringify(error)}`,
						),
					}),
				);
			}

			console.log("Slash command invoked successfully");
		});

	return {
		client: {
			login,
			destroy,
			raw: client,
		},
		call,
		getGuild,
		getTextChannel,
		sendMessage,
		createThread,
		deleteChannel,
		createCategory,
		createTextChannelInCategory,
		createForumChannel,
		getApplicationCommands,
		findCommand,
		invokeMessageContextMenu,
		invokeSlashCommand,
	};
});

export class Selfbot extends Context.Tag("Selfbot")<
	Selfbot,
	Effect.Effect.Success<typeof createSelfbotService>
>() {}

export const SelfbotLayer = Layer.effect(Selfbot, createSelfbotService);

export type { ApplicationCommand };
