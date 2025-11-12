import { Config, Context, Effect, Layer } from "effect";
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
import { createWatchQueryToLiveData } from "./watch-query-scoped";

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
	const backendAccessToken = yield* Config.string("BACKEND_ACCESS_TOKEN");
	const convexClient = yield* ConvexClientUnified;

	const watchQueryToLiveData = createWatchQueryToLiveData(convexClient, {
		api,
		internal,
	});

	const upsertServer = (data: Server) =>
		convexClient.use((client: ConvexClientShared, convexApi) =>
			client.mutation(
				convexApi.api.publicInternal.servers.upsertServerExternal,
				{
					backendAccessToken,
					data,
				},
			),
		);

	const createServer = (data: Server) =>
		convexClient.use((client: ConvexClientShared, convexApi) =>
			client.mutation(
				convexApi.api.publicInternal.servers.createServerExternal,
				{
					backendAccessToken,
					data,
				},
			),
		);

	const updateServer = (id: Id<"servers">, data: Server) =>
		convexClient.use((client, convexApi) =>
			client.mutation(
				convexApi.api.publicInternal.servers.updateServerExternal,
				{
					backendAccessToken,
					id,
					data,
				},
			),
		);

	const getServerById = (id: Id<"servers">) =>
		watchQueryToLiveData(({ api }) => api.public.servers.publicGetServerById, {
			id,
		});

	const getServerByDiscordId = (discordId: string) =>
		watchQueryToLiveData(
			({ api }) => api.public.servers.publicGetServerByDiscordId,
			{
				discordId,
			},
		);

	const findServerByAlias = (alias: string) =>
		watchQueryToLiveData(
			({ api }) => api.public.servers.publicFindServerByAlias,
			{
				alias,
			},
		);

	const findServerByAliasOrId = (aliasOrId: string) =>
		watchQueryToLiveData(
			({ api }) => api.public.servers.publicFindServerByAliasOrId,
			{
				aliasOrId,
			},
		);

	const findServerByCustomDomain = (domain: string) =>
		watchQueryToLiveData(
			({ api }) => api.public.servers.publicFindServerByCustomDomain,
			{
				domain,
			},
		);

	const findServerByStripeCustomerId = (stripeCustomerId: string) =>
		watchQueryToLiveData(
			({ api }) => api.public.servers.publicFindServerByStripeCustomerId,
			{
				stripeCustomerId,
			},
		);

	const findServerByStripeSubscriptionId = (stripeSubscriptionId: string) =>
		watchQueryToLiveData(
			({ api }) => api.public.servers.publicFindServerByStripeSubscriptionId,
			{
				stripeSubscriptionId,
			},
		);

	const findManyServersById = (ids: Id<"servers">[]) =>
		watchQueryToLiveData(
			({ api }) => api.public.servers.publicFindManyServersById,
			{
				ids,
			},
		);

	const getBiggestServers = (take: number) =>
		watchQueryToLiveData(
			({ api }) => api.public.servers.publicGetBiggestServers,
			{
				take,
			},
		);

	const findServerByIdWithChannels = (id: Id<"servers">) =>
		watchQueryToLiveData(
			({ api }) => api.public.servers.publicFindServerByIdWithChannels,
			{
				id,
			},
		);

	const publicGetAllServers = () =>
		watchQueryToLiveData(
			({ api }) => api.public.servers.publicGetAllServers,
			{},
		);

	const getChannelByDiscordId = (discordId: string) =>
		watchQueryToLiveData(
			({ api }) => api.public.channels.getChannelByDiscordId,
			{
				discordId,
			},
		);

	const findChannelByInviteCode = (inviteCode: string) =>
		watchQueryToLiveData(
			({ api }) => api.publicInternal.channels.findChannelByInviteCode,
			{
				backendAccessToken,
				inviteCode,
			},
		);

	const findChannelByDiscordId = (discordId: string) =>
		watchQueryToLiveData(
			({ api }) => api.publicInternal.channels.findChannelByDiscordId,
			{
				backendAccessToken,
				discordId,
			},
		);

	const findAllThreadsByParentId = (parentId: string, limit?: number) =>
		watchQueryToLiveData(
			({ api }) => api.publicInternal.channels.findAllThreadsByParentId,
			{
				backendAccessToken,
				parentId,
				limit,
			},
		);

	const findAllChannelsByServerId = (serverId: Id<"servers">) =>
		watchQueryToLiveData(
			({ api }) => api.publicInternal.channels.findAllChannelsByServerId,
			{
				backendAccessToken,
				serverId,
			},
		);

	const findManyChannelsById = (ids: string[], includeMessageCount?: boolean) =>
		watchQueryToLiveData(
			({ api }) => api.public.channels.findManyChannelsById,
			{
				ids,
				includeMessageCount,
			},
		);

	const findLatestThreads = (take: number) =>
		watchQueryToLiveData(
			({ api }) => api.publicInternal.channels.findLatestThreads,
			{
				backendAccessToken,
				take,
			},
		);

	const findChannelsBeforeId = (
		serverId: Id<"servers">,
		id: string,
		take?: number,
	) =>
		watchQueryToLiveData(
			({ api }) => api.publicInternal.channels.findChannelsBeforeId,
			{
				backendAccessToken,
				serverId,
				id,
				take,
			},
		);

	const createChannel = (data: {
		channel: Channel;
		settings?: ChannelSettings;
	}) =>
		convexClient.use((client: ConvexClientShared, convexApi) =>
			client.mutation(convexApi.api.publicInternal.channels.createChannel, {
				backendAccessToken,
				channel: data.channel,
				settings: data.settings,
			}),
		);

	const createManyChannels = (data: {
		channels: Array<{ channel: Channel; settings?: ChannelSettings }>;
	}) =>
		convexClient.use((client: ConvexClientShared, convexApi) =>
			client.mutation(
				convexApi.api.publicInternal.channels.createManyChannels,
				{
					backendAccessToken,
					channels: data.channels,
				},
			),
		);

	const updateChannel = (data: {
		id: string;
		channel: Channel;
		settings?: ChannelSettings;
	}) =>
		convexClient.use((client: ConvexClientShared, convexApi) =>
			client.mutation(convexApi.api.publicInternal.channels.updateChannel, {
				backendAccessToken,
				id: data.id,
				channel: data.channel,
				settings: data.settings,
			}),
		);

	const updateManyChannels = (channels: Channel[]) =>
		convexClient.use((client: ConvexClientShared, convexApi) =>
			client.mutation(
				convexApi.api.publicInternal.channels.updateManyChannels,
				{
					backendAccessToken,
					channels,
				},
			),
		);

	const deleteChannel = (id: string) =>
		convexClient.use((client: ConvexClientShared, convexApi) =>
			client.mutation(convexApi.api.publicInternal.channels.deleteChannel, {
				backendAccessToken,
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
		convexClient.use((client: ConvexClientShared, convexApi) =>
			client.mutation(
				convexApi.api.publicInternal.channels.upsertManyChannels,
				{
					backendAccessToken,
					channels: data.channels,
				},
			),
		);

	const upsertChannelWithSettings = (data: {
		channel: Channel;
		settings?: ChannelSettings;
	}) =>
		convexClient.use((client: ConvexClientShared, convexApi) =>
			client.mutation(
				convexApi.api.publicInternal.channels.upsertChannelWithSettings,
				{
					backendAccessToken,
					channel: data.channel,
					settings: data.settings,
				},
			),
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
		convexClient.use((client: ConvexClientShared, convexApi) =>
			client.mutation(convexApi.api.publicInternal.messages.upsertMessage, {
				backendAccessToken,
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
		convexClient.use((client: ConvexClientShared, convexApi) =>
			client.mutation(
				convexApi.api.publicInternal.messages.upsertManyMessages,
				{
					backendAccessToken,
					messages: data.messages,
					ignoreChecks: data.ignoreChecks,
				},
			),
		);

	const getMessageById = (id: string) =>
		watchQueryToLiveData(({ api }) => api.public.messages.getMessageById, {
			id,
		});

	const findMessagesByChannelId = (
		channelId: string,
		options?: { limit?: number; after?: string },
	) =>
		watchQueryToLiveData(
			({ api }) => api.public.messages.findMessagesByChannelId,
			{
				channelId,
				limit: options?.limit,
				after: options?.after,
			},
		);

	const findManyMessagesById = (ids: string[]) =>
		watchQueryToLiveData(
			({ api }) => api.publicInternal.messages.findManyMessagesById,
			{
				backendAccessToken,
				ids,
			},
		);

	const findMessagesByAuthorId = (authorId: string, limit?: number) =>
		watchQueryToLiveData(
			({ api }) => api.public.messages.findMessagesByAuthorId,
			{
				authorId,
				limit,
			},
		);

	const findMessagesByServerId = (serverId: Id<"servers">, limit?: number) =>
		watchQueryToLiveData(
			({ api }) => api.publicInternal.messages.findMessagesByServerId,
			{
				backendAccessToken,
				serverId,
				limit,
			},
		);

	const findMessagesByParentChannelId = (
		parentChannelId: string,
		limit?: number,
	) =>
		watchQueryToLiveData(
			({ api }) => api.publicInternal.messages.findMessagesByParentChannelId,
			{
				backendAccessToken,
				parentChannelId,
				limit,
			},
		);

	const findLatestMessageInChannel = (channelId: string) =>
		watchQueryToLiveData(
			({ api }) => api.publicInternal.messages.findLatestMessageInChannel,
			{
				backendAccessToken,
				channelId,
			},
		);

	const findLatestMessageInChannelAndThreads = (channelId: string) =>
		watchQueryToLiveData(
			({ api }) =>
				api.publicInternal.messages.findLatestMessageInChannelAndThreads,
			{
				backendAccessToken,
				channelId,
			},
		);

	const findAttachmentsByMessageId = (messageId: string) =>
		watchQueryToLiveData(
			({ api }) => api.publicInternal.messages.findAttachmentsByMessageId,
			{
				backendAccessToken,
				messageId,
			},
		);

	const findReactionsByMessageId = (messageId: string) =>
		watchQueryToLiveData(
			({ api }) => api.publicInternal.messages.findReactionsByMessageId,
			{
				backendAccessToken,
				messageId,
			},
		);

	const findEmojiById = (id: string) =>
		watchQueryToLiveData(
			({ api }) => api.publicInternal.messages.findEmojiById,
			{
				backendAccessToken,
				id,
			},
		);

	const countMessagesInChannel = (channelId: string) =>
		watchQueryToLiveData(
			({ api }) => api.publicInternal.messages.countMessagesInChannel,
			{
				backendAccessToken,
				channelId,
			},
		);

	const countMessagesInManyChannels = (channelIds: string[]) =>
		watchQueryToLiveData(
			({ api }) => api.publicInternal.messages.countMessagesInManyChannels,
			{
				backendAccessToken,
				channelIds,
			},
		);

	const getTotalMessageCount = () =>
		watchQueryToLiveData(
			({ api }) => api.publicInternal.messages.getTotalMessageCount,
			{
				backendAccessToken,
			},
		);

	const findSolutionsByQuestionId = (questionId: string, limit?: number) =>
		watchQueryToLiveData(
			({ api }) => api.publicInternal.messages.findSolutionsByQuestionId,
			{
				backendAccessToken,
				questionId,
				limit,
			},
		);

	const getTopQuestionSolversByServerId = (
		serverId: Id<"servers">,
		limit?: number,
	) =>
		watchQueryToLiveData(
			({ api }) => api.publicInternal.messages.getTopQuestionSolversByServerId,
			{
				backendAccessToken,
				serverId,
				limit,
			},
		);

	const getMessagePageData = (messageId: string) =>
		watchQueryToLiveData(({ api }) => api.public.messages.getMessagePageData, {
			messageId,
		});

	const searchMessages = (options: {
		query: string;
		serverId?: Id<"servers">;
		channelId?: string;
		limit?: number;
	}) =>
		watchQueryToLiveData(({ api }) => api.public.messages.searchMessages, {
			query: options.query,
			serverId: options.serverId,
			channelId: options.channelId,
			limit: options.limit,
		});

	const deleteMessage = (id: string) =>
		convexClient.use((client: ConvexClientShared, convexApi) =>
			client.mutation(convexApi.api.publicInternal.messages.deleteMessage, {
				backendAccessToken,
				id,
			}),
		);

	const deleteManyMessages = (ids: string[]) =>
		convexClient.use((client: ConvexClientShared, convexApi) =>
			client.mutation(
				convexApi.api.publicInternal.messages.deleteManyMessages,
				{
					backendAccessToken,
					ids,
				},
			),
		);

	const deleteManyMessagesByChannelId = (channelId: string) =>
		convexClient.use((client: ConvexClientShared, convexApi) =>
			client.mutation(
				convexApi.api.publicInternal.messages.deleteManyMessagesByChannelId,
				{
					backendAccessToken,
					channelId,
				},
			),
		);

	const deleteManyMessagesByUserId = (userId: string) =>
		convexClient.use((client: ConvexClientShared, convexApi) =>
			client.mutation(
				convexApi.api.publicInternal.messages.deleteManyMessagesByUserId,
				{
					backendAccessToken,
					userId,
				},
			),
		);

	// Attachment methods
	const uploadAttachmentFromUrl = (options: {
		url: string;
		filename: string;
		contentType?: string;
	}) =>
		convexClient.use((client: ConvexClientShared, convexApi) =>
			client.action(
				convexApi.api.publicInternal.attachments.uploadAttachmentFromUrl,
				{
					backendAccessToken,
					url: options.url,
					filename: options.filename,
					contentType: options.contentType,
				},
			),
		);

	const uploadManyAttachmentsFromUrls = (
		attachments: Array<{
			id: string;
			url: string;
			filename: string;
			contentType?: string;
		}>,
	) =>
		convexClient.use((client: ConvexClientShared, convexApi) =>
			client.action(
				convexApi.api.publicInternal.attachments.uploadManyAttachmentsFromUrls,
				{
					backendAccessToken,
					attachments,
				},
			),
		);

	const getAttachmentUrl = (storageId: Id<"_storage">) =>
		convexClient.use((client: ConvexClientShared, convexApi) =>
			client.action(convexApi.api.publicInternal.attachments.getAttachmentUrl, {
				backendAccessToken,
				storageId,
			}),
		);

	const getDiscordAccountById = (id: string) =>
		watchQueryToLiveData(
			({ api }) => api.publicInternal.discord_accounts.getDiscordAccountById,
			{
				backendAccessToken,
				id,
			},
		);

	const findManyDiscordAccountsById = (ids: string[]) =>
		watchQueryToLiveData(
			({ api }) => api.public.discord_accounts.findManyDiscordAccountsById,
			{
				ids,
			},
		);

	const createDiscordAccount = (account: DiscordAccount) =>
		convexClient.use((client: ConvexClientShared, convexApi) =>
			client.mutation(
				convexApi.api.publicInternal.discord_accounts.createDiscordAccount,
				{
					backendAccessToken,
					account,
				},
			),
		);

	const createManyDiscordAccounts = (accounts: DiscordAccount[]) =>
		convexClient.use((client: ConvexClientShared, convexApi) =>
			client.mutation(
				convexApi.api.publicInternal.discord_accounts.createManyDiscordAccounts,
				{
					backendAccessToken,
					accounts,
				},
			),
		);

	const updateDiscordAccount = (account: DiscordAccount) =>
		convexClient.use((client: ConvexClientShared, convexApi) =>
			client.mutation(
				convexApi.api.publicInternal.discord_accounts.updateDiscordAccount,
				{
					backendAccessToken,
					account,
				},
			),
		);

	const updateManyDiscordAccounts = (accounts: DiscordAccount[]) =>
		convexClient.use((client: ConvexClientShared, convexApi) =>
			client.mutation(
				convexApi.api.publicInternal.discord_accounts.updateManyDiscordAccounts,
				{
					backendAccessToken,
					accounts,
				},
			),
		);

	const upsertDiscordAccount = (account: DiscordAccount) =>
		convexClient.use((client: ConvexClientShared, convexApi) =>
			client.mutation(
				convexApi.api.publicInternal.discord_accounts.upsertDiscordAccount,
				{
					backendAccessToken,
					account,
				},
			),
		);

	const upsertManyDiscordAccounts = (accounts: DiscordAccount[]) =>
		convexClient.use((client: ConvexClientShared, convexApi) =>
			client.mutation(
				convexApi.api.publicInternal.discord_accounts.upsertManyDiscordAccounts,
				{
					backendAccessToken,
					accounts,
				},
			),
		);

	const deleteDiscordAccount = (id: string) =>
		convexClient.use((client: ConvexClientShared, convexApi) =>
			client.mutation(
				convexApi.api.publicInternal.discord_accounts.deleteDiscordAccount,
				{
					backendAccessToken,
					id,
				},
			),
		);

	const findIgnoredDiscordAccountById = (id: string) =>
		watchQueryToLiveData(
			({ api }) =>
				api.publicInternal.ignored_discord_accounts
					.findIgnoredDiscordAccountById,
			{
				backendAccessToken,
				id,
			},
		);

	const findManyIgnoredDiscordAccountsById = (ids: string[]) =>
		watchQueryToLiveData(
			({ api }) =>
				api.publicInternal.ignored_discord_accounts
					.findManyIgnoredDiscordAccountsById,
			{
				backendAccessToken,
				ids,
			},
		);

	const upsertIgnoredDiscordAccount = (id: string) =>
		convexClient.use((client: ConvexClientShared, convexApi) =>
			client.mutation(
				convexApi.api.publicInternal.ignored_discord_accounts
					.upsertIgnoredDiscordAccount,
				{
					backendAccessToken,
					id,
				},
			),
		);

	const deleteIgnoredDiscordAccount = (id: string) =>
		convexClient.use((client: ConvexClientShared, convexApi) =>
			client.mutation(
				convexApi.api.publicInternal.ignored_discord_accounts
					.deleteIgnoredDiscordAccount,
				{
					backendAccessToken,
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
			({ api }) =>
				api.publicInternal.user_server_settings.findUserServerSettingsById,
			{
				backendAccessToken,
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
			({ api }) =>
				api.publicInternal.user_server_settings.findManyUserServerSettings,
			{
				backendAccessToken,
				settings,
			},
		);

	const findUserServerSettingsByApiKey = (apiKey: string) =>
		watchQueryToLiveData(
			({ api }) =>
				api.publicInternal.user_server_settings.findUserServerSettingsByApiKey,
			{
				backendAccessToken,
				apiKey,
			},
		);

	const upsertUserServerSettings = (settings: UserServerSettings) =>
		convexClient.use((client: ConvexClientShared, convexApi) =>
			client.mutation(
				convexApi.api.publicInternal.user_server_settings
					.upsertUserServerSettingsInternal,
				{
					backendAccessToken,
					settings,
				},
			),
		);

	const countConsentingUsersInServer = (serverId: Id<"servers">) =>
		watchQueryToLiveData(
			({ api }) =>
				api.publicInternal.user_server_settings.countConsentingUsersInServer,
			{
				backendAccessToken,
				serverId,
			},
		);

	const countConsentingUsersInManyServers = (serverIds: Id<"servers">[]) =>
		watchQueryToLiveData(
			({ api }) =>
				api.publicInternal.user_server_settings
					.countConsentingUsersInManyServers,
			{
				backendAccessToken,
				serverIds,
			},
		);

	const getServerPreferencesByServerId = (serverId: Id<"servers">) =>
		watchQueryToLiveData(
			({ api }) =>
				api.publicInternal.server_preferences.getServerPreferencesByServerId,
			{
				backendAccessToken,
				serverId,
			},
		);

	const createServerPreferences = (preferences: ServerPreferences) =>
		convexClient.use((client: ConvexClientShared, convexApi) =>
			client.mutation(
				convexApi.api.publicInternal.server_preferences.createServerPreferences,
				{
					backendAccessToken,
					preferences,
				},
			),
		);

	const updateServerPreferences = (preferences: ServerPreferences) =>
		convexClient.use((client: ConvexClientShared, convexApi) =>
			client.mutation(
				convexApi.api.publicInternal.server_preferences.updateServerPreferences,
				{
					backendAccessToken,
					preferences,
				},
			),
		);

	const upsertServerPreferences = (preferences: ServerPreferences) =>
		convexClient.use((client: ConvexClientShared, convexApi) =>
			client.mutation(
				convexApi.api.publicInternal.server_preferences.upsertServerPreferences,
				{
					backendAccessToken,
					preferences,
				},
			),
		);

	const deleteServerPreferences = (serverId: Id<"servers">) =>
		convexClient.use((client: ConvexClientShared, convexApi) =>
			client.mutation(
				convexApi.api.publicInternal.server_preferences.deleteServerPreferences,
				{
					backendAccessToken,
					serverId,
				},
			),
		);

	const publicFindAllThreadsByParentId = (parentId: string, limit?: number) =>
		watchQueryToLiveData(
			({ api }) => api.public.channels.findAllThreadsByParentId,
			{
				parentId,
				limit,
			},
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
			findChannelByDiscordId,
			findAllThreadsByParentId,
			publicFindAllThreadsByParentId,
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
			upsertUserServerSettings,
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
