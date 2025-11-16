import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { asyncMap } from "convex-helpers";
import {
	extractDiscordLinks,
	extractMentionIds,
	findAttachmentsByMessageId,
	findReactionsByMessageId,
	findSolutionsByQuestionId,
	getDiscordAccountById,
	getInternalLinksMetadata,
	getMentionMetadata,
} from "../shared/shared";
import { publicQuery } from "./custom_functions";

export const publicSearch = publicQuery({
	args: {
		query: v.string(),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (ctx, args) => {
		const paginationOpts = {
			...args.paginationOpts,
			numItems: Math.min(args.paginationOpts.numItems, 10),
		};
		const paginatedResult = await ctx.db
			.query("messages")
			.withSearchIndex("search_content", (q) => q.search("content", args.query))
			.paginate(paginationOpts);

		const messages = paginatedResult.page;

		const authorIds = new Set(messages.map((m) => m.authorId));

		const authors = await asyncMap(Array.from(authorIds), (id) =>
			getDiscordAccountById(ctx, id),
		);

		const authorMap = new Map(
			authors
				.filter((a): a is NonNullable<typeof a> => a !== null)
				.map((a) => [a.id, a]),
		);

		const allUserIds = new Set<string>();
		const allChannelIds = new Set<string>();
		const allDiscordLinks: Array<{
			original: string;
			guildId: string;
			channelId: string;
			messageId?: string;
		}> = [];
		const serverIds = new Set(messages.map((m) => m.serverId));

		const servers = await asyncMap(Array.from(serverIds), (id) =>
			ctx.db.get(id),
		);
		const serverMap = new Map(
			servers
				.filter((s): s is NonNullable<(typeof servers)[0]> => s !== null)
				.map((s) => [s._id, s.discordId]),
		);

		for (const message of messages) {
			const { userIds, channelIds } = extractMentionIds(message.content);
			for (const userId of userIds) {
				allUserIds.add(userId);
			}
			for (const channelId of channelIds) {
				allChannelIds.add(channelId);
			}
			const discordLinks = extractDiscordLinks(message.content);
			allDiscordLinks.push(...discordLinks);
		}

		const internalLinks = await getInternalLinksMetadata(ctx, allDiscordLinks);

		const messagesWithData = await Promise.all(
			messages.map(async (message) => {
				const serverDiscordId = serverMap.get(message.serverId);
				if (!serverDiscordId) {
					const [attachments, reactions, solutions] = await Promise.all([
						findAttachmentsByMessageId(ctx, message.id),
						findReactionsByMessageId(ctx, message.id),
						message.questionId
							? findSolutionsByQuestionId(ctx, message.questionId)
							: [],
					]);

					const author = authorMap.get(message.authorId);
					return {
						message,
						author: author
							? {
									id: author.id,
									name: author.name,
									avatar: author.avatar,
								}
							: null,
						attachments,
						reactions,
						solutions,
					};
				}

				const { userIds, channelIds } = extractMentionIds(message.content);
				const messageDiscordLinks = extractDiscordLinks(message.content);
				const messageInternalLinks = internalLinks.filter((link) =>
					messageDiscordLinks.some((dl) => dl.original === link.original),
				);

				const mentionMetadata = await getMentionMetadata(
					ctx,
					userIds,
					channelIds,
					serverDiscordId,
				);

				const messageUsers: Record<
					string,
					{ username: string; globalName: string | null; url: string }
				> = {};
				const messageChannels: Record<
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
					if (mentionMetadata.users[userId]) {
						messageUsers[userId] = mentionMetadata.users[userId];
					}
				}

				for (const channelId of channelIds) {
					const channelMeta = mentionMetadata.channels[channelId];
					if (channelMeta) {
						messageChannels[channelId] = channelMeta;
					} else {
						messageChannels[channelId] = {
							name: "Unknown Channel",
							type: 0,
							url: `https://discord.com/channels/${serverDiscordId}/${channelId}`,
							indexingEnabled: false,
							exists: false,
						};
					}
				}

				const [attachments, reactions, solutions] = await Promise.all([
					findAttachmentsByMessageId(ctx, message.id),
					findReactionsByMessageId(ctx, message.id),
					message.questionId
						? findSolutionsByQuestionId(ctx, message.questionId)
						: [],
				]);

				const author = authorMap.get(message.authorId);
				return {
					message,
					author: author
						? {
								id: author.id,
								name: author.name,
								avatar: author.avatar,
							}
						: null,
					attachments,
					reactions,
					solutions,
					metadata: {
						users:
							Object.keys(messageUsers).length > 0 ? messageUsers : undefined,
						channels:
							Object.keys(messageChannels).length > 0
								? messageChannels
								: undefined,
						internalLinks:
							messageInternalLinks.length > 0
								? messageInternalLinks
								: undefined,
					},
				};
			}),
		);

		return {
			...paginatedResult,
			page: messagesWithData,
		};
	},
});
