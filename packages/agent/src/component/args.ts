import { omit } from "convex-helpers";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import {
	vMessageEmbeddingsWithDimension,
	vMessageStatus,
	vMessageWithMetadataInternal,
} from "../validators";

export const addMessagesArgs = {
	userId: v.optional(v.string()),
	threadId: v.string(),
	promptMessageId: v.optional(v.string()),
	agentName: v.optional(v.string()),
	messages: v.array(vMessageWithMetadataInternal),
	embeddings: v.optional(vMessageEmbeddingsWithDimension),
	failPendingSteps: v.optional(v.boolean()),
	pendingMessageId: v.optional(v.string()),
	hideFromUserIdSearch: v.optional(v.boolean()),
};

export const listMessagesByThreadIdArgs = {
	threadId: v.string(),
	excludeToolMessages: v.optional(v.boolean()),
	order: v.union(v.literal("asc"), v.literal("desc")),
	paginationOpts: v.optional(paginationOptsValidator),
	statuses: v.optional(v.array(vMessageStatus)),
	upToAndIncludingMessageId: v.optional(v.string()),
};

export const finalizeMessageArgs = {
	messageId: v.string(),
	result: v.union(
		v.object({ status: v.literal("success") }),
		v.object({ status: v.literal("failed"), error: v.string() }),
	),
};

export const getMessageSearchFieldsArgs = {
	messageId: v.string(),
};

export const searchMessagesArgs = {
	threadId: v.optional(v.string()),
	searchAllMessagesForUserId: v.optional(v.string()),
	targetMessageId: v.optional(v.string()),
	embedding: v.optional(v.array(v.number())),
	embeddingModel: v.optional(v.string()),
	text: v.optional(v.string()),
	textSearch: v.optional(v.boolean()),
	vectorSearch: v.optional(v.boolean()),
	limit: v.number(),
	vectorScoreThreshold: v.optional(v.number()),
	messageRange: v.optional(v.object({ before: v.number(), after: v.number() })),
};

export const getThreadArgs = {
	threadId: v.string(),
};

export const createThreadArgs = {
	userId: v.optional(v.string()),
	title: v.optional(v.string()),
	summary: v.optional(v.string()),
	defaultSystemPrompt: v.optional(v.string()),
	parentThreadIds: v.optional(v.array(v.string())),
};

export const createStreamArgs = {
	threadId: v.string(),
	userId: v.optional(v.string()),
	agentName: v.optional(v.string()),
	model: v.optional(v.string()),
	provider: v.optional(v.string()),
	providerOptions: v.optional(v.record(v.string(), v.record(v.string(), v.any()))),
	format: v.optional(
		v.union(v.literal("UIMessageChunk"), v.literal("TextStreamPart")),
	),
	order: v.number(),
	stepOrder: v.number(),
};

export const addStreamDeltaArgs = {
	streamId: v.string(),
	start: v.number(),
	end: v.number(),
	parts: v.array(v.any()),
};

export const finishStreamArgs = {
	streamId: v.string(),
	finalDelta: v.optional(
		v.object({
			streamId: v.string(),
			start: v.number(),
			end: v.number(),
			parts: v.array(v.any()),
		}),
	),
};

export const abortStreamArgs = {
	streamId: v.string(),
	reason: v.string(),
	finalDelta: v.optional(
		v.object({
			streamId: v.string(),
			start: v.number(),
			end: v.number(),
			parts: v.array(v.any()),
		}),
	),
};

export const listStreamsArgs = {
	threadId: v.string(),
	startOrder: v.optional(v.number()),
	statuses: v.optional(
		v.array(
			v.union(
				v.literal("streaming"),
				v.literal("finished"),
				v.literal("aborted"),
			),
		),
	),
};

export const listStreamDeltasArgs = {
	threadId: v.string(),
	cursors: v.array(
		v.object({
			streamId: v.string(),
			cursor: v.number(),
		}),
	),
};
