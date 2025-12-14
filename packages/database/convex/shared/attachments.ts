import { getManyFrom } from "convex-helpers/server/relationships";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx, MutationCtx, QueryCtx } from "../client";

const ALLOWED_UPLOAD_DOMAINS = [
	"cdn.discordapp.com",
	"media.discordapp.net",
	"images-ext-1.discordapp.net",
	"images-ext-2.discordapp.net",
];

function isAllowedUploadUrl(url: string): boolean {
	try {
		const parsed = new URL(url);
		return ALLOWED_UPLOAD_DOMAINS.includes(parsed.hostname);
	} catch {
		return false;
	}
}

export async function findAttachmentsByMessageId(
	ctx: QueryCtx | MutationCtx,
	messageId: bigint,
) {
	return await getManyFrom(
		ctx.db,
		"attachments",
		"by_messageId",
		messageId,
		"messageId",
	);
}

export async function uploadFromUrlLogic(
	ctx: ActionCtx,
	args: {
		url: string;
	},
): Promise<Id<"_storage"> | null> {
	if (!isAllowedUploadUrl(args.url)) {
		console.error(`Rejected upload from untrusted domain: ${args.url}`);
		return null;
	}

	try {
		const response = await fetch(args.url);

		if (!response.ok) {
			console.error(
				`Failed to download file from ${args.url}: ${response.status} ${response.statusText}`,
			);
			return null;
		}

		const blob = await response.blob();

		const storageId = await ctx.storage.store(blob);

		return storageId;
	} catch (error) {
		console.error(`Error uploading file from ${args.url}:`, error);
		return null;
	}
}

export async function uploadAttachmentFromUrlLogic(
	ctx: ActionCtx,
	args: {
		url: string;
		filename: string;
		contentType?: string;
	},
): Promise<Id<"_storage"> | null> {
	return uploadFromUrlLogic(ctx, { url: args.url });
}
