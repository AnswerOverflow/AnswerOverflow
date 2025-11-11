import { Context, Effect, Layer } from "effect";
import { api, internal } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import type {
	Attachment,
	Channel,
	ChannelSettings,
	DiscordAccount,
	Emoji,
	Message,
	Server,
	ServerPreferences,
	UserServerSettings,
} from "../convex/schema";
import { ConvexClientLiveUnifiedLayer } from "./convex-client-live";
import type { ConvexClientShared } from "./convex-unified-client";
import { ConvexClientUnified } from "./convex-unified-client";
import { createWatchQueryToLiveData } from "./watch-query";

/**
 * Base message with relations - matches the old codebase interface
 */
export type BaseMessageWithRelations = Message & {
	attachments?: Attachment[];
	reactions?: Array<{
		userId: string;
		emoji: Emoji;
	}>;
};

export const service = Effect.gen(function* () {
	const externalSecret = "hello"; //yield* Config.string("EXTERNAL_WRITE_SECRET");
	const convexClient = yield* ConvexClientUnified;

	const watchQueryToLiveData = createWatchQueryToLiveData(convexClient, {
		api,
		internal,
	});

	const upsertServer = (data: Server) =>
		convexClient.use(
			(
				client: ConvexClientShared,
				convexApi: { api: typeof api; internal: typeof internal },
			) =>
				client.mutation(convexApi.api.servers.upsertServerExternal, {
					data,
					apiKey: externalSecret,
				}),
		);

	const createServer = (data: Server) =>
		convexClient.use(
			(
				client: ConvexClientShared,
				convexApi: { api: typeof api; internal: typeof internal },
			) =>
				client.mutation(convexApi.api.servers.createServerExternal, {
					data,
					apiKey: externalSecret,
				}),
		);

	const updateServer = (id: Id<"servers">, data: Server) =>
		convexClient.use(
			(
				client: ConvexClientShared,
				convexApi: { api: typeof api; internal: typeof internal },
			) =>
				client.mutation(convexApi.api.servers.updateServerExternal, {
					id,
					data,
					apiKey: externalSecret,
				}),
		);

	const getServerById = (id: Id<"servers">) =>
		watchQueryToLiveData(({ api }) => api.servers.publicGetServerById, {
			id,
		});

	const getServerByDiscordId = (discordId: string) =>
		watchQueryToLiveData(({ api }) => api.servers.publicGetServerByDiscordId, {
			discordId,
		});

	const findServerByAlias = (alias: string) =>
		watchQueryToLiveData(({ api }) => api.servers.publicFindServerByAlias, {
			alias,
		});

	const findServerByAliasOrId = (aliasOrId: string) =>
		watchQueryToLiveData(({ api }) => api.servers.publicFindServerByAliasOrId, {
			aliasOrId,
		});

	const findServerByCustomDomain = (domain: string) =>
		watchQueryToLiveData(
			({ api }) => api.servers.publicFindServerByCustomDomain,
			{
				domain,
			},
		);

	const findServerByStripeCustomerId = (stripeCustomerId: string) =>
		watchQueryToLiveData(
			({ api }) => api.servers.publicFindServerByStripeCustomerId,
			{
				stripeCustomerId,
			},
		);

	const findServerByStripeSubscriptionId = (stripeSubscriptionId: string) =>
		watchQueryToLiveData(
			({ api }) => api.servers.publicFindServerByStripeSubscriptionId,
			{
				stripeSubscriptionId,
			},
		);

	const findManyServersById = (ids: Id<"servers">[]) =>
		watchQueryToLiveData(({ api }) => api.servers.publicFindManyServersById, {
			ids,
		});

	const getBiggestServers = (take: number) =>
		watchQueryToLiveData(({ api }) => api.servers.publicGetBiggestServers, {
			take,
		});

	const findServerByIdWithChannels = (id: Id<"servers">) =>
		watchQueryToLiveData(
			({ api }) => api.servers.publicFindServerByIdWithChannels,
			{
				id,
			},
		);

	const publicGetAllServers = () =>
		watchQueryToLiveData(({ api }) => api.servers.publicGetAllServers, {});

	const getChannelByDiscordId = (discordId: string) =>
		watchQueryToLiveData(({ api }) => api.channels.getChannelByDiscordId, {
			discordId,
		});

	const findChannelByInviteCode = (inviteCode: string) =>
		watchQueryToLiveData(({ api }) => api.channels.findChannelByInviteCode, {
			inviteCode,
		});

	const findAllThreadsByParentId = (parentId: string, limit?: number) =>
		watchQueryToLiveData(({ api }) => api.channels.findAllThreadsByParentId, {
			parentId,
			limit,
		});

	const findAllChannelsByServerId = (serverId: Id<"servers">) =>
		watchQueryToLiveData(({ api }) => api.channels.findAllChannelsByServerId, {
			serverId,
		});

	const findManyChannelsById = (ids: string[], includeMessageCount?: boolean) =>
		watchQueryToLiveData(({ api }) => api.channels.findManyChannelsById, {
			ids,
			includeMessageCount,
		});

	const findLatestThreads = (take: number) =>
		watchQueryToLiveData(({ api }) => api.channels.findLatestThreads, {
			take,
		});

	const findChannelsBeforeId = (
		serverId: Id<"servers">,
		id: string,
		take?: number,
	) =>
		watchQueryToLiveData(({ api }) => api.channels.findChannelsBeforeId, {
			serverId,
			id,
			take,
		});

	const createChannel = (data: {
		channel: Channel;
		settings?: ChannelSettings;
	}) =>
		convexClient.use(
			(
				client: ConvexClientShared,
				convexApi: { api: typeof api; internal: typeof internal },
			) =>
				client.mutation(convexApi.api.channels.createChannel, {
					channel: data.channel,
					settings: data.settings,
				}),
		);

	const createManyChannels = (data: {
		channels: Array<{ channel: Channel; settings?: ChannelSettings }>;
	}) =>
		convexClient.use(
			(
				client: ConvexClientShared,
				convexApi: { api: typeof api; internal: typeof internal },
			) =>
				client.mutation(convexApi.api.channels.createManyChannels, {
					channels: data.channels,
				}),
		);

	const updateChannel = (data: {
		id: string;
		channel: Channel;
		settings?: ChannelSettings;
	}) =>
		convexClient.use(
			(
				client: ConvexClientShared,
				convexApi: { api: typeof api; internal: typeof internal },
			) =>
				client.mutation(convexApi.api.channels.updateChannel, {
					id: data.id,
					channel: data.channel,
					settings: data.settings,
				}),
		);

	const updateManyChannels = (channels: Channel[]) =>
		convexClient.use(
			(
				client: ConvexClientShared,
				convexApi: { api: typeof api; internal: typeof internal },
			) =>
				client.mutation(convexApi.api.channels.updateManyChannels, {
					channels,
				}),
		);

	const deleteChannel = (id: string) =>
		convexClient.use(
			(
				client: ConvexClientShared,
				convexApi: { api: typeof api; internal: typeof internal },
			) =>
				client.mutation(convexApi.api.channels.deleteChannel, {
					id,
				}),
		);

	const upsertManyChannels = (data: {
		channels: Array<{
			create: Channel;
			update?: Channel;
			settings?: ChannelSettings;
		}>;
	}) =>
		convexClient.use(
			(
				client: ConvexClientShared,
				convexApi: { api: typeof api; internal: typeof internal },
			) =>
				client.mutation(convexApi.api.channels.upsertManyChannels, {
					channels: data.channels,
				}),
		);

	const upsertChannelWithSettings = (data: {
		channel: Channel;
		settings?: ChannelSettings;
	}) =>
		convexClient.use(
			(
				client: ConvexClientShared,
				convexApi: { api: typeof api; internal: typeof internal },
			) =>
				client.mutation(convexApi.api.channels.upsertChannelWithSettings, {
					channel: data.channel,
					settings: data.settings,
				}),
		);

	const upsertMessage = (data: {
		message: Message;
		attachments?: Attachment[];
		reactions?: Array<{
			userId: string;
			emoji: Emoji;
		}>;
		ignoreChecks?: boolean;
	}) =>
		convexClient.use(
			(
				client: ConvexClientShared,
				convexApi: { api: typeof api; internal: typeof internal },
			) =>
				client.mutation(convexApi.api.messages.upsertMessage, {
					message: data.message,
					attachments: data.attachments,
					reactions: data.reactions,
					ignoreChecks: data.ignoreChecks,
				}),
		);

	const upsertManyMessages = (data: {
		messages: Array<{
			message: Message;
			attachments?: Attachment[];
			reactions?: Array<{
				userId: string;
				emoji: Emoji;
			}>;
		}>;
		ignoreChecks?: boolean;
	}) =>
		convexClient.use(
			(
				client: ConvexClientShared,
				convexApi: { api: typeof api; internal: typeof internal },
			) =>
				client.mutation(convexApi.api.messages.upsertManyMessages, {
					messages: data.messages,
					ignoreChecks: data.ignoreChecks,
				}),
		);

	const getMessageById = (id: string) =>
		watchQueryToLiveData(({ api }) => api.messages.getMessageById, {
			id,
		});

	const findMessagesByChannelId = (
		channelId: string,
		options?: { limit?: number; after?: string },
	) =>
		watchQueryToLiveData(({ api }) => api.messages.findMessagesByChannelId, {
			channelId,
			limit: options?.limit,
			after: options?.after,
		});

	const findManyMessagesById = (ids: string[]) =>
		watchQueryToLiveData(({ api }) => api.messages.findManyMessagesById, {
			ids,
		});

	const findMessagesByAuthorId = (authorId: string, limit?: number) =>
		watchQueryToLiveData(({ api }) => api.messages.findMessagesByAuthorId, {
			authorId,
			limit,
		});

	const findMessagesByServerId = (serverId: Id<"servers">, limit?: number) =>
		watchQueryToLiveData(({ api }) => api.messages.findMessagesByServerId, {
			serverId,
			limit,
		});

	const findMessagesByParentChannelId = (
		parentChannelId: string,
		limit?: number,
	) =>
		watchQueryToLiveData(
			({ api }) => api.messages.findMessagesByParentChannelId,
			{
				parentChannelId,
				limit,
			},
		);

	const findLatestMessageInChannel = (channelId: string) =>
		watchQueryToLiveData(({ api }) => api.messages.findLatestMessageInChannel, {
			channelId,
		});

	const findLatestMessageInChannelAndThreads = (channelId: string) =>
		watchQueryToLiveData(
			({ api }) => api.messages.findLatestMessageInChannelAndThreads,
			{
				channelId,
			},
		);

	const findAttachmentsByMessageId = (messageId: string) =>
		watchQueryToLiveData(({ api }) => api.messages.findAttachmentsByMessageId, {
			messageId,
		});

	const findReactionsByMessageId = (messageId: string) =>
		watchQueryToLiveData(({ api }) => api.messages.findReactionsByMessageId, {
			messageId,
		});

	const findEmojiById = (id: string) =>
		watchQueryToLiveData(({ api }) => api.messages.findEmojiById, {
			id,
		});

	const countMessagesInChannel = (channelId: string) =>
		watchQueryToLiveData(({ api }) => api.messages.countMessagesInChannel, {
			channelId,
		});

	const countMessagesInManyChannels = (channelIds: string[]) =>
		watchQueryToLiveData(
			({ api }) => api.messages.countMessagesInManyChannels,
			{
				channelIds,
			},
		);

	const getTotalMessageCount = () =>
		watchQueryToLiveData(({ api }) => api.messages.getTotalMessageCount, {});

	const findSolutionsByQuestionId = (questionId: string, limit?: number) =>
		watchQueryToLiveData(({ api }) => api.messages.findSolutionsByQuestionId, {
			questionId,
			limit,
		});

	const getTopQuestionSolversByServerId = (
		serverId: Id<"servers">,
		limit?: number,
	) =>
		watchQueryToLiveData(
			({ api }) => api.messages.getTopQuestionSolversByServerId,
			{
				serverId,
				limit,
			},
		);

	const getMessagePageData = (messageId: string) =>
		watchQueryToLiveData(({ api }) => api.messages.getMessagePageData, {
			messageId,
		});

	const searchMessages = (options: {
		query: string;
		serverId?: Id<"servers">;
		channelId?: string;
		limit?: number;
	}) =>
		watchQueryToLiveData(({ api }) => api.messages.searchMessages, {
			query: options.query,
			serverId: options.serverId,
			channelId: options.channelId,
			limit: options.limit,
		});

	const deleteMessage = (id: string) =>
		convexClient.use(
			(
				client: ConvexClientShared,
				convexApi: { api: typeof api; internal: typeof internal },
			) =>
				client.mutation(convexApi.api.messages.deleteMessage, {
					id,
				}),
		);

	const deleteManyMessages = (ids: string[]) =>
		convexClient.use(
			(
				client: ConvexClientShared,
				convexApi: { api: typeof api; internal: typeof internal },
			) =>
				client.mutation(convexApi.api.messages.deleteManyMessages, {
					ids,
				}),
		);

	const deleteManyMessagesByChannelId = (channelId: string) =>
		convexClient.use(
			(
				client: ConvexClientShared,
				convexApi: { api: typeof api; internal: typeof internal },
			) =>
				client.mutation(convexApi.api.messages.deleteManyMessagesByChannelId, {
					channelId,
				}),
		);

	const deleteManyMessagesByUserId = (userId: string) =>
		convexClient.use(
			(
				client: ConvexClientShared,
				convexApi: { api: typeof api; internal: typeof internal },
			) =>
				client.mutation(convexApi.api.messages.deleteManyMessagesByUserId, {
					userId,
				}),
		);

	// Attachment methods
	const uploadAttachmentFromUrl = (options: {
		url: string;
		filename: string;
		contentType?: string;
	}) =>
		convexClient.use(
			(
				client: ConvexClientShared,
				convexApi: { api: typeof api; internal: typeof internal },
			) =>
				client.action(convexApi.api.attachments.uploadAttachmentFromUrl, {
					url: options.url,
					filename: options.filename,
					contentType: options.contentType,
				}),
		);

	const uploadManyAttachmentsFromUrls = (
		attachments: Array<{
			id: string;
			url: string;
			filename: string;
			contentType?: string;
		}>,
	) =>
		convexClient.use(
			(
				client: ConvexClientShared,
				convexApi: { api: typeof api; internal: typeof internal },
			) =>
				client.action(convexApi.api.attachments.uploadManyAttachmentsFromUrls, {
					attachments,
				}),
		);

	const getAttachmentUrl = (storageId: Id<"_storage">) =>
		convexClient.use(
			(
				client: ConvexClientShared,
				convexApi: { api: typeof api; internal: typeof internal },
			) =>
				client.action(convexApi.api.attachments.getAttachmentUrl, {
					storageId,
				}),
		);

	const getDiscordAccountById = (id: string) =>
		watchQueryToLiveData(
			({ api }) => api.discord_accounts.getDiscordAccountById,
			{
				id,
			},
		);

	const findManyDiscordAccountsById = (ids: string[]) =>
		watchQueryToLiveData(
			({ api }) => api.discord_accounts.findManyDiscordAccountsById,
			{
				ids,
			},
		);

	const createDiscordAccount = (account: DiscordAccount) =>
		convexClient.use(
			(
				client: ConvexClientShared,
				convexApi: { api: typeof api; internal: typeof internal },
			) =>
				client.mutation(convexApi.api.discord_accounts.createDiscordAccount, {
					account,
				}),
		);

	const createManyDiscordAccounts = (accounts: DiscordAccount[]) =>
		convexClient.use(
			(
				client: ConvexClientShared,
				convexApi: { api: typeof api; internal: typeof internal },
			) =>
				client.mutation(
					convexApi.api.discord_accounts.createManyDiscordAccounts,
					{
						accounts,
					},
				),
		);

	const updateDiscordAccount = (account: DiscordAccount) =>
		convexClient.use(
			(
				client: ConvexClientShared,
				convexApi: { api: typeof api; internal: typeof internal },
			) =>
				client.mutation(convexApi.api.discord_accounts.updateDiscordAccount, {
					account,
				}),
		);

	const updateManyDiscordAccounts = (accounts: DiscordAccount[]) =>
		convexClient.use(
			(
				client: ConvexClientShared,
				convexApi: { api: typeof api; internal: typeof internal },
			) =>
				client.mutation(
					convexApi.api.discord_accounts.updateManyDiscordAccounts,
					{
						accounts,
					},
				),
		);

	const upsertDiscordAccount = (account: DiscordAccount) =>
		convexClient.use(
			(
				client: ConvexClientShared,
				convexApi: { api: typeof api; internal: typeof internal },
			) =>
				client.mutation(convexApi.api.discord_accounts.upsertDiscordAccount, {
					account,
				}),
		);

	const upsertManyDiscordAccounts = (accounts: DiscordAccount[]) =>
		convexClient.use(
			(
				client: ConvexClientShared,
				convexApi: { api: typeof api; internal: typeof internal },
			) =>
				client.mutation(
					convexApi.api.discord_accounts.upsertManyDiscordAccounts,
					{
						accounts,
					},
				),
		);

	const deleteDiscordAccount = (id: string) =>
		convexClient.use(
			(
				client: ConvexClientShared,
				convexApi: { api: typeof api; internal: typeof internal },
			) =>
				client.mutation(convexApi.api.discord_accounts.deleteDiscordAccount, {
					id,
				}),
		);

	const findIgnoredDiscordAccountById = (id: string) =>
		watchQueryToLiveData(
			({ api }) => api.ignored_discord_accounts.findIgnoredDiscordAccountById,
			{
				id,
			},
		);

	const findManyIgnoredDiscordAccountsById = (ids: string[]) =>
		watchQueryToLiveData(
			({ api }) =>
				api.ignored_discord_accounts.findManyIgnoredDiscordAccountsById,
			{
				ids,
			},
		);

	const upsertIgnoredDiscordAccount = (id: string) =>
		convexClient.use(
			(
				client: ConvexClientShared,
				convexApi: { api: typeof api; internal: typeof internal },
			) =>
				client.mutation(
					convexApi.api.ignored_discord_accounts.upsertIgnoredDiscordAccount,
					{
						id,
					},
				),
		);

	const deleteIgnoredDiscordAccount = (id: string) =>
		convexClient.use(
			(
				client: ConvexClientShared,
				convexApi: { api: typeof api; internal: typeof internal },
			) =>
				client.mutation(
					convexApi.api.ignored_discord_accounts.deleteIgnoredDiscordAccount,
					{
						id,
					},
				),
		);

	const checkIfIgnored = (id: string) =>
		Effect.gen(function* () {
			const ignoredAccountLiveData = yield* Effect.scoped(
				findIgnoredDiscordAccountById(id),
			);
			return ignoredAccountLiveData?.data !== null;
		});

	const findUserServerSettingsById = (
		userId: string,
		serverId: Id<"servers">,
	) =>
		watchQueryToLiveData(
			({ api }) => api.user_server_settings.findUserServerSettingsById,
			{
				userId,
				serverId,
			},
		);

	const findManyUserServerSettings = (
		settings: Array<{
			userId: string;
			serverId: Id<"servers">;
		}>,
	) =>
		watchQueryToLiveData(
			({ api }) => api.user_server_settings.findManyUserServerSettings,
			{
				settings,
			},
		);

	const findUserServerSettingsByApiKey = (apiKey: string) =>
		watchQueryToLiveData(
			({ api }) => api.user_server_settings.findUserServerSettingsByApiKey,
			{
				apiKey,
			},
		);

	const createUserServerSettings = (settings: UserServerSettings) =>
		convexClient.use(
			(
				client: ConvexClientShared,
				convexApi: { api: typeof api; internal: typeof internal },
			) => {
				// In test mode, use internal mutations to bypass authentication
				// The test client supports calling internal mutations
				return client.mutation(
					convexApi.internal.user_server_settings
						.createUserServerSettingsInternal,
					{
						settings,
					},
				);
			},
		);

	const updateUserServerSettings = (settings: UserServerSettings) =>
		convexClient.use(
			(
				client: ConvexClientShared,
				convexApi: { api: typeof api; internal: typeof internal },
			) =>
				client.mutation(
					convexApi.internal.user_server_settings
						.updateUserServerSettingsInternal,
					{
						settings,
					},
				),
		);

	const upsertUserServerSettings = (settings: UserServerSettings) =>
		convexClient.use(
			(
				client: ConvexClientShared,
				convexApi: { api: typeof api; internal: typeof internal },
			) =>
				client.mutation(
					convexApi.internal.user_server_settings
						.upsertUserServerSettingsInternal,
					{
						settings,
					},
				),
		);

	const increaseApiKeyUsage = (apiKey: string) =>
		convexClient.use(
			(
				client: ConvexClientShared,
				convexApi: { api: typeof api; internal: typeof internal },
			) =>
				client.mutation(
					convexApi.api.user_server_settings.increaseApiKeyUsage,
					{
						apiKey,
					},
				),
		);

	const countConsentingUsersInServer = (serverId: Id<"servers">) =>
		watchQueryToLiveData(
			({ api }) => api.user_server_settings.countConsentingUsersInServer,
			{
				serverId,
			},
		);

	const countConsentingUsersInManyServers = (serverIds: Id<"servers">[]) =>
		watchQueryToLiveData(
			({ api }) => api.user_server_settings.countConsentingUsersInManyServers,
			{
				serverIds,
			},
		);

	const getServerPreferencesByServerId = (serverId: Id<"servers">) =>
		watchQueryToLiveData(
			({ api }) => api.server_preferences.getServerPreferencesByServerId,
			{
				serverId,
			},
		);

	const createServerPreferences = (preferences: ServerPreferences) =>
		convexClient.use(
			(
				client: ConvexClientShared,
				convexApi: { api: typeof api; internal: typeof internal },
			) =>
				client.mutation(
					convexApi.internal.server_preferences.createServerPreferencesInternal,
					{
						preferences,
					},
				),
		);

	const updateServerPreferences = (preferences: ServerPreferences) =>
		convexClient.use(
			(
				client: ConvexClientShared,
				convexApi: { api: typeof api; internal: typeof internal },
			) =>
				client.mutation(
					convexApi.internal.server_preferences.updateServerPreferencesInternal,
					{
						preferences,
					},
				),
		);

	const upsertServerPreferences = (preferences: ServerPreferences) =>
		convexClient.use(
			(
				client: ConvexClientShared,
				convexApi: { api: typeof api; internal: typeof internal },
			) =>
				client.mutation(
					convexApi.internal.server_preferences.upsertServerPreferencesInternal,
					{
						preferences,
					},
				),
		);

	const deleteServerPreferences = (serverId: Id<"servers">) =>
		convexClient.use(
			(
				client: ConvexClientShared,
				convexApi: { api: typeof api; internal: typeof internal },
			) =>
				client.mutation(
					convexApi.internal.server_preferences.deleteServerPreferencesInternal,
					{
						serverId,
					},
				),
		);

	return {
		servers: {
			upsertServer,
			createServer,
			updateServer,
			getServerById,
			getServerByDiscordId,
			findServerByAlias,
			findServerByAliasOrId,
			findServerByCustomDomain,
			findServerByStripeCustomerId,
			findServerByStripeSubscriptionId,
			findManyServersById,
			getBiggestServers,
			findServerByIdWithChannels,
			publicGetAllServers,
		},
		channels: {
			getChannelByDiscordId,
			findChannelByInviteCode,
			findAllThreadsByParentId,
			findAllChannelsByServerId,
			findManyChannelsById,
			findLatestThreads,
			findChannelsBeforeId,
			createChannel,
			createManyChannels,
			updateChannel,
			updateManyChannels,
			deleteChannel,
			upsertManyChannels,
			upsertChannelWithSettings,
		},
		messages: {
			upsertMessage,
			upsertManyMessages,
			getMessageById,
			findMessagesByChannelId,
			findManyMessagesById,
			findMessagesByAuthorId,
			findMessagesByServerId,
			findMessagesByParentChannelId,
			findLatestMessageInChannel,
			findLatestMessageInChannelAndThreads,
			findAttachmentsByMessageId,
			findReactionsByMessageId,
			findEmojiById,
			countMessagesInChannel,
			countMessagesInManyChannels,
			getTotalMessageCount,
			findSolutionsByQuestionId,
			getTopQuestionSolversByServerId,
			getMessagePageData,
			searchMessages,
			deleteMessage,
			deleteManyMessages,
			deleteManyMessagesByChannelId,
			deleteManyMessagesByUserId,
		},
		attachments: {
			uploadAttachmentFromUrl,
			uploadManyAttachmentsFromUrls,
			getAttachmentUrl,
		},
		discordAccounts: {
			getDiscordAccountById,
			findManyDiscordAccountsById,
			createDiscordAccount,
			createManyDiscordAccounts,
			updateDiscordAccount,
			updateManyDiscordAccounts,
			upsertDiscordAccount,
			upsertManyDiscordAccounts,
			deleteDiscordAccount,
		},
		ignoredDiscordAccounts: {
			findIgnoredDiscordAccountById,
			findManyIgnoredDiscordAccountsById,
			upsertIgnoredDiscordAccount,
			deleteIgnoredDiscordAccount,
			checkIfIgnored,
		},
		userServerSettings: {
			findUserServerSettingsById,
			findManyUserServerSettings,
			findUserServerSettingsByApiKey,
			createUserServerSettings,
			updateUserServerSettings,
			upsertUserServerSettings,
			increaseApiKeyUsage,
			countConsentingUsersInServer,
			countConsentingUsersInManyServers,
		},
		serverPreferences: {
			getServerPreferencesByServerId,
			createServerPreferences,
			updateServerPreferences,
			upsertServerPreferences,
			deleteServerPreferences,
		},
	};
});

