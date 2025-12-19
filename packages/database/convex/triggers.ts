/** biome-ignore-all lint/style/noRestrictedImports: This is where we wrap mutations with triggers, need raw imports */
import {
	customCtx,
	customMutation,
} from "convex-helpers/server/customFunctions";
import { Triggers } from "convex-helpers/server/triggers";
import type { DataModel } from "./_generated/dataModel";
import {
	internalMutation as rawInternalMutation,
	mutation as rawMutation,
} from "./_generated/server";
import {
	isThreadMessage,
	rootChannelMessageCounts,
	threadCounts,
	threadMessageCounts,
} from "./private/counts";
import { isThreadType } from "./shared/channels";

const triggers = new Triggers<DataModel>();

triggers.register("messages", async (ctx, change) => {
	try {
		if (change.operation === "insert" && change.newDoc) {
			if (isThreadMessage(change.newDoc)) {
				await threadMessageCounts.insertIfDoesNotExist(ctx, change.newDoc);
			} else {
				await rootChannelMessageCounts.insertIfDoesNotExist(ctx, change.newDoc);
			}
		} else if (change.operation === "delete" && change.oldDoc) {
			if (isThreadMessage(change.oldDoc)) {
				await threadMessageCounts.deleteIfExists(ctx, change.oldDoc);
			} else {
				await rootChannelMessageCounts.deleteIfExists(ctx, change.oldDoc);
			}
		}
	} catch (e) {
		if (e instanceof Error && e.message.includes("is not registered. Call")) {
			console.error(e.message);
			return;
		}
		throw e;
	}
});

triggers.register("channels", async (ctx, change) => {
	try {
		if (change.operation === "insert" && change.newDoc) {
			if (isThreadType(change.newDoc.type)) {
				await threadCounts.insertIfDoesNotExist(ctx, change.newDoc);
			}
		} else if (change.operation === "delete" && change.oldDoc) {
			if (isThreadType(change.oldDoc.type)) {
				await threadCounts.deleteIfExists(ctx, change.oldDoc);
			}
		}
	} catch (e) {
		if (e instanceof Error && e.message.includes("is not registered. Call")) {
			console.error(e.message);
			return;
		}
		throw e;
	}
});

export const mutation = customMutation(rawMutation, customCtx(triggers.wrapDB));
export const internalMutation = customMutation(
	rawInternalMutation,
	customCtx(triggers.wrapDB),
);
