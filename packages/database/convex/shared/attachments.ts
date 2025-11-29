import { getManyFrom } from "convex-helpers/server/relationships";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx, MutationCtx, QueryCtx } from "../client";

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

export async function uploadAttachmentFromUrlLogic(
	ctx: ActionCtx,
	args: {
		url: string;
		filename: string;
		contentType?: string;
	},
): Promise<Id<"_storage"> | null> {
	try {
		const response = await fetch(args.url);

		if (!response.ok) {
			console.error(
				`Failed to download attachment from ${args.url}: ${response.status} ${response.statusText}`,
			);
			return null;
		}

		const blob = await response.blob();

		const storageId = await ctx.storage.store(blob);

		return storageId;
	} catch (error) {
		console.error(`Error uploading attachment from ${args.url}:`, error);
		return null;
	}
}