export class Database extends Context.Tag("Database")<
	Database,
	Effect.Effect.Success<typeof service>
>() {}

export const DatabaseLayer = Layer.effect(Database, service).pipe(
	Layer.provide(ConvexClientLiveUnifiedLayer),
);

/**
 * Upsert a single message to the database
 * Matches the old codebase interface for compatibility
 */
export async function upsertMessage(
	data: BaseMessageWithRelations,
	opts?: {
		ignoreChecks?: boolean;
	},
): Promise<void> {
	const program = Effect.gen(function* () {
		const db = yield* Database;
		yield* db.messages.upsertMessage({
			message: {
				id: data.id,
				authorId: data.authorId,
				serverId: data.serverId,
				channelId: data.channelId,
				parentChannelId: data.parentChannelId,
				childThreadId: data.childThreadId,
				questionId: data.questionId,
				referenceId: data.referenceId,
				applicationId: data.applicationId,
				interactionId: data.interactionId,
				webhookId: data.webhookId,
				content: data.content,
				flags: data.flags,
				type: data.type,
				pinned: data.pinned,
				nonce: data.nonce,
				tts: data.tts,
				embeds: data.embeds,
			},
			attachments: data.attachments,
			reactions: data.reactions,
			ignoreChecks: opts?.ignoreChecks,
		});
	}).pipe(Effect.provide(DatabaseLayer));

	await Effect.runPromise(program);
}

