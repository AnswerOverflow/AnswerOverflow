import { getManyFrom } from "convex-helpers/server/relationships";
import { Array as Arr, Predicate } from "effect";
import type { Doc } from "../_generated/dataModel";
import type { QueryCtxWithCache } from "./dataAccess";
import { enrichMessage } from "./dataAccess";
import { type EnrichedMessage, getThreadStartMessage } from "./messages";

export type ThreadTag = {
	id: bigint;
	name: string;
};

export type EnrichedThread = {
	thread: Doc<"channels">;
	message: EnrichedMessage | null;
	parentChannel: {
		id: bigint;
		name: string;
		type: number;
	} | null;
	tags: ThreadTag[];
};

export async function enrichThread(
	ctx: QueryCtxWithCache,
	thread: Doc<"channels">,
): Promise<EnrichedThread> {
	const [startMessage, threadTags, parentChannel] = await Promise.all([
		getThreadStartMessage(ctx, thread.id),
		getManyFrom(ctx.db, "threadTags", "by_threadId", thread.id),
		thread.parentId ? ctx.cache.getChannel(thread.parentId) : null,
	]);

	const enrichedMessage = startMessage
		? await enrichMessage(ctx, startMessage)
		: null;

	const parentAvailableTags = parentChannel?.availableTags ?? [];
	const tags = Arr.filter(
		threadTags.map((t) => {
			const tagInfo = parentAvailableTags.find((pt) => pt.id === t.tagId);
			if (!tagInfo) return null;
			return { id: t.tagId, name: tagInfo.name };
		}),
		Predicate.isNotNull,
	);

	return {
		thread,
		message: enrichedMessage,
		parentChannel: parentChannel
			? {
					id: parentChannel.id,
					name: parentChannel.name,
					type: parentChannel.type,
				}
			: null,
		tags,
	};
}

export async function enrichThreads(
	ctx: QueryCtxWithCache,
	threads: Doc<"channels">[],
): Promise<EnrichedThread[]> {
	return Promise.all(threads.map((thread) => enrichThread(ctx, thread)));
}
