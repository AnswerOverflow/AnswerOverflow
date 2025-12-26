import { v } from "convex/values";
import { asyncMap } from "convex-helpers";
import { getManyFrom } from "convex-helpers/server/relationships";
import { Array as Arr } from "effect";
import { publicQuery } from "./custom_functions";

export const getTagsForThread = publicQuery({
	args: {
		threadId: v.string(),
	},
	returns: v.array(v.int64()),
	handler: async (ctx, args) => {
		const threadId = BigInt(args.threadId);
		const tags = await getManyFrom(
			ctx.db,
			"threadTags",
			"by_threadId",
			threadId,
		);
		return tags.map((t) => t.tagId);
	},
});

export const getTagsForThreads = publicQuery({
	args: {
		threadIds: v.array(v.string()),
	},
	returns: v.record(v.string(), v.array(v.int64())),
	handler: async (ctx, args) => {
		const result: Record<string, Array<bigint>> = {};

		await asyncMap(args.threadIds, async (threadIdStr) => {
			const threadId = BigInt(threadIdStr);
			const tags = await getManyFrom(
				ctx.db,
				"threadTags",
				"by_threadId",
				threadId,
			);
			result[threadIdStr] = tags.map((t) => t.tagId);
		});

		return result;
	},
});

export const getThreadIdsByTags = publicQuery({
	args: {
		parentChannelId: v.string(),
		tagIds: v.array(v.string()),
		mode: v.union(v.literal("AND"), v.literal("OR")),
	},
	returns: v.array(v.string()),
	handler: async (ctx, args) => {
		if (args.tagIds.length === 0) {
			return [];
		}

		const parentChannelId = BigInt(args.parentChannelId);
		const tagIds = args.tagIds.map((id) => BigInt(id));

		const threadIdSets = await asyncMap(tagIds, async (tagId) => {
			const entries = await ctx.db
				.query("threadTags")
				.withIndex("by_parentChannelId_and_tagId", (q) =>
					q.eq("parentChannelId", parentChannelId).eq("tagId", tagId),
				)
				.collect();
			return new Set(entries.map((e) => e.threadId.toString()));
		});

		if (args.mode === "OR") {
			const union = new Set<string>();
			for (const set of threadIdSets) {
				for (const id of set) {
					union.add(id);
				}
			}
			return Array.from(union);
		}

		const firstSet = threadIdSets[0];
		if (!firstSet) {
			return [];
		}
		let intersection = firstSet;
		for (let i = 1; i < threadIdSets.length; i++) {
			const currentSet = threadIdSets[i];
			if (!currentSet) continue;
			intersection = new Set(
				Arr.filter(Array.from(intersection), (id) => currentSet.has(id)),
			);
		}
		return Array.from(intersection);
	},
});
