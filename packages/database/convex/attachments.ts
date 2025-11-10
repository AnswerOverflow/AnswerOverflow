import { v } from "convex/values";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action, internalMutation } from "./_generated/server";

/**
 * Downloads an attachment from a URL and uploads it to Convex storage
 * Returns the storage ID
 */
export const uploadAttachmentFromUrl = action({
	args: {
		url: v.string(),
		filename: v.string(),
		contentType: v.optional(v.string()),
	},
	returns: v.union(v.id("_storage"), v.null()),
	handler: async (ctx, args) => {
		try {
			// Download the file from the URL
			const response = await fetch(args.url);

			if (!response.ok) {
				console.error(
					`Failed to download attachment from ${args.url}: ${response.status} ${response.statusText}`,
				);
				return null;
			}

			// Get the file as a blob
			const blob = await response.blob();

			// Upload to Convex storage
			const storageId = await ctx.storage.store(blob);

			return storageId;
		} catch (error) {
			console.error(`Error uploading attachment from ${args.url}:`, error);
			return null;
		}
	},
});

/**
 * Updates an attachment record with its storage ID
 */
export const updateAttachmentStorageId = internalMutation({
	args: {
		attachmentDiscordId: v.string(),
		storageId: v.id("_storage"),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const attachment = await ctx.db
			.query("attachments")
			.withIndex("by_attachmentId", (q) => q.eq("id", args.attachmentDiscordId))
			.first();

		if (attachment) {
			await ctx.db.patch(attachment._id, {
				storageId: args.storageId,
			});
		}

		return null;
	},
});

/**
 * Batch uploads multiple attachments from URLs
 * Returns a map of attachment IDs to storage IDs
 */
export const uploadManyAttachmentsFromUrls = action({
	args: {
		attachments: v.array(
			v.object({
				id: v.string(),
				url: v.string(),
				filename: v.string(),
				contentType: v.optional(v.string()),
			}),
		),
	},
	returns: v.array(
		v.object({
			attachmentId: v.string(),
			storageId: v.union(v.id("_storage"), v.null()),
		}),
	),
	handler: async (ctx, args) => {
		const results: Array<{
			attachmentId: string;
			storageId: Id<"_storage"> | null;
		}> = [];

		for (const attachment of args.attachments) {
			const storageId: Id<"_storage"> | null = await ctx.runAction(
				api.attachments.uploadAttachmentFromUrl,
				{
					url: attachment.url,
					filename: attachment.filename,
					contentType: attachment.contentType,
				},
			);

			results.push({
				attachmentId: attachment.id,
				storageId,
			});
		}

		return results;
	},
});

/**
 * Gets the storage URL for an attachment
 */
export const getAttachmentUrl = action({
	args: {
		storageId: v.id("_storage"),
	},
	returns: v.union(v.string(), v.null()),
	handler: async (ctx, args) => {
		return await ctx.storage.getUrl(args.storageId);
	},
});
