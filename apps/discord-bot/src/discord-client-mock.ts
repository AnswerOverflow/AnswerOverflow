import {
	Client,
	GatewayIntentBits,
	type Guild,
	type GuildBasedChannel,
} from "discord.js";
import { Context, Effect, Layer } from "effect";

/**
 * Options for creating a mock Discord client service
 */
export interface DiscordMockOptions {
	/**
	 * Optional client to use instead of creating a new one
	 * Useful for overriding specific client behavior
	 */
	client?: Client;
}

/**
 * Creates a mock Discord client service that uses a real Discord.js client
 * but provides utilities to seed the cache with test data
 */
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
			});

		// Utility functions for seeding test data
		const seedGuild = (guild: Guild) => {
			client.guilds.cache.set(guild.id, guild);
		};

		const seedChannel = (channel: GuildBasedChannel) => {
			client.channels.cache.set(channel.id, channel);
			if ("guild" in channel && channel.guild) {
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

		// Helper to create a mock guild from minimal data
		// Uses Discord.js's internal _add method (private API, but fine for testing)
		const createMockGuild = (data: {
			id: string;
			name: string;
			icon?: string | null;
			description?: string | null;
			vanityURLCode?: string | null;
			approximateMemberCount?: number;
			memberCount?: number;
		}): Guild => {
			const guildData = {
				id: data.id,
				name: data.name,
				icon: data.icon ?? null,
				description: data.description ?? null,
				vanity_url_code: data.vanityURLCode ?? null,
				approximate_member_count:
					data.approximateMemberCount ?? data.memberCount ?? 0,
				approximate_presence_count: 0,
				features: [],
				emojis: [],
				banner: null,
				owner_id: "0",
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

		// Helper to create a mock text channel
		const createMockTextChannel = (
			guild: Guild,
			data: {
				id: string;
				name: string;
				parentId?: string | null;
			},
		) => {
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
			};
			// @ts-expect-error - _add is private but we need it for testing
			const channel = guild.channels._add(channelData);
			// Ensure channel has guild property (needed for filtering in syncGuild)
			Object.defineProperty(channel, "guild", {
				value: guild,
				writable: false,
				enumerable: true,
				configurable: true,
			});
			return channel;
		};

		// Helper to create a mock forum channel
		const createMockForumChannel = (
			guild: Guild,
			data: {
				id: string;
				name: string;
			},
		) => {
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
			};
			// @ts-expect-error - _add is private but we need it for testing
			const channel = guild.channels._add(channelData);
			// Ensure channel has guild property (needed for filtering in syncGuild)
			Object.defineProperty(channel, "guild", {
				value: guild,
				writable: false,
				enumerable: true,
				configurable: true,
			});
			return channel;
		};

		// Helper to create a mock news channel
		const createMockNewsChannel = (
			guild: Guild,
			data: {
				id: string;
				name: string;
				parentId?: string | null;
			},
		) => {
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
			};
			// @ts-expect-error - _add is private but we need it for testing
			const channel = guild.channels._add(channelData);
			// Ensure channel has guild property (needed for filtering in syncGuild)
			Object.defineProperty(channel, "guild", {
				value: guild,
				writable: false,
				enumerable: true,
				configurable: true,
			});
			return channel;
		};

		// Emit events manually for testing
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

		return {
			// Return the client itself (this is what DiscordClient yields)
			client,
			// Mock-specific utilities
			utilities: {
				seedGuild,
				seedChannel,
				clearCache,
				resetCache,
				createMockGuild,
				createMockTextChannel,
				createMockForumChannel,
				createMockNewsChannel,
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
