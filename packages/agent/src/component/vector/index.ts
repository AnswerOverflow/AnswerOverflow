import { paginator } from "convex-helpers/server/pagination";
import { mergedStream, stream } from "convex-helpers/server/stream";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import {
	type ActionCtx,
	mutation,
	type MutationCtx,
	query,
} from "../_generated/server";
import schema from "../schema";
import {
	type EmbeddingsWithoutDenormalizedFields,
	getVectorTableName,
	type VectorDimension,
	vEmbeddingsWithoutDenormalizedFields,
	vVectorDimension,
	vVectorId,
} from "./tables";

export const paginate = query({
	args: {
		vectorDimension: vVectorDimension,
		targetModel: v.string(),
		table: v.optional(v.string()),
		cursor: v.optional(v.string()),
		limit: v.number(),
	},
	returns: v.object({
		ids: v.array(vVectorId),
		isDone: v.boolean(),
		continueCursor: v.string(),
	}),
	handler: async (ctx, args) => {
		const tableName = getVectorTableName(args.vectorDimension);
		const vectors = await paginator(ctx.db, schema)
			.query(tableName)
			.withIndex("model_table_threadId" as any, (q) =>
				args.table
					? (q.eq("model", args.targetModel) as any).eq("table", args.table)
					: q.eq("model", args.targetModel),
			)
			.paginate({
				cursor: args.cursor ?? null,
				numItems: args.limit,
				maximumRowsRead: 300,
			});
		return {
			ids: vectors.page.map((v) => v._id),
			isDone: vectors.isDone,
			continueCursor: vectors.continueCursor,
		};
	},
});

export const deleteBatchForThread = mutation({
	args: {
		vectorDimension: vVectorDimension,
		model: v.string(),
		threadId: v.string(),
		cursor: v.optional(v.string()),
		limit: v.number(),
	},
	returns: v.object({
		isDone: v.boolean(),
		continueCursor: v.string(),
	}),
	handler: async (ctx, args) => {
		const tableName = getVectorTableName(args.vectorDimension);
		const vectors = await mergedStream(
			["thread", "memory"].map((table) =>
				stream(ctx.db, schema)
					.query(tableName)
					.withIndex("model_table_threadId", (q) =>
						q
							.eq("model", args.model)
							.eq("table", table)
							.eq("threadId", args.threadId),
					),
			),
			["threadId"],
		).paginate({
			cursor: args.cursor ?? null,
			numItems: args.limit,
			maximumRowsRead: 300,
		});
		await Promise.all(vectors.page.map((v) => ctx.db.delete(v._id)));
		return {
			isDone: vectors.isDone,
			continueCursor: vectors.continueCursor,
		};
	},
});

export const insertBatch = mutation({
	args: {
		vectorDimension: vVectorDimension,
		vectors: v.array(
			v.object({
				...vEmbeddingsWithoutDenormalizedFields.fields,
				messageId: v.optional(v.id("messages")),
			}),
		),
	},
	returns: v.array(vVectorId),
	handler: async (ctx, args) => {
		return Promise.all(
			args.vectors.map(async ({ messageId, ...v }) => {
				const embeddingId = await insertVector(ctx, args.vectorDimension, v);
				if (messageId) {
					await ctx.db.patch(messageId, { embeddingId });
				}
				return embeddingId;
			}),
		);
	},
});

export async function insertVector(
	ctx: MutationCtx,
	dimension: VectorDimension,
	v: EmbeddingsWithoutDenormalizedFields,
) {
	return ctx.db.insert(getVectorTableName(dimension), {
		...v,
		model_table_userId: v.userId ? [v.model, v.table, v.userId] : undefined,
		model_table_threadId: v.threadId
			? [v.model, v.table, v.threadId]
			: undefined,
	});
}

export function searchVectors(
	ctx: ActionCtx,
	vector: number[],
	args: {
		dimension: VectorDimension;
		model: string;
		table: string;
		userId?: string;
		threadId?: Id<"threads">;
		searchAllMessagesForUserId?: string;
		limit?: number;
	},
) {
	const tableName = getVectorTableName(args.dimension);
	return ctx.vectorSearch(tableName, "vector", {
		vector,
		// TODO: to support more tables, add more "OR" clauses for each.
		filter: (q) =>
			args.searchAllMessagesForUserId
				? q.eq("model_table_userId", [
						args.model,
						args.table,
						args.searchAllMessagesForUserId,
					])
				: q.eq("model_table_threadId", [
						args.model,
						args.table,
						args.threadId!,
					]),
		limit: args.limit,
	});
}

export const updateBatch = mutation({
	args: {
		vectors: v.array(
			v.object({
				model: v.string(),
				id: vVectorId,
				vector: v.array(v.number()),
				// TODO: support changing the vector length by
				// deleting from one table and inserting into another.
				// However this requires updating all the messages that reference
				// the vector.
			}),
		),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		await Promise.all(
			args.vectors.map((embedding) =>
				ctx.db.patch(embedding.id, {
					model: embedding.model,
					vector: embedding.vector,
				}),
			),
		);
	},
});

export const deleteBatch = mutation({
	args: {
		ids: v.array(vVectorId),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		await Promise.all(args.ids.map((id) => ctx.db.delete(id)));
	},
});
