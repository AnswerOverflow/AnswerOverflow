import { omit, pick } from "convex-helpers";
import { v } from "convex/values";
import {
	type MessageWithMetadataInternal,
	type StreamDelta,
	type StreamMessage,
	vStreamDelta,
	vStreamMessage,
} from "../validators";
import { api, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
	internalMutation,
	mutation,
	type MutationCtx,
	query,
	action,
} from "./_generated/server";
import schema from "./schema";
import { stream } from "convex-helpers/server/stream";
import { mergedStream } from "convex-helpers/server/stream";
import { paginator } from "convex-helpers/server/pagination";
import type { WithoutSystemFields } from "convex/server";
import { deriveUIMessagesFromDeltas } from "../deltas";
import { fromUIMessagesAsync } from "../UIMessages";

const SECOND = 1000;
const MINUTE = 60 * SECOND;

const MAX_DELTAS_PER_REQUEST = 1000;
const MAX_DELTAS_PER_STREAM = 100;
const TIMEOUT_INTERVAL = 10 * MINUTE;
const DELETE_STREAM_DELAY = MINUTE * 5; // 5 minutes

const deltaValidator = schema.tables.streamDeltas.validator;

export const addDelta = mutation({
	args: deltaValidator,
	returns: v.boolean(),
	handler: async (ctx, args) => {
		const stream = await ctx.db.get(args.streamId);
		if (!stream) {
			console.warn("Stream not found", args.streamId);
			return false;
		}
		if (stream.state.kind !== "streaming") {
			return false;
		}
		await ctx.db.insert("streamDeltas", args);
		await heartbeatStream(ctx, { streamId: args.streamId });
		return true;
	},
});

export const listDeltas = query({
	args: {
		threadId: v.id("threads"),
		cursors: v.array(
			v.object({ streamId: v.id("streamingMessages"), cursor: v.number() }),
		),
	},
	returns: v.array(vStreamDelta),
	handler: async (ctx, args): Promise<StreamDelta[]> => {
		let totalDeltas = 0;
		const deltas: StreamDelta[] = [];
		for (const cursor of args.cursors) {
			const streamDeltas = await ctx.db
				.query("streamDeltas")
				.withIndex("streamId_start_end", (q) =>
					q.eq("streamId", cursor.streamId).gte("start", cursor.cursor),
				)
				.take(
					Math.min(MAX_DELTAS_PER_STREAM, MAX_DELTAS_PER_REQUEST - totalDeltas),
				);
			totalDeltas += streamDeltas.length;
			deltas.push(
				...streamDeltas.map((d) =>
					pick(d, ["streamId", "start", "end", "parts"]),
				),
			);
			if (totalDeltas >= MAX_DELTAS_PER_REQUEST) {
				break;
			}
		}
		return deltas;
	},
});

export const create = mutation({
	args: omit(schema.tables.streamingMessages.validator.fields, ["state"]),
	returns: v.id("streamingMessages"),
	handler: async (ctx, args) => {
		const state = { kind: "streaming" as const, lastHeartbeat: Date.now() };
		// TODO: enforce order/stepOrder uniqueness?
		const streamId = await ctx.db.insert("streamingMessages", {
			...args,
			state,
		});
		const timeoutFnId = await ctx.scheduler.runAfter(
			TIMEOUT_INTERVAL,
			internal.streams.timeoutStream,
			{ streamId },
		);
		await ctx.db.patch(streamId, { state: { ...state, timeoutFnId } });
		return streamId;
	},
});

export const list = query({
	args: {
		threadId: v.id("threads"),
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
	},
	returns: v.array(vStreamMessage),
	handler: async (ctx, args) => {
		const statuses = args.statuses ?? ["streaming"];
		const messages = await mergedStream(
			statuses.map((status) =>
				stream(ctx.db, schema)
					.query("streamingMessages")
					.withIndex("threadId_state_order_stepOrder", (q) =>
						q
							.eq("threadId", args.threadId)
							.eq("state.kind", status)
							.gte("order", args.startOrder ?? 0),
					)
					.order("desc"),
			),
			["order", "stepOrder"],
		).take(100);

		return messages.map((m) => publicStreamMessage(m));
	},
});

