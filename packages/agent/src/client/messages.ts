import type { ModelMessage } from "ai";
import type { PaginationOptions, PaginationResult } from "convex/server";
import type { MessageDoc } from "../validators";
import { validateVectorDimension } from "../component/vector/tables";
import {
	vMessageWithMetadata,
	type Message,
	type MessageEmbeddings,
	type MessageEmbeddingsWithDimension,
	type MessageStatus,
	type MessageWithMetadata,
} from "../validators";
import { serializeMessage } from "../mapping";
import { toUIMessages, type UIMessage } from "../UIMessages";
import type {
	AgentComponent,
	MutationCtx,
	QueryCtx,
	ActionCtx,
} from "./types";
import { parse } from "convex-helpers/validators";

/**
 * List messages from a thread.
 * @param ctx A ctx object from a query, mutation, or action.
 * @param component The agent component, usually `components.agent`.
 * @param args.threadId The thread to list messages from.
 * @param args.paginationOpts Pagination options (e.g. via usePaginatedQuery).
 * @param args.excludeToolMessages Whether to exclude tool messages.
 *   False by default.
 * @param args.statuses What statuses to include. All by default.
 * @returns The MessageDoc's in a format compatible with usePaginatedQuery.
 */
export async function listMessages(
	ctx: QueryCtx | MutationCtx | ActionCtx,
	component: AgentComponent,
	{
		threadId,
		paginationOpts,
		excludeToolMessages,
		statuses,
	}: {
		threadId: string;
		paginationOpts: PaginationOptions;
		excludeToolMessages?: boolean;
		statuses?: MessageStatus[];
	},
): Promise<PaginationResult<MessageDoc>> {
	if (paginationOpts.numItems === 0) {
		return {
			page: [],
			isDone: true,
			continueCursor: paginationOpts.cursor ?? "",
		};
	}
	return ctx.runQuery(component.messages.listMessagesByThreadId, {
		order: "desc",
		threadId,
		paginationOpts,
		excludeToolMessages,
		statuses,
	});
}

export async function listUIMessages(
	ctx: QueryCtx | MutationCtx | ActionCtx,
	component: AgentComponent,
	args: {
		threadId: string;
		paginationOpts: PaginationOptions;
	},
): Promise<PaginationResult<UIMessage>> {
	const result = await listMessages(ctx, component, args);
	return { ...result, page: toUIMessages(result.page) };
}

export type SaveMessagesArgs = {
	threadId: string;
	userId?: string | null;
	/**
	 * The message that these messages are in response to. They will be
	 * the same "order" as this message, at increasing stepOrder(s).
	 */
	promptMessageId?: string;
	/**
	 * The messages to save.
	 */
	messages: (ModelMessage | Message)[];
	/**
	 * Metadata to save with the messages. Each element corresponds to the
	 * message at the same index.
	 */
	metadata?: Omit<MessageWithMetadata, "message">[];
	/**
	 * If true, it will fail any pending steps.
	 * Defaults to false.
	 */
	failPendingSteps?: boolean;
	/**
	 * The embeddings to save with the messages.
	 */
	embeddings?: MessageEmbeddings;
	/**
	 * A pending message ID to replace when adding messages.
	 */
	pendingMessageId?: string;
};

/**
 * Explicitly save messages associated with the thread (& user if provided)
 */
export async function saveMessages(
	ctx: MutationCtx | ActionCtx,
	component: AgentComponent,
	args: SaveMessagesArgs & {
		/**
		 * The agent name to associate with the messages.
		 */
		agentName?: string;
	},
): Promise<{ messages: MessageDoc[] }> {
	let embeddings: MessageEmbeddingsWithDimension | undefined;
	if (args.embeddings) {
		const dimension = args.embeddings.vectors.find((v) => v !== null)?.length;
		if (dimension) {
			validateVectorDimension(dimension);
			embeddings = {
				model: args.embeddings.model,
				dimension,
				vectors: args.embeddings.vectors,
			};
		}
	}
	const result = await ctx.runMutation(component.messages.addMessages, {
		threadId: args.threadId,
		userId: args.userId ?? undefined,
		agentName: args.agentName,
		promptMessageId: args.promptMessageId,
		pendingMessageId: args.pendingMessageId,
		embeddings,
		messages: await Promise.all(
			args.messages.map(async (m, i) => {
				const { message, fileIds } = await serializeMessage(ctx, component, m);
				const base = args.metadata?.[i];
				const allFileIds = [...(base?.fileIds ?? [])];
				if (fileIds) allFileIds.push(...fileIds);

				return parse(vMessageWithMetadata, {
					...base,
					message,
					...(allFileIds.length > 0 ? { fileIds: allFileIds } : {}),
				});
			}),
		),
		failPendingSteps: args.failPendingSteps ?? false,
	});
	return { messages: result.messages };
}

export type SaveMessageArgs = {
	threadId: string;
	userId?: string | null;
	/**
	 * The message that these messages are in response to. They will be
	 * the same "order" as this message, at increasing stepOrder(s).
	 */
	promptMessageId?: string;
	/**
	 * Metadata to save with the messages. Each element corresponds to the
	 * message at the same index.
	 */
	metadata?: Omit<MessageWithMetadata, "message">;
	/**
	 * The embedding to save with the message.
	 */
	embedding?: { vector: number[]; model: string };
	/**
	 * A pending message ID to replace with this message.
	 */
	pendingMessageId?: string;
} & (
	| {
			prompt?: undefined;
			/**
			 * The message to save.
			 */
			message: ModelMessage | Message;
	  }
	| {
			/*
			 * The prompt to save with the message.
			 */
			prompt: string;
			message?: undefined;
	  }
);

/**
 * Save a message to the thread.
 * @param ctx A ctx object from a mutation or action.
 * @param args The message and what to associate it with (user / thread)
 * You can pass extra metadata alongside the message, e.g. associated fileIds.
 * @returns The messageId of the saved message.
 */
export async function saveMessage(
	ctx: MutationCtx | ActionCtx,
	component: AgentComponent,
	args: SaveMessageArgs & {
		/**
		 * The agent name to associate with the message.
		 */
		agentName?: string;
	},
) {
	let embeddings: { vectors: number[][]; model: string } | undefined;
	if (args.embedding && args.embedding.vector) {
		embeddings = {
			model: args.embedding.model,
			vectors: [args.embedding.vector],
		};
	}
	const { messages } = await saveMessages(ctx, component, {
		threadId: args.threadId,
		userId: args.userId ?? undefined,
		agentName: args.agentName,
		promptMessageId: args.promptMessageId,
		pendingMessageId: args.pendingMessageId,
		messages:
			args.prompt !== undefined
				? [{ role: "user", content: args.prompt }]
				: [args.message],
		metadata: args.metadata ? [args.metadata] : undefined,
		embeddings,
	});
	const message = messages.at(-1)!;
	return { messageId: message._id, message };
}
