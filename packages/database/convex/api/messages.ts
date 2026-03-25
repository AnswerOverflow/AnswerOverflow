import { type Infer, v } from "convex/values";
import { getOneFrom } from "convex-helpers/server/relationships";
import { apiKeyMutation } from "../client/apiKey";
import { DEFAULT_CHANNEL_SETTINGS } from "../shared/channels";
import {
	assertGuildManagerPermission,
	checkGuildManagerPermissions,
} from "../shared/guildManagerPermissions";

const analyticsMemberValidator = v.object({
	id: v.string(),
	joinedAt: v.optional(v.number()),
	timeInServerMs: v.optional(v.number()),
});

const analyticsMessageInfoValidator = v.object({
	id: v.string(),
	createdAt: v.number(),
	contentLength: v.number(),
	serverId: v.optional(v.string()),
	channelId: v.optional(v.string()),
	threadId: v.optional(v.string()),
});

const solvedQuestionTrackingPayloadValidator = v.object({
	server: v.object({
		id: v.string(),
		name: v.string(),
		readTheRulesConsentEnabled: v.boolean(),
		botTimeInServerMs: v.number(),
	}),
	channel: v.object({
		id: v.string(),
		name: v.string(),
		type: v.number(),
		serverId: v.optional(v.string()),
		inviteCode: v.optional(v.string()),
		solutionTagId: v.optional(v.string()),
		indexingEnabled: v.boolean(),
		markSolutionEnabled: v.boolean(),
		sendMarkSolutionInstructionsInNewThreads: v.boolean(),
		autoThreadEnabled: v.boolean(),
		forumGuidelinesConsentEnabled: v.boolean(),
	}),
	thread: v.object({
		id: v.string(),
		name: v.string(),
		type: v.number(),
		archivedTimestamp: v.optional(v.number()),
		parentId: v.optional(v.string()),
		parentName: v.optional(v.string()),
		parentType: v.optional(v.number()),
		messageCount: v.optional(v.number()),
	}),
	questionAsker: analyticsMemberValidator,
	questionSolver: analyticsMemberValidator,
	markAsSolver: analyticsMemberValidator,
	question: analyticsMessageInfoValidator,
	solution: analyticsMessageInfoValidator,
	accountId: v.string(),
	timeToSolveInMs: v.number(),
});

export type SolvedQuestionTrackingPayload = Infer<
	typeof solvedQuestionTrackingPayloadValidator
>;

const DISCORD_EPOCH = 1420070400000n;

function snowflakeToTimestamp(snowflake: bigint): number {
	return Number((snowflake >> 22n) + DISCORD_EPOCH);
}

function getThreadId(message: {
	channelId: bigint;
	parentChannelId?: bigint;
}): string | undefined {
	return message.parentChannelId ? message.channelId.toString() : undefined;
}

function toAnalyticsMessageInfo(message: {
	id: bigint;
	content: string;
	serverId: bigint;
	channelId: bigint;
	parentChannelId?: bigint;
}) {
	return {
		id: message.id.toString(),
		createdAt: snowflakeToTimestamp(message.id),
		contentLength: message.content.length,
		serverId: message.serverId.toString(),
		channelId: (message.parentChannelId ?? message.channelId).toString(),
		threadId: getThreadId(message),
	};
}

function getThreadChannelId(message: {
	channelId: bigint;
	parentChannelId?: bigint;
	childThreadId?: bigint;
}): bigint | undefined {
	return message.parentChannelId ? message.channelId : message.childThreadId;
}