function publicStreamMessage(m: Doc<"streamingMessages">): StreamMessage {
	return {
		streamId: m._id,
		status: m.state.kind,
		...pick(m, [
			"format",
			"order",
			"stepOrder",
			"userId",
			"agentName",
			"model",
			"provider",
			"providerOptions",
		]),
	};
}

export const abortByOrder = mutation({
	args: { threadId: v.id("threads"), order: v.number(), reason: v.string() },
	returns: v.boolean(),
	handler: async (ctx, args) => {
		const streams = await ctx.db
			.query("streamingMessages")
			.withIndex("threadId_state_order_stepOrder", (q) =>
				q
					.eq("threadId", args.threadId)
					.eq("state.kind", "streaming")
					.eq("order", args.order),
			)
			.take(100);
		for (const stream of streams) {
			await abortById(ctx, { streamId: stream._id, reason: args.reason });
		}
		return streams.length > 0;
	},
});

export const abort = mutation({
	args: {
		streamId: v.id("streamingMessages"),
		reason: v.string(),
		finalDelta: v.optional(deltaValidator),
	},
	returns: v.boolean(),
	handler: abortById,
});

async function abortById(
	ctx: MutationCtx,
	args: {
		streamId: Id<"streamingMessages">;
		reason: string;
		finalDelta?: WithoutSystemFields<Doc<"streamDeltas">>;
	},
) {
	const stream = await ctx.db.get(args.streamId);
	if (!stream) {
		throw new Error(`Stream not found: ${args.streamId}`);
	}
	if (args.finalDelta) {
		await ctx.db.insert("streamDeltas", args.finalDelta);
	}
	if (stream.state.kind !== "streaming") {
		return false;
	}
	await cleanupTimeoutFn(ctx, stream);
	await ctx.db.patch(args.streamId, {
		state: { kind: "aborted", reason: args.reason },
	});
	return true;
}

async function cleanupTimeoutFn(
	ctx: MutationCtx,
	stream: Doc<"streamingMessages">,
) {
	if (stream.state.kind === "streaming" && stream.state.timeoutFnId) {
		const timeoutFn = await ctx.db.system.get(stream.state.timeoutFnId);
		if (timeoutFn?.state.kind === "pending") {
			await ctx.scheduler.cancel(stream.state.timeoutFnId);
		}
	}
}

// No longer used from the DeltaStreamer
export const finish = mutation({
	args: {
		streamId: v.id("streamingMessages"),
		finalDelta: v.optional(deltaValidator),
	},
	returns: v.null(),
	handler: finishHandler,
});

export async function finishHandler(
	ctx: MutationCtx,
	args: {
		streamId: Id<"streamingMessages">;
		finalDelta?: WithoutSystemFields<Doc<"streamDeltas">>;
	},
) {
	if (args.finalDelta) {
		await ctx.db.insert("streamDeltas", args.finalDelta);
	}
	const stream = await ctx.db.get(args.streamId);
	if (!stream) {
		throw new Error(`Stream not found: ${args.streamId}`);
	}
	if (stream.state.kind !== "streaming") {
		console.warn(
			`Stream trying to finish ${args.streamId} but is ${stream.state.kind}`,
		);
		return;
	}
	await cleanupTimeoutFn(ctx, stream);
	const cleanupFnId = await ctx.scheduler.runAfter(
		DELETE_STREAM_DELAY,
		api.streams.deleteStreamAsync,
		{ streamId: args.streamId },
	);
	await ctx.db.patch(args.streamId, {
		state: { kind: "finished", endedAt: Date.now(), cleanupFnId },
	});
}

// TODO: use this heartbeat while streaming, every 30 seconds or so,
// then reduce the timeout to 60 seconds.
export const heartbeat = mutation({
	args: { streamId: v.id("streamingMessages") },
	returns: v.null(),
	handler: heartbeatStream,
});

