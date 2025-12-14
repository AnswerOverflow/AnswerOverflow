import { getOneFrom } from "convex-helpers/server/relationships";
import { Array as Arr, Predicate } from "effect";
import type { MutationCtx, QueryCtx } from "../client";

async function getDiscordAccountByIdInternal(
	ctx: QueryCtx | MutationCtx,
	id: bigint,
) {
	return await getOneFrom(
		ctx.db,
		"discordAccounts",
		"by_discordAccountId",
		id,
		"id",
	);
}

async function getMessageByIdInternal(ctx: QueryCtx | MutationCtx, id: bigint) {
	return await getOneFrom(ctx.db, "messages", "by_messageId", id, "id");
}

export function extractMentionIds(content: string): {
	userIds: bigint[];
	channelIds: bigint[];
} {
	const userIds = new Set<bigint>();
	const channelIds = new Set<bigint>();

	const userMentionRegex = /<@(\d+)>/g;
	const channelMentionRegex = /<#(\d+)>/g;

	for (const match of content.matchAll(userMentionRegex)) {
		if (match[1]) {
			userIds.add(BigInt(match[1]));
		}
	}

	for (const match of content.matchAll(channelMentionRegex)) {
		if (match[1]) {
			channelIds.add(BigInt(match[1]));
		}
	}

	return {
		userIds: Array.from(userIds),
		channelIds: Array.from(channelIds),
	};
}

export function extractDiscordLinks(content: string): Array<{
	original: string;
	guildId: bigint;
	channelId: bigint;
	messageId?: bigint;
}> {
	const discordLinkRegex =
		/https:\/\/discord\.com\/channels\/(\d+)\/(\d+)(?:\/(\d+))?/g;

	const matches = content.matchAll(discordLinkRegex);
	return Arr.map(Array.from(matches), (match) => {
		const guildId = match[1];
		const channelId = match[2];
		const messageId = match[3];
		if (!guildId || !channelId) {
			return undefined;
		}
		return {
			original: match[0],
			guildId: BigInt(guildId),
			channelId: BigInt(channelId),
			messageId: messageId ? BigInt(messageId) : undefined,
		};
	}).filter(Predicate.isNotNullable);
}

export async function getMentionMetadata(
	ctx: QueryCtx | MutationCtx,
	userIds: bigint[],
	channelIds: bigint[],
	serverDiscordId: bigint,
) {
	const users: Record<
		string,
		{
			username: string;
			globalName: string | null;
			url: string;
			exists?: boolean;
		}
	> = {};
	const channels: Record<
		string,
		{
			name: string;
			type: number;
			url: string;
			indexingEnabled?: boolean;
			exists?: boolean;
		}
	> = {};

	for (const userId of userIds) {
		const account = await getDiscordAccountByIdInternal(ctx, userId);
		const userIdStr = userId.toString();
		if (account) {
			users[userIdStr] = {
				username: account.name,
				globalName: null,
				url: `/u/${userId}`,
				exists: true,
			};
		} else {
			users[userIdStr] = {
				username: "Unknown user",
				globalName: null,
				url: "",
				exists: false,
			};
		}
	}

	for (const channelId of channelIds) {
		const [channel, settings] = await Promise.all([
			getOneFrom(ctx.db, "channels", "by_discordChannelId", channelId, "id"),
			getOneFrom(ctx.db, "channelSettings", "by_channelId", channelId),
		]);

		const channelIdStr = channelId.toString();
		if (channel) {
			const indexingEnabled = settings?.indexingEnabled ?? false;
			channels[channelIdStr] = {
				name: channel.name,
				type: channel.type,
				url: indexingEnabled
					? `/c/${serverDiscordId}/${channelId}`
					: `https://discord.com/channels/${serverDiscordId}/${channelId}`,
				indexingEnabled,
				exists: true,
			};
		} else {
			channels[channelIdStr] = {
				name: "Unknown Channel",
				type: 0,
				url: `https://discord.com/channels/${serverDiscordId}/${channelId}`,
				indexingEnabled: false,
				exists: false,
			};
		}
	}

	return { users, channels };
}

export async function getInternalLinksMetadata(
	ctx: QueryCtx | MutationCtx,
	discordLinks: Array<{
		original: string;
		guildId: bigint;
		channelId: bigint;
		messageId?: bigint;
	}>,
) {
	if (discordLinks.length === 0) {
		return [];
	}

	const results = await Promise.all(
		discordLinks.map(async (link) => {
			const [server, channel, settings] = await Promise.all([
				getOneFrom(ctx.db, "servers", "by_discordId", link.guildId),
				getOneFrom(
					ctx.db,
					"channels",
					"by_discordChannelId",
					link.channelId,
					"id",
				),
				getOneFrom(ctx.db, "channelSettings", "by_channelId", link.channelId),
			]);

			if (!server || !channel) {
				return undefined;
			}

			if (link.messageId) {
				const message = await getMessageByIdInternal(ctx, link.messageId);
				if (!message) {
					return undefined;
				}
			}

			const parentChannel = channel.parentId
				? await getOneFrom(
						ctx.db,
						"channels",
						"by_discordChannelId",
						channel.parentId,
						"id",
					)
				: undefined;

			return {
				original: link.original,
				guild: { id: server.discordId, name: server.name },
				channel: {
					id: channel.id,
					type: channel.type,
					name: channel.name,
					indexingEnabled: settings?.indexingEnabled ?? false,
					parent: parentChannel
						? {
								name: parentChannel.name,
								type: parentChannel.type,
								parentId: parentChannel.id,
							}
						: undefined,
				},
				message: link.messageId,
			};
		}),
	);

	return Arr.filter(results, Predicate.isNotNullable);
}
