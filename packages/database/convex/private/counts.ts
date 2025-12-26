import { TableAggregate } from "@convex-dev/aggregate";
import { components } from "../_generated/api";
import type { DataModel, Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../client";
import { isThreadType } from "../shared/channels";

export const rootChannelMessageCounts = new TableAggregate<{
	Key: [bigint, bigint, bigint];
	DataModel: DataModel;
	TableName: "messages";
}>(components.rootChannelMessageCounts, {
	sortKey: (doc) => [doc.serverId, doc.channelId, doc.id],
});

export const threadMessageCounts = new TableAggregate<{
	Key: [bigint, bigint, bigint, bigint];
	DataModel: DataModel;
	TableName: "messages";
}>(components.threadMessageCounts, {
	sortKey: (doc) => [
		doc.serverId,
		doc.parentChannelId ?? doc.channelId,
		doc.childThreadId ?? doc.channelId,
		doc.id,
	],
});

export const threadCounts = new TableAggregate<{
	Key: [bigint, bigint];
	DataModel: DataModel;
	TableName: "channels";
}>(components.threadCounts, {
	sortKey: (doc) => [doc.serverId, doc.id],
});

export function isThreadMessage(doc: {
	parentChannelId?: bigint;
	childThreadId?: bigint;
}): boolean {
	return doc.parentChannelId !== undefined || doc.childThreadId !== undefined;
}

export async function insertMessageCount(
	ctx: MutationCtx,
	doc: Doc<"messages">,
): Promise<void> {
	if (isThreadMessage(doc)) {
		await threadMessageCounts.insertIfDoesNotExist(ctx, doc);
	} else {
		await rootChannelMessageCounts.insertIfDoesNotExist(ctx, doc);
	}
}

export async function deleteMessageCount(
	ctx: MutationCtx,
	doc: Doc<"messages">,
): Promise<void> {
	if (isThreadMessage(doc)) {
		await threadMessageCounts.deleteIfExists(ctx, doc);
	} else {
		await rootChannelMessageCounts.deleteIfExists(ctx, doc);
	}
}

export async function insertThreadCount(
	ctx: MutationCtx,
	doc: Doc<"channels">,
): Promise<void> {
	if (isThreadType(doc.type)) {
		await threadCounts.insertIfDoesNotExist(ctx, doc);
	}
}

export async function deleteThreadCount(
	ctx: MutationCtx,
	doc: Doc<"channels">,
): Promise<void> {
	if (isThreadType(doc.type)) {
		await threadCounts.deleteIfExists(ctx, doc);
	}
}
