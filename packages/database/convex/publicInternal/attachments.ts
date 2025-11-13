import { v } from "convex/values";
import { getOneFrom } from "convex-helpers/server/relationships";
import type { Id } from "../_generated/dataModel";
import { internalMutation, publicInternalAction } from "../client";
import { uploadAttachmentFromUrlLogic } from "../shared/shared";

/**
 * Downloads an attachment from a URL and uploads it to Convex storage
 * Returns the storage ID
 */
export const uploadAttachmentFromUrl = publicInternalAction({
	args: {
		url: v.string(),
		filename: v.string(),
		contentType: v.optional(v.string()),
	},
	returns: v.union(v.id("_storage"), v.null()),
	handler: async (ctx, args) => {
		return await uploadAttachmentFromUrlLogic(ctx, {
			url: args.url,
			filename: args.filename,
			contentType: args.contentType,
		});
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
		const attachment = await getOneFrom(
			ctx.db,
			"attachments",
			"by_attachmentId",
			args.attachmentDiscordId,
			"id",
		);

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
export const uploadManyAttachmentsFromUrls = publicInternalAction({
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
			const storageId = await uploadAttachmentFromUrlLogic(ctx, {
				url: attachment.url,
				filename: attachment.filename,
				contentType: attachment.contentType,
			});

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
export const getAttachmentUrl = publicInternalAction({
	args: {
		storageId: v.id("_storage"),
	},
	returns: v.union(v.string(), v.null()),
	handler: async (ctx, args) => {
		return await ctx.storage.getUrl(args.storageId);
	},
});
