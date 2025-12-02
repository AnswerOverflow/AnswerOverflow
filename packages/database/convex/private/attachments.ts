import { v } from "convex/values";
import { getOneFrom } from "convex-helpers/server/relationships";
import { api } from "../_generated/api";
import { getBackendAccessToken } from "../authenticated/dashboard";
import { privateAction, privateMutation } from "../client";
import {
	uploadAttachmentFromUrlLogic,
	uploadFromUrlLogic,
} from "../shared/shared";

export const updateAttachmentStorageId = privateMutation({
	args: {
		id: v.int64(),
		storageId: v.id("_storage"),
	},
	handler: async (ctx, args) => {
		const attachment = await getOneFrom(
			ctx.db,
			"attachments",
			"by_attachmentId",
			args.id,
			"id",
		);
		if (!attachment) {
			throw new Error("Attachment not found");
		}
		await ctx.db.patch(attachment._id, { storageId: args.storageId });
	},
});

export const uploadAttachmentFromUrl = privateAction({
	args: {
		url: v.string(),
		filename: v.string(),
		contentType: v.optional(v.string()),
		id: v.int64(),
	},
	handler: async (ctx, args) => {
		const id = await uploadAttachmentFromUrlLogic(ctx, {
			url: args.url,
			filename: args.filename,
			contentType: args.contentType,
		});
		if (!id) {
			throw new Error("Failed to upload attachment");
		}
		await ctx.runMutation(api.private.attachments.updateAttachmentStorageId, {
			id: args.id,
			storageId: id,
			backendAccessToken: getBackendAccessToken(),
		});
	},
});

export const uploadEmbedImageFromUrl = privateAction({
	args: {
		url: v.string(),
		messageId: v.int64(),
		embedIndex: v.number(),
		field: v.union(
			v.literal("image"),
			v.literal("thumbnail"),
			v.literal("video"),
			v.literal("footerIcon"),
			v.literal("authorIcon"),
		),
	},
	handler: async (ctx, args) => {
		const storageId = await uploadFromUrlLogic(ctx, { url: args.url });
		if (!storageId) {
			throw new Error("Failed to upload embed image");
		}
		await ctx.runMutation(api.private.messages.updateEmbedStorageId, {
			messageId: args.messageId,
			embedIndex: args.embedIndex,
			field: args.field,
			storageId,
			backendAccessToken: getBackendAccessToken(),
		});
	},
});
