import { paginator } from "convex-helpers/server/pagination";
import type { Id } from "./_generated/dataModel";
import { mutation, type MutationCtx, query } from "./_generated/server";
import { schema, v } from "./schema";
import { paginationOptsValidator } from "convex/server";
import type { Infer } from "convex/values";

const addFileArgs = v.object({
	storageId: v.string(),
	hash: v.string(),
	filename: v.optional(v.string()),
	mimeType: v.string(),
});

export const addFile = mutation({
	args: addFileArgs,
	handler: addFileHandler,
	returns: {
		fileId: v.id("files"),
		storageId: v.string(),
	},
});

export async function addFileHandler(
	ctx: MutationCtx,
	args: Infer<typeof addFileArgs>,
) {
	const existingFile = await ctx.db
		.query("files")
		.withIndex("hash", (q) => q.eq("hash", args.hash))
		.filter((q) => q.eq(q.field("filename"), args.filename))
		.first();
	if (existingFile) {
		// increment the refcount
		await ctx.db.patch(existingFile._id, {
			refcount: existingFile.refcount + 1,
			lastTouchedAt: Date.now(),
		});
		return {
			fileId: existingFile._id,
			storageId: existingFile.storageId,
		};
	}
	const fileId = await ctx.db.insert("files", {
		...args,
		// We start out with it unused - when it's saved in a message we increment.
		refcount: 0,
		lastTouchedAt: Date.now(),
	});
	return {
		fileId,
		storageId: args.storageId,
	};
}

export const get = query({
	args: {
		fileId: v.id("files"),
	},
	returns: v.union(v.null(), v.doc("files")),
	handler: async (ctx, args) => {
		return ctx.db.get(args.fileId);
	},
});

/**
 * If you plan to have the same file added over and over without a reference to
 * the fileId, you can use this query to get the fileId of the existing file.
 * Note: this will not increment the refcount. only saving messages does that.
 * It will only match if the filename is the same (or both are undefined).
 */
export const useExistingFile = mutation({
	args: {
		hash: v.string(),
		filename: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const file = await ctx.db
			.query("files")
			.withIndex("hash", (q) => q.eq("hash", args.hash))
			.filter((q) => q.eq(q.field("filename"), args.filename))
			.first();
		if (!file) {
			return null;
		}
		await ctx.db.patch(file._id, {
			lastTouchedAt: Date.now(),
		});
		return { fileId: file._id, storageId: file.storageId };
	},
	returns: v.union(
		v.null(),
		v.object({
			fileId: v.id("files"),
			storageId: v.string(),
		}),
	),
});

export async function changeRefcount(
	ctx: MutationCtx,
	prev: Id<"files">[],
	next: Id<"files">[],
) {
	const prevSet = new Set(prev);
	const nextSet = new Set(next);
	for (const fileId of prevSet) {
		if (!nextSet.has(fileId)) {
			const file = await ctx.db.get(fileId);
			if (file) {
				await ctx.db.patch(fileId, {
					refcount: file.refcount - 1,
				});
			} else {
				console.error(`File ${fileId} not found when decrementing refcount`);
			}
		}
	}
	for (const fileId of nextSet) {
		if (!prevSet.has(fileId)) {
			const file = await ctx.db.get(fileId);
			if (file) {
				await ctx.db.patch(fileId, {
					refcount: file.refcount + 1,
				});
			} else {
				throw new Error(`File ${fileId} not found when incrementing refcount`);
			}
		}
	}
}

export const copyFile = mutation({
	args: {
		fileId: v.id("files"),
	},
	handler: copyFileHandler,
	returns: v.null(),
});

export async function copyFileHandler(
	ctx: MutationCtx,
	args: { fileId: Id<"files"> },
) {
	const file = await ctx.db.get(args.fileId);
	if (!file) {
		throw new Error("File not found");
	}
	await ctx.db.patch(args.fileId, {
		refcount: file.refcount + 1,
		lastTouchedAt: Date.now(),
	});
}

/**
 * Get files that are unused and can be deleted.
 * This is useful for cleaning up files that are no longer needed.
 * Note: recently added files that have not been saved yet will show up here.
 * You can inspect the `lastTouchedAt` field to see how recently it was used.
 * I'd recommend not deleting anything touched in the last 24 hours.
 */
export const getFilesToDelete = query({
	args: {
		paginationOpts: paginationOptsValidator,
	},
	handler: async (ctx, args) => {
		const files = await paginator(ctx.db, schema)
			.query("files")
			.withIndex("refcount", (q) => q.eq("refcount", 0))
			.paginate(args.paginationOpts);
		return files;
	},
	returns: v.object({
		page: v.array(v.doc("files")),
		continueCursor: v.string(),
		isDone: v.boolean(),
	}),
});

export const deleteFiles = mutation({
	args: {
		fileIds: v.array(v.id("files")),
		force: v.optional(v.boolean()),
	},
	returns: v.array(v.id("files")),
	handler: async (ctx, args) => {
		const deletedFileIds = await Promise.all(
			args.fileIds.map(async (fileId) => {
				const file = await ctx.db.get(fileId);
				if (!file) {
					console.error(`File ${fileId} not found when deleting, skipping...`);
					return null;
				}
				if (file.refcount && file.refcount > 0) {
					if (!args.force) {
						console.error(
							`File ${fileId} has refcount ${file.refcount} > 0, skipping...`,
						);
						return null;
					}
				}
				await ctx.db.delete(fileId);
				return fileId;
			}),
		);
		return deletedFileIds.filter((fileId) => fileId !== null);
	},
});
