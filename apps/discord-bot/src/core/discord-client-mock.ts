import {
	Client,
	type ForumChannel,
	GatewayIntentBits,
	type Guild,
	type GuildBasedChannel,
	type Message,
	MessageType,
	type NewsChannel,
	Partials,
	type TextChannel,
} from "discord.js";
import { Context, Effect, Layer } from "effect";
import {
	channelDataArb,
	channelDataWithoutParentArb,
	guildDataArb,
	sampleOne,
} from "./discord-mock-arbitraries";

interface DiscordMockOptions {
	client?: Client;
}

const createDiscordClientMockService = (options: DiscordMockOptions = {}) =>
	Effect.gen(function* () {
		const client =
			options.client ??
			new Client({
				intents: [
					GatewayIntentBits.Guilds,
					GatewayIntentBits.GuildMessages,
					GatewayIntentBits.MessageContent,
					GatewayIntentBits.GuildMessageReactions,
				],
				partials: [
					Partials.Message,
					Partials.Channel,
					Partials.GuildMember,
					Partials.User,
					Partials.Reaction,
				],
			});

		const seedGuild = (guild: Guild) => {
			client.guilds.cache.set(guild.id, guild);
		};

		const seedChannel = (channel: GuildBasedChannel) => {
			client.channels.cache.set(channel.id, channel);
			if (channel.guild) {
				channel.guild.channels.cache.set(channel.id, channel);
			}
		};

		const clearCache = () => {
			client.guilds.cache.clear();
			client.channels.cache.clear();
		};

		const resetCache = () => {
			clearCache();
		};

		const createMockGuild = (
			partialData: Partial<{
				id: string;
				name: string;
				icon: string | null;
				description: string | null;
				vanityURLCode: string | null;
				approximateMemberCount: number;
				memberCount: number;
			}> = {},
		): Guild => {
			const generated = sampleOne(guildDataArb, {
				id: "100000000000000000",
				name: "Generated Guild",
				icon: null,
				description: null,
				vanityURLCode: null,
				approximateMemberCount: 0,
				memberCount: 0,
			});
			const data = {
				id: partialData.id ?? generated.id,
				name: partialData.name ?? generated.name,
				icon: partialData.icon ?? generated.icon,
				description: partialData.description ?? generated.description,
				vanityURLCode: partialData.vanityURLCode ?? generated.vanityURLCode,
				approximateMemberCount:
					partialData.approximateMemberCount ??
					partialData.memberCount ??
					generated.approximateMemberCount ??
					generated.memberCount ??
					0,
			};

			const guildData = {
				id: data.id,
				name: data.name,
				icon: data.icon ?? null,
				description: data.description ?? null,
				vanity_url_code: data.vanityURLCode ?? null,
				approximate_member_count: data.approximateMemberCount,
				approximate_presence_count: 0,
				features: [],
				emojis: [],
				banner: null,
				owner_id: "100000000000000000",
				afk_channel_id: null,
				afk_timeout: 0,
				verification_level: 0,
				default_message_notifications: 0,
				explicit_content_filter: 0,
				mfa_level: 0,
				application_id: null,
				system_channel_id: null,
				system_channel_flags: 0,
				rules_channel_id: null,
				max_presences: null,
				max_members: null,
				premium_tier: 0,
				premium_subscription_count: 0,
				preferred_locale: "en-US",
				public_updates_channel_id: null,
				max_video_channel_users: null,
				max_stage_video_channel_users: null,
				nsfw_level: 0,
				premium_progress_bar_enabled: false,
			};
			// @ts-expect-error - _add is private but we need it for testing
			return client.guilds._add(guildData);
		};

		const createMockTextChannel = (
			guild: Guild,
			partialData: Partial<{
				id: string;
				name: string;
				parentId: string | null;
			}> = {},
		) => {
			const generated = sampleOne(channelDataArb, {
				id: "100000000000000000",
				name: "Generated Channel",
				parentId: null,
			});
			const data = {
				id: partialData.id ?? generated.id,
				name: partialData.name ?? generated.name,
				parentId: partialData.parentId ?? generated.parentId,
			};

			const channelData = {
				id: data.id,
				name: data.name,
				type: 0, // ChannelType.GuildText
				parent_id: data.parentId ?? null,
				position: 0,
				permission_overwrites: [],
				rate_limit_per_user: 0,
				nsfw: false,
				topic: null,
				last_message_id: null,
				default_auto_archive_duration: null,
				guild_id: guild.id,
			};
			// @ts-expect-error - _add is private but we need it for testing
			const channel = client.channels._add(channelData, guild) as TextChannel;
			guild.channels.cache.set(channel.id, channel);
			return channel;
		};

		const createMockForumChannel = (
			guild: Guild,
			partialData: Partial<{
				id: string;
				name: string;
			}> = {},
		) => {
			const generated = sampleOne(channelDataWithoutParentArb, {
				id: "100000000000000000",
				name: "Generated Forum Channel",
			});
			const data = {
				id: partialData.id ?? generated.id,
				name: partialData.name ?? generated.name,
			};

			const channelData = {
				id: data.id,
				name: data.name,
				type: 15, // ChannelType.GuildForum
				position: 0,
				permission_overwrites: [],
				rate_limit_per_user: 0,
				nsfw: false,
				topic: null,
				last_message_id: null,
				default_auto_archive_duration: 4320,
				available_tags: [],
				default_reaction_emoji: null,
				default_thread_rate_limit_per_user: 0,
				default_sort_order: null,
				default_forum_layout: 0,
				guild_id: guild.id,
			};
			// @ts-expect-error - _add is private but we need it for testing
			const channel = client.channels._add(channelData, guild) as ForumChannel;
			guild.channels.cache.set(channel.id, channel);
			return channel;
		};

		const createMockNewsChannel = (
			guild: Guild,
			partialData: Partial<{
				id: string;
				name: string;
				parentId: string | null;
			}> = {},
		) => {
			const generated = sampleOne(channelDataArb, {
				id: "100000000000000000",
				name: "Generated Channel",
				parentId: null,
			});
			const data = {
				id: partialData.id ?? generated.id,
				name: partialData.name ?? generated.name,
				parentId: partialData.parentId ?? generated.parentId,
			};

			const channelData = {
				id: data.id,
				name: data.name,
				type: 5, // ChannelType.GuildAnnouncement
				parent_id: data.parentId ?? null,
				position: 0,
				permission_overwrites: [],
				rate_limit_per_user: 0,
				nsfw: false,
				topic: null,
				last_message_id: null,
				default_auto_archive_duration: null,
				guild_id: guild.id,
			};
			// @ts-expect-error - _add is private but we need it for testing
			const channel = client.channels._add(channelData, guild) as NewsChannel;
			guild.channels.cache.set(channel.id, channel);
			return channel;
		};

		const createMockMessage = (
			channel: GuildBasedChannel,
			partialData: Partial<{
				id: string;
				content: string;
				cleanContent: string;
				type: MessageType;
				authorId: string;
				authorBot: boolean;
				authorSystem: boolean;
				authorDisplayName: string;
				memberNickname: string | null;
				thread: Message["thread"] | null;
				attachmentsSize: number;
				attachmentName: string | null;
				startThread: (options: {
					name: string;
					reason: string;
				}) => Promise<Message["thread"]>;
				channelOverride: Partial<Message["channel"]>;
			}> = {},
		): Message => {
			const baseChannel = {
				...channel,
				isDMBased: () => false,
				isVoiceBased: () => false,
			};

			const messageChannel = partialData.channelOverride
				? ({
						...baseChannel,
						...partialData.channelOverride,
					} as Message["channel"])
				: (baseChannel as Message["channel"]);

			const defaultMessage = {
				id: partialData.id ?? "100000000000000000",
				channel: messageChannel,
				content:
					partialData.content ??
					partialData.cleanContent ??
					"Test message content",
				cleanContent:
					partialData.cleanContent ??
					partialData.content ??
					"Test message content",
				type: partialData.type ?? MessageType.Default,
				author: {
					id: partialData.authorId ?? "user123",
					bot: partialData.authorBot ?? false,
					system: partialData.authorSystem ?? false,
					displayName: partialData.authorDisplayName ?? "TestUser",
				},
				member: {
					nickname: partialData.memberNickname ?? null,
				},
				thread: partialData.thread ?? null,
				attachments: {
					size: partialData.attachmentsSize ?? 0,
					first: () =>
						partialData.attachmentsSize && partialData.attachmentsSize > 0
							? {
									name: partialData.attachmentName ?? null,
								}
							: null,
				},
				startThread:
					partialData.startThread ??
					(async (options: { name: string; reason: string }) => {
						return {
							id: "thread123",
							name: options.name,
						} as unknown as Message["thread"];
					}),
			} as unknown as Message;

			return defaultMessage;
		};

		const emitGuildCreate = (guild: Guild) => {
			client.emit("guildCreate", guild);
		};

		const emitGuildUpdate = (oldGuild: Guild, newGuild: Guild) => {
			client.emit("guildUpdate", oldGuild, newGuild);
		};

		const emitGuildDelete = (guild: Guild) => {
			client.emit("guildDelete", guild);
		};

		const emitClientReady = () => {
			client.emit("clientReady", client as Client<true>);
		};

		const createThreadTrackingHelper = (
			startThread?: (options: {
				name: string;
				reason: string;
			}) => Promise<Message["thread"]>,
		) => {
			let threadCreated = false;
			let threadName = "";
			const wrappedStartThread = async (options: {
				name: string;
				reason: string;
			}) => {
				threadCreated = true;
				threadName = options.name;
				return startThread
					? startThread(options)
					: ({
							id: "thread123",
							name: options.name,
						} as unknown as Message["thread"]);
			};
			return {
				threadCreated: () => threadCreated,
				threadName: () => threadName,
				wrappedStartThread,
			};
		};

		return {
			client,
			utilities: {
				seedGuild,
				seedChannel,
				clearCache,
				resetCache,
				createMockGuild,
				createMockTextChannel,
				createMockForumChannel,
				createMockNewsChannel,
				createMockMessage,
				createThreadTrackingHelper,
				emitGuildCreate,
				emitGuildUpdate,
				emitGuildDelete,
				emitClientReady,
			},
		};
	});

export class DiscordClientMock extends Context.Tag("DiscordClientMock")<
	DiscordClientMock,
	Effect.Effect.Success<ReturnType<typeof createDiscordClientMockService>>
>() {}

export const DiscordClientMockLayer = (options?: DiscordMockOptions) =>
	Layer.effect(DiscordClientMock, createDiscordClientMockService(options));