async function heartbeatStream(
	ctx: MutationCtx,
	args: { streamId: Id<"streamingMessages"> },
): Promise<void> {
	const stream = await ctx.db.get(args.streamId);
	if (!stream) {
		console.warn("Stream not found", args.streamId);
		return;
	}
	if (stream.state.kind !== "streaming") {
		return;
	}
	if (Date.now() - stream.state.lastHeartbeat < TIMEOUT_INTERVAL / 4) {
		// Debounce heartbeating.
		return;
	}
	if (!stream.state.timeoutFnId) {
		throw new Error("Stream has no timeout function");
	}
	const timeoutFn = await ctx.db.system.get(stream.state.timeoutFnId);
	if (!timeoutFn) {
		throw new Error("Timeout function not found");
	}
	if (timeoutFn.state.kind !== "pending") {
		throw new Error("Timeout function is not pending");
	}
	await ctx.scheduler.cancel(stream.state.timeoutFnId);
	const timeoutFnId = await ctx.scheduler.runAfter(
		TIMEOUT_INTERVAL,
		internal.streams.timeoutStream,
		{ streamId: args.streamId },
	);
	await ctx.db.patch(args.streamId, {
		state: { kind: "streaming", lastHeartbeat: Date.now(), timeoutFnId },
	});
}

export const timeoutStream = internalMutation({
	args: { streamId: v.id("streamingMessages") },
	returns: v.null(),
	handler: async (ctx, args) => {
		const stream = await ctx.db.get(args.streamId);
		if (!stream || stream.state.kind !== "streaming") {
			console.warn("Stream not found", args.streamId);
			return;
		}
		await ctx.db.patch(args.streamId, {
			state: { kind: "aborted", reason: "timeout" },
		});
	},
});

async function deletePageForStreamId(
	ctx: MutationCtx,
	args: { streamId: Id<"streamingMessages">; cursor?: string },
) {
	const deltas = await paginator(ctx.db, schema)
		.query("streamDeltas")
		.withIndex("streamId_start_end", (q) => q.eq("streamId", args.streamId))
		.paginate({
			numItems: MAX_DELTAS_PER_REQUEST,
			cursor: args.cursor ?? null,
		});
	await Promise.all(deltas.page.map((d) => ctx.db.delete(d._id)));
	if (deltas.isDone) {
		const stream = await ctx.db.get(args.streamId);
		if (stream) {
			await cleanupTimeoutFn(ctx, stream);
			if (stream.state.kind === "finished" && stream.state.cleanupFnId) {
				await ctx.scheduler.cancel(stream.state.cleanupFnId);
			}
			await ctx.db.delete(args.streamId);
		}
	}
	return deltas;
}

export async function deleteStreamsPageForThreadId(
	ctx: MutationCtx,
	args: { threadId: Id<"threads">; streamOrder?: number; deltaCursor?: string },
) {
	const allStreamMessages =
		schema.tables.streamingMessages.validator.fields.state.members
			.flatMap((state) => state.fields.kind.value)
			.map((stateKind) =>
				stream(ctx.db, schema)
					.query("streamingMessages")
					.withIndex("threadId_state_order_stepOrder", (q) =>
						q
							.eq("threadId", args.threadId)
							.eq("state.kind", stateKind)
							.gte("order", args.streamOrder ?? 0),
					),
			);
	let deltaCursor = args.deltaCursor;
	const streamMessage = await mergedStream(allStreamMessages, [
		"threadId",
		"state.kind",
		"order",
		"stepOrder",
	]).first();
	if (!streamMessage) {
		return { isDone: true, streamOrder: undefined, deltaCursor: undefined };
	}
	const result = await deletePageForStreamId(ctx, {
		streamId: streamMessage._id,
		cursor: deltaCursor,
	});
	if (result.isDone) {
		deltaCursor = undefined;
	}
	return { isDone: false, streamOrder: streamMessage.order, deltaCursor };
}

export const deleteStreamsPageForThreadIdMutation = internalMutation({
	args: {
		threadId: v.id("threads"),
		streamOrder: v.optional(v.number()),
		deltaCursor: v.optional(v.string()),
	},
	returns: v.object({
		isDone: v.boolean(),
		streamOrder: v.optional(v.number()),
		deltaCursor: v.optional(v.string()),
	}),
	handler: deleteStreamsPageForThreadId,
});