/**
 * Upsert many messages to the database
 * Matches the old codebase interface for compatibility
 * Returns the messages that were successfully upserted
 */
export async function upsertManyMessages(
	data: BaseMessageWithRelations[],
	opts?: {
		ignoreChecks?: boolean;
	},
): Promise<BaseMessageWithRelations[]> {
	if (data.length === 0) return Promise.resolve([]);

	const program = Effect.gen(function* () {
		const db = yield* Database;
		yield* db.messages.upsertManyMessages({
			messages: data.map((msg) => ({
				message: {
					id: msg.id,
					authorId: msg.authorId,
					serverId: msg.serverId,
					channelId: msg.channelId,
					parentChannelId: msg.parentChannelId,
					childThreadId: msg.childThreadId,
					questionId: msg.questionId,
					referenceId: msg.referenceId,
					applicationId: msg.applicationId,
					interactionId: msg.interactionId,
					webhookId: msg.webhookId,
					content: msg.content,
					flags: msg.flags,
					type: msg.type,
					pinned: msg.pinned,
					nonce: msg.nonce,
					tts: msg.tts,
					embeds: msg.embeds,
				},
				attachments: msg.attachments,
				reactions: msg.reactions,
			})),
			ignoreChecks: opts?.ignoreChecks,
		});
		return data; // Return the input data as the old API does
	}).pipe(Effect.provide(DatabaseLayer));

	return await Effect.runPromise(program);
}
