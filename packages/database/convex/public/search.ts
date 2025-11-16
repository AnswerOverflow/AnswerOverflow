import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { asyncMap } from "convex-helpers";
import {
	findAttachmentsByMessageId,
	findReactionsByMessageId,
	findSolutionsByQuestionId,
	getDiscordAccountById,
} from "../shared/shared";
import { publicQuery } from "./custom_functions";

export const publicSearch = publicQuery({
	args: {
		query: v.string(),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (ctx, args) => {
		console.log(args);
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

		const messagesWithData = await Promise.all(
			messages.map(async (message) => {
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
			}),
		);

		return {
			...paginatedResult,
			page: messagesWithData,
		};
	},
});
