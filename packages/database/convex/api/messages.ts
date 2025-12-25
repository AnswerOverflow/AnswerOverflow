import { v } from "convex/values";
import { getOneFrom } from "convex-helpers/server/relationships";
import { apiKeyMutation } from "../client/apiKey";
import {
	assertGuildManagerPermission,
	checkGuildManagerPermissions,
} from "../shared/guildManagerPermissions";

export const markSolution = apiKeyMutation({
	args: {
		messageId: v.int64(),
		solutionId: v.int64(),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const message = await getOneFrom(
			ctx.db,
			"messages",
			"by_messageId",
			args.messageId,
			"id",
		);
		if (!message) {
			throw new Error("Message not found");
		}

		const permissionResult = await checkGuildManagerPermissions(
			ctx,
			args.discordAccountId,
			message.serverId,
		);
		assertGuildManagerPermission(permissionResult);

		const solutionMessage = await getOneFrom(
			ctx.db,
			"messages",
			"by_messageId",
			args.solutionId,
			"id",
		);
		if (!solutionMessage) {
			throw new Error("Solution message not found");
		}

		if (solutionMessage.serverId !== message.serverId) {
			throw new Error("Solution message does not belong to the same server");
		}

		const existingSolutions = await ctx.db
			.query("messages")
			.withIndex("by_serverId_and_questionId", (q) =>
				q.eq("serverId", message.serverId).eq("questionId", args.messageId),
			)
			.collect();

		for (const existingSolution of existingSolutions) {
			if (existingSolution._id !== solutionMessage._id) {
				await ctx.db.patch(existingSolution._id, {
					questionId: undefined,
				});
			}
		}

		await ctx.db.patch(solutionMessage._id, {
			questionId: args.messageId,
		});

		return null;
	},
});