export const deleteAllStreamsForThreadIdAsync = mutation({
	args: {
		threadId: v.id("threads"),
		streamOrder: v.optional(v.number()),
		deltaCursor: v.optional(v.string()),
	},
	returns: v.object({
		isDone: v.boolean(),
		streamOrder: v.optional(v.number()),
		deltaCursor: v.optional(v.string()),
	}),
	handler: async (
		ctx,
		args,
	): Promise<{
		isDone: boolean;
		streamOrder?: number;
		deltaCursor?: string;
	}> => {
		const result = await deleteStreamsPageForThreadId(ctx, args);
		if (!result.isDone) {
			await ctx.scheduler.runAfter(
				0,
				api.streams.deleteAllStreamsForThreadIdAsync,
				{
					threadId: args.threadId,
					streamOrder: result.streamOrder,
					deltaCursor: result.deltaCursor,
				},
			);
		} else {
			await ctx.db.delete(args.threadId);
		}
		return result;
	},
});

export const deleteStreamSync = mutation({
	args: { streamId: v.id("streamingMessages") },
	returns: v.null(),
	handler: async (ctx, args) => {
		let deltas = await deletePageForStreamId(ctx, args);
		while (!deltas.isDone) {
			deltas = await deletePageForStreamId(ctx, {
				...args,
				cursor: deltas.continueCursor,
			});
		}
	},
});

export const deleteStreamAsync = mutation({
	args: { streamId: v.id("streamingMessages"), cursor: v.optional(v.string()) },
	returns: v.null(),
	handler: async (ctx, args) => {
		const result = await deletePageForStreamId(ctx, args);
		if (!result.isDone) {
			await ctx.scheduler.runAfter(0, api.streams.deleteStreamAsync, {
				streamId: args.streamId,
				cursor: result.continueCursor,
			});
		}
	},
});

export const deleteAllStreamsForThreadIdSync = action({
	args: { threadId: v.id("threads") },
	returns: v.null(),
	handler: async (ctx, args) => {
		let result = await ctx.runMutation(
			internal.streams.deleteStreamsPageForThreadIdMutation,
			args,
		);
		while (!result.isDone) {
			result = await ctx.runMutation(
				internal.streams.deleteStreamsPageForThreadIdMutation,
				{
					...args,
					streamOrder: result.streamOrder,
					deltaCursor: result.deltaCursor,
				},
			);
		}
	},
});

export async function getStreamingMessages(
	ctx: MutationCtx,
	threadId: Id<"threads">,
	order: number,
	stepOrder: number,
): Promise<Doc<"streamingMessages">[]> {
	return mergedStream(
		(["aborted", "streaming", "finished"] as const).map((state) =>
			stream(ctx.db, schema)
				.query("streamingMessages")
				.withIndex("threadId_state_order_stepOrder", (q) =>
					q
						.eq("threadId", threadId)
						.eq("state.kind", state)
						.eq("order", order)
						.lte("stepOrder", stepOrder),
				)
				.order("desc"),
		),
		["stepOrder"],
	).take(10);
}

export async function getStreamingMessagesWithMetadata(
	ctx: MutationCtx,
	{
		threadId,
		order,
		stepOrder,
	}: { threadId: Id<"threads">; order: number; stepOrder: number },
	metadata: { status: "success" | "failed"; error?: string },
): Promise<MessageWithMetadataInternal[]> {
	// See if there are any streaming messages for this order
	const streamingMessages = await getStreamingMessages(
		ctx,
		threadId,
		order,
		stepOrder,
	);
	const messages = (
		await Promise.all(
			streamingMessages.map(async (streamingMessage) => {
				const deltas = await ctx.db
					.query("streamDeltas")
					.withIndex("streamId_start_end", (q) =>
						q.eq("streamId", streamingMessage._id),
					)
					.take(1000);
				const uiMessages = await deriveUIMessagesFromDeltas(
					threadId,
					[publicStreamMessage(streamingMessage)],
					deltas,
				);
				// We don't save messages that have already been saved
				const numToSkip = stepOrder - streamingMessage.stepOrder;
				const convertedMessages = await fromUIMessagesAsync(
					uiMessages,
					streamingMessage,
				);
				const messages = await Promise.all(
					convertedMessages
						.slice(numToSkip)
						.filter((m) => m.message !== undefined)
						.map(async (msg) => {
							return {
								...pick(msg, [
									"message",
									"fileIds",
									"status",
									"finishReason",
									"model",
									"provider",
									"providerMetadata",
									"sources",
									"reasoning",
									"reasoningDetails",
									"usage",
									"warnings",
									"error",
								]),
								...metadata,
							} as MessageWithMetadataInternal;
						}),
				);
				return messages;
			}),
		)
	).flat();
	return messages;
}