export const updateSolution = apiKeyMutation({
	args: {
		messageId: v.int64(),
		solutionId: v.union(v.int64(), v.null()),
	},
	returns: v.union(v.null(), solvedQuestionTrackingPayloadValidator),
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

		const existingSolutions = await ctx.db
			.query("messages")
			.withIndex("by_serverId_and_questionId", (q) =>
				q.eq("serverId", message.serverId).eq("questionId", args.messageId),
			)
			.collect();

		const solutionWasAlreadySet =
			args.solutionId !== null &&
			existingSolutions.some(
				(existingSolution) => existingSolution.id === args.solutionId,
			);

		for (const existingSolution of existingSolutions) {
			if (existingSolution.id === args.solutionId) {
				continue;
			}
			await ctx.db.patch(existingSolution._id, {
				questionId: undefined,
			});
		}

		if (args.solutionId === null) {
			return null;
		}

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

		if (!solutionWasAlreadySet) {
			await ctx.db.patch(solutionMessage._id, {
				questionId: args.messageId,
			});
		}

		if (solutionWasAlreadySet) {
			return null;
		}

		const rootChannelId = message.parentChannelId ?? message.channelId;
		const threadChannelId =
			getThreadChannelId(message) ??
			getThreadChannelId(solutionMessage) ??
			message.channelId;

		const [
			server,
			serverPreferences,
			rootChannel,
			channelSettings,
			threadChannel,
		] = await Promise.all([
			getOneFrom(ctx.db, "servers", "by_discordId", message.serverId),
			getOneFrom(ctx.db, "serverPreferences", "by_serverId", message.serverId),
			getOneFrom(
				ctx.db,
				"channels",
				"by_discordChannelId",
				rootChannelId,
				"id",
			),
			getOneFrom(ctx.db, "channelSettings", "by_channelId", rootChannelId),
			getOneFrom(
				ctx.db,
				"channels",
				"by_discordChannelId",
				threadChannelId,
				"id",
			),
		]);

		const rootChannelSettings = channelSettings ?? {
			...DEFAULT_CHANNEL_SETTINGS,
			channelId: rootChannelId,
		};
		const analyticsThreadChannel = threadChannel ?? rootChannel;

		return {
			server: {
				id: message.serverId.toString(),
				name: server?.name ?? "Unknown Server",
				readTheRulesConsentEnabled:
					serverPreferences?.readTheRulesConsentEnabled ?? false,
				botTimeInServerMs: 0,
			},
			channel: {
				id: rootChannelId.toString(),
				name: rootChannel?.name ?? "Unknown Channel",
				type: rootChannel?.type ?? 0,
				serverId: message.serverId.toString(),
				inviteCode: rootChannelSettings.inviteCode,
				solutionTagId: rootChannelSettings.solutionTagId?.toString(),
				indexingEnabled: rootChannelSettings.indexingEnabled,
				markSolutionEnabled: rootChannelSettings.markSolutionEnabled,
				sendMarkSolutionInstructionsInNewThreads:
					rootChannelSettings.sendMarkSolutionInstructionsInNewThreads,
				autoThreadEnabled: rootChannelSettings.autoThreadEnabled,
				forumGuidelinesConsentEnabled:
					rootChannelSettings.forumGuidelinesConsentEnabled,
			},
			thread: {
				id: (analyticsThreadChannel?.id ?? threadChannelId).toString(),
				name: analyticsThreadChannel?.name ?? "Unknown Thread",
				type: analyticsThreadChannel?.type ?? 0,
				archivedTimestamp: analyticsThreadChannel?.archivedTimestamp,
				parentId:
					rootChannelId !== (analyticsThreadChannel?.id ?? threadChannelId)
						? rootChannelId.toString()
						: analyticsThreadChannel?.parentId?.toString(),
				parentName:
					rootChannelId !== (analyticsThreadChannel?.id ?? threadChannelId)
						? rootChannel?.name
						: undefined,
				parentType:
					rootChannelId !== (analyticsThreadChannel?.id ?? threadChannelId)
						? rootChannel?.type
						: undefined,
			},
			questionAsker: {
				id: message.authorId.toString(),
			},
			questionSolver: {
				id: solutionMessage.authorId.toString(),
			},
			markAsSolver: {
				id: args.discordAccountId.toString(),
			},
			question: toAnalyticsMessageInfo(message),
			solution: toAnalyticsMessageInfo(solutionMessage),
			accountId: solutionMessage.authorId.toString(),
			timeToSolveInMs:
				snowflakeToTimestamp(solutionMessage.id) -
				snowflakeToTimestamp(message.id),
		};
	},
});
