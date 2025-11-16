import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { publicInternalAction } from "../client";
import { uploadAttachmentFromUrlLogic } from "../shared/shared";

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

export const getAttachmentUrl = publicInternalAction({
	args: {
		storageId: v.id("_storage"),
	},
	returns: v.union(v.string(), v.null()),
	handler: async (ctx, args) => {
		return await ctx.storage.getUrl(args.storageId);
	},
});
