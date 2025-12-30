import type { OptimisticLocalStore } from "convex/browser";
import { insertAtTop } from "convex/react";
import type {
	FunctionReference,
	PaginationOptions,
	PaginationResult,
} from "convex/server";
import type { SyncStreamsReturnValue } from "../client/types";
import type { UIMessage } from "../UIMessages";
import type { MessageDoc, StreamArgs } from "../validators";

/**
 * Adds a sent message to the end of a list of messages, so it shows up until
 * the message is saved on the server and arrives in the query.
 * It generates a message with fields that match both MessageDoc and UIMessage,
 * for convenience. It will not include any other fields you might have in your
 * regular query, however.
 *
 * @param query The query used to fetch messages, typically with
 * useThreadMessages or useUIMessages.
 * @returns A function that can be used to optimistically send a message.
 * If your mutation takes different arguments than { threadId, prompt }, you can
 * use it as a helper function in your optimistic update:
 * ```ts
 * const sendMessage = useMutation(
 *   api.chatStreaming.streamStoryAsynchronously,
 * ).withOptimisticUpdate(
 *   (store, args) => {
 *     optimisticallySendMessage(api.chatStreaming.listThreadMessages)(store, {
 *       threadId:
 *       prompt: whatever you would have passed to the mutation,
 *     })
 *   }
 * );
 * ```
 */
export function optimisticallySendMessage(
	query: FunctionReference<
		"query",
		"public",
		{
			threadId: string;
			paginationOpts: PaginationOptions;
			streamArgs?: StreamArgs;
		},
		PaginationResult<MessageDoc | UIMessage> & {
			streams?: SyncStreamsReturnValue;
		}
	>,
): (
	store: OptimisticLocalStore,
	args: { threadId: string; prompt: string },
) => void {
	return (store, args) => {
		const queries = store.getAllQueries(query);
		let maxOrder = -1;
		for (const q of queries) {
			if (q.args?.threadId !== args.threadId) continue;
			if (q.args.streamArgs) continue;
			for (const m of q.value?.page ?? []) {
				maxOrder = Math.max(maxOrder, m.order);
			}
		}
		const order = maxOrder + 1;
		const stepOrder = 0;
		const id = randomUUID();
		const { prompt, ...rest } = args;
		insertAtTop({
			paginatedQuery: query,
			argsToMatch: { threadId: args.threadId, streamArgs: undefined },
			item: {
				...rest,
				_creationTime: Date.now(),
				_id: id,
				id,
				key: `${args.threadId}-${order}-${stepOrder}`,
				order,
				stepOrder,
				status: "pending",
				tool: false,
				message: { role: "user", content: prompt },
				parts: [{ type: "text", text: prompt }],
				role: "user",
				text: prompt,
			},
			localQueryStore: store,
		});
	};
}

export function randomUUID() {
	if (
		typeof crypto !== "undefined" &&
		typeof crypto.randomUUID === "function"
	) {
		return crypto.randomUUID();
	}
	return (
		Math.random().toString(36).substring(2, 15) +
		Math.random().toString(36).substring(2, 15)
	);
}
