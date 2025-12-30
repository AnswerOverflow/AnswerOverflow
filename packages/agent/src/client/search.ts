import {
	embedMany as embedMany_,
	type EmbeddingModel,
	type ModelMessage,
} from "ai";
import { assert } from "convex-helpers";
import type { MessageDoc } from "../validators";
import {
	validateVectorDimension,
	type VectorDimension,
} from "../component/vector/tables";
import {
	DEFAULT_MESSAGE_RANGE,
	DEFAULT_RECENT_MESSAGES,
	extractText,
	getModelName,
	getProviderName,
	isTool,
	sorted,
} from "../shared";
import type { Message } from "../validators";
import type {
	AgentComponent,
	Config,
	ContextOptions,
	Options,
	QueryCtx,
	MutationCtx,
	ActionCtx,
} from "./types";
import { inlineMessagesFiles } from "./files";
import { docsToModelMessages, toModelMessage } from "../mapping";

const DEFAULT_VECTOR_SCORE_THRESHOLD = 0.0;
// 10k characters should be more than enough for most cases, and stays under
// the 8k token limit for some models.
const MAX_EMBEDDING_TEXT_LENGTH = 10_000;

export type GetEmbedding = (text: string) => Promise<{
	embedding: number[];
	textEmbeddingModel: string | EmbeddingModel;
}>;

/**
 * Fetch the context messages for a thread.
 * @param ctx Either a query, mutation, or action ctx.
 *   If it is not an action context, you can't do text or
 *   vector search.
 * @param args The associated thread, user, message
 * @returns
 */
export async function fetchContextMessages(
	ctx: QueryCtx | MutationCtx | ActionCtx,
	component: AgentComponent,
	args: {
		userId: string | undefined;
		threadId: string | undefined;
		/**
		 * If targetMessageId is not provided, this text will be used
		 * for text and vector search
		 */
		searchText?: string;
		/**
		 * If provided, it will use this message for text/vector search (if enabled)
		 * and will only fetch messages up to (and including) this message's "order"
		 */
		targetMessageId?: string;
		/**
		 * @deprecated use searchText and targetMessageId instead
		 */
		messages?: (ModelMessage | Message)[];
		/**
		 * @deprecated use targetMessageId instead
		 */
		upToAndIncludingMessageId?: string;
		contextOptions: ContextOptions;
		getEmbedding?: GetEmbedding;
	},
): Promise<MessageDoc[]> {
	const { recentMessages, searchMessages } = await fetchRecentAndSearchMessages(
		ctx,
		component,
		args,
	);
	return [...searchMessages, ...recentMessages];
}

export async function fetchRecentAndSearchMessages(
	ctx: QueryCtx | MutationCtx | ActionCtx,
	component: AgentComponent,
	args: {
		userId: string | undefined;
		threadId: string | undefined;
		/**
		 * If targetMessageId is not provided, this text will be used
		 * for text and vector search
		 */
		searchText?: string;
		/**
		 * If provided, it will use this message for text/vector search (if enabled)
		 * and will only fetch messages up to (and including) this message's "order"
		 */
		targetMessageId?: string;
		/**
		 * @deprecated use searchText and targetMessageId instead
		 */
		messages?: (ModelMessage | Message)[];
		/**
		 * @deprecated use targetMessageId instead
		 */
		upToAndIncludingMessageId?: string;
		contextOptions: ContextOptions;
		getEmbedding?: GetEmbedding;
	},
): Promise<{ recentMessages: MessageDoc[]; searchMessages: MessageDoc[] }> {
	assert(args.userId || args.threadId, "Specify userId or threadId");
	const opts = args.contextOptions;
	// Fetch the latest messages from the thread
	let included: Set<string> | undefined;
	let recentMessages: MessageDoc[] = [];
	let searchMessages: MessageDoc[] = [];
	const targetMessageId =
		args.targetMessageId ?? args.upToAndIncludingMessageId;
	if (args.threadId && opts.recentMessages !== 0) {
		const { page } = await ctx.runQuery(
			component.messages.listMessagesByThreadId,
			{
				threadId: args.threadId,
				excludeToolMessages: opts.excludeToolMessages,
				paginationOpts: {
					numItems: opts.recentMessages ?? DEFAULT_RECENT_MESSAGES,
					cursor: null,
				},
				upToAndIncludingMessageId: targetMessageId,
				order: "desc",
				statuses: ["success"],
			},
		);
		included = new Set(page.map((m) => m._id));
		recentMessages = filterOutOrphanedToolMessages(sorted(page));
	}
	if (
		(opts.searchOptions?.textSearch || opts.searchOptions?.vectorSearch) &&
		opts.searchOptions?.limit
	) {
		if (!("runAction" in ctx)) {
			throw new Error("searchUserMessages only works in an action");
		}
		let text = args.searchText;
		let embedding: number[] | undefined;
		let embeddingModel: string | undefined;
		if (!text) {
			if (targetMessageId) {
				const targetMessage = recentMessages.find(
					(m) => m._id === targetMessageId,
				);
				if (targetMessage) {
					text = targetMessage.text;
				} else {
					const targetSearchFields = await ctx.runQuery(
						component.messages.getMessageSearchFields,
						{
							messageId: targetMessageId,
						},
					);
					text = targetSearchFields.text;
					embedding = targetSearchFields.embedding;
					embeddingModel = targetSearchFields.embeddingModel;
				}
				assert(text, "Target message has no text for searching");
			} else if (args.messages?.length) {
				text = extractText(args.messages.at(-1)!);
				assert(text, "Final context message has no text to search");
			}
			assert(text, "No text to search");
		}
		if (opts.searchOptions?.vectorSearch) {
			if (!embedding && args.getEmbedding) {
				const embeddingFields = await args.getEmbedding(text);
				embedding = embeddingFields.embedding;
				embeddingModel = embeddingFields.textEmbeddingModel
					? getModelName(embeddingFields.textEmbeddingModel)
					: undefined;
				// TODO: if the text matches the target message, save the embedding
				// for the target message and return the embeddingId on the message.
			}
		}
		const searchResults = await ctx.runAction(
			component.messages.searchMessages,
			{
				searchAllMessagesForUserId: opts?.searchOtherThreads
					? (args.userId ??
						(args.threadId &&
							(
								await ctx.runQuery(component.threads.getThread, {
									threadId: args.threadId,
								})
							)?.userId))
					: undefined,
				threadId: args.threadId,
				targetMessageId,
				limit: opts.searchOptions?.limit ?? 10,
				messageRange: {
					...DEFAULT_MESSAGE_RANGE,
					...opts.searchOptions?.messageRange,
				},
				text,
				textSearch: opts.searchOptions?.textSearch,
				vectorSearch: opts.searchOptions?.vectorSearch,
				vectorScoreThreshold:
					opts.searchOptions?.vectorScoreThreshold ??
					DEFAULT_VECTOR_SCORE_THRESHOLD,
				embedding,
				embeddingModel,
			},
		);
		// TODO: track what messages we used for context
		searchMessages = filterOutOrphanedToolMessages(
			sorted(searchResults.filter((m) => !included?.has(m._id))),
		);
	}
	// Ensure we don't include tool messages without a corresponding tool call
	return { recentMessages, searchMessages };
}

/**
 * Filter out tool messages that don't have both a tool call and response.
 * @param docs The messages to filter.
 * @returns The filtered messages.
 */
export function filterOutOrphanedToolMessages(docs: MessageDoc[]) {
	const toolCallIds = new Set<string>();
	const toolResultIds = new Set<string>();
	const result: MessageDoc[] = [];
	for (const doc of docs) {
		if (doc.message && Array.isArray(doc.message.content)) {
			for (const content of doc.message.content) {
				if (content.type === "tool-call") {
					toolCallIds.add(content.toolCallId);
				} else if (content.type === "tool-result") {
					toolResultIds.add(content.toolCallId);
				}
			}
		}
	}
	for (const doc of docs) {
		if (
			doc.message?.role === "assistant" &&
			Array.isArray(doc.message.content)
		) {
			const content = doc.message.content.filter(
				(p) => p.type !== "tool-call" || toolResultIds.has(p.toolCallId),
			);
			if (content.length) {
				result.push({
					...doc,
					message: {
						...doc.message,
						content,
					},
				});
			}
		} else if (doc.message?.role === "tool") {
			const content = doc.message.content.filter((c) =>
				toolCallIds.has(c.toolCallId),
			);
			if (content.length) {
				result.push({
					...doc,
					message: {
						...doc.message,
						content,
					},
				});
			}
		} else {
			result.push(doc);
		}
	}
	return result;
}

/**
 * Embed a list of messages, including calling any usage handler.
 * This will not save the embeddings to the database.
 */
export async function embedMessages(
	ctx: ActionCtx,
	{
		userId,
		threadId,
		...options
	}: {
		userId: string | undefined;
		threadId: string | undefined;
		agentName?: string;
	} & Pick<Config, "usageHandler" | "textEmbeddingModel" | "callSettings">,
	messages: (ModelMessage | Message)[],
): Promise<
	| {
			vectors: (number[] | null)[];
			dimension: VectorDimension;
			model: string;
	  }
	| undefined
> {
	if (!options.textEmbeddingModel) {
		return undefined;
	}
	let embeddings:
		| {
				vectors: (number[] | null)[];
				dimension: VectorDimension;
				model: string;
		  }
		| undefined;
	const messageTexts = messages.map((m) => !isTool(m) && extractText(m));
	// Find the indexes of the messages that have text.
	const textIndexes = messageTexts
		.map((t, i) => (t ? i : undefined))
		.filter((i) => i !== undefined);
	if (textIndexes.length === 0) {
		return undefined;
	}
	const values = messageTexts
		.map((t) => t && t.trim().slice(0, MAX_EMBEDDING_TEXT_LENGTH))
		.filter((t): t is string => !!t);
	// Then embed those messages.
	const textEmbeddings = await embedMany(ctx, {
		...options,
		userId,
		threadId,
		values,
	});
	// Then assemble the embeddings into a single array with nulls for the messages without text.
	const embeddingsOrNull = Array(messages.length).fill(null);
	textIndexes.forEach((i, j) => {
		embeddingsOrNull[i] = textEmbeddings.embeddings[j];
	});
	if (textEmbeddings.embeddings.length > 0) {
		const firstEmbedding = textEmbeddings.embeddings[0]!;
		const dimension = firstEmbedding.length;
		validateVectorDimension(dimension);
		const model = getModelName(options.textEmbeddingModel);
		embeddings = { vectors: embeddingsOrNull, dimension, model };
	}
	return embeddings;
}

/**
 * Embeds many strings, calling any usage handler.
 * @param ctx The ctx parameter to an action.
 * @param args Arguments to AI SDK's embedMany, and context for the embedding,
 *   passed to the usage handler.
 * @returns The embeddings for the strings, matching the order of the values.
 */
export async function embedMany(
	ctx: ActionCtx,
	{
		userId,
		threadId,
		values,
		abortSignal,
		headers,
		agentName,
		usageHandler,
		textEmbeddingModel,
		callSettings,
	}: {
		userId: string | undefined;
		threadId: string | undefined;
		values: string[];
		abortSignal?: AbortSignal;
		headers?: Record<string, string>;
		agentName?: string;
	} & Pick<Config, "usageHandler" | "textEmbeddingModel" | "callSettings">,
): Promise<{ embeddings: number[][] }> {
	const embeddingModel = textEmbeddingModel;
	assert(
		embeddingModel,
		"a textEmbeddingModel is required to be set for vector search",
	);
	const result = await embedMany_({
		...callSettings,
		model: embeddingModel,
		values,
		abortSignal,
		headers,
	});
	if (usageHandler && result.usage) {
		await usageHandler(ctx, {
			userId,
			threadId,
			agentName,
			model: getModelName(embeddingModel),
			provider: getProviderName(embeddingModel),
			providerMetadata: undefined,
			usage: {
				inputTokens: result.usage.tokens,
				outputTokens: 0,
				totalTokens: result.usage.tokens,
				inputTokenDetails: {
					noCacheTokens: undefined,
					cacheReadTokens: undefined,
					cacheWriteTokens: undefined,
				},
				outputTokenDetails: {
					textTokens: undefined,
					reasoningTokens: undefined,
				},
			},
		});
	}
	return { embeddings: result.embeddings };
}

/**
 * Embed a list of messages, and save the embeddings to the database.
 * @param ctx The ctx parameter to an action.
 * @param component The agent component, usually components.agent.
 * @param args The context for the embedding, passed to the usage handler.
 * @param messages The messages to embed, in the Agent MessageDoc format.
 */
export async function generateAndSaveEmbeddings(
	ctx: ActionCtx,
	component: AgentComponent,
	args: {
		threadId: string | undefined;
		userId: string | undefined;
		agentName?: string;
		textEmbeddingModel: EmbeddingModel;
	} & Pick<Config, "usageHandler" | "callSettings">,
	messages: MessageDoc[],
) {
	const toEmbed = messages.filter((m) => !m.embeddingId && m.message);
	if (toEmbed.length === 0) {
		return;
	}
	const embeddings = await embedMessages(
		ctx,
		args,
		toEmbed.map((m) => m.message!),
	);
	if (embeddings && embeddings.vectors.some((v) => v !== null)) {
		await ctx.runMutation(component.vector.index.insertBatch, {
			vectorDimension: embeddings.dimension,
			vectors: toEmbed
				.map((m, i) => ({
					messageId: m._id,
					model: embeddings.model,
					table: "messages",
					userId: m.userId,
					threadId: m.threadId,
					vector: embeddings.vectors[i]!,
				}))
				.filter((v) => v.vector !== null),
		});
	}
}

/**
 * Similar to fetchContextMessages, but also combines the input messages,
 * with search context, recent messages, input messages, then prompt messages.
 * If there is a promptMessageId and prompt message(s) provided, it will splice
 * the prompt messages into the history to replace the promptMessageId message,
 * but still be followed by any existing messages that were in response to the
 * promptMessageId message.
 */
export async function fetchContextWithPrompt(
	ctx: ActionCtx,
	component: AgentComponent,
	args: {
		prompt: string | (ModelMessage | Message)[] | undefined;
		messages: (ModelMessage | Message)[] | undefined;
		promptMessageId: string | undefined;
		userId: string | undefined;
		threadId: string | undefined;
		agentName?: string;
	} & Options &
		Config,
): Promise<{
	messages: ModelMessage[];
	order: number | undefined;
	stepOrder: number | undefined;
}> {
	const { threadId, userId, textEmbeddingModel } = args;

	const promptArray = getPromptArray(args.prompt);

	const searchText = promptArray.length
		? extractText(promptArray.at(-1)!)
		: args.promptMessageId
			? undefined
			: args.messages?.at(-1)
				? extractText(args.messages.at(-1)!)
				: undefined;
	// If only a messageId is provided, this will add that message to the end.
	const { recentMessages, searchMessages } = await fetchRecentAndSearchMessages(
		ctx,
		component,
		{
			userId,
			threadId,
			targetMessageId: args.promptMessageId,
			searchText,
			contextOptions: args.contextOptions ?? {},
			getEmbedding: async (text) => {
				assert(
					textEmbeddingModel,
					"A textEmbeddingModel is required to be set on the Agent that you're doing vector search with",
				);
				const result = await embedMany(ctx, {
					...args,
					userId,
					values: [text],
					textEmbeddingModel,
				});
				const embedding = result.embeddings[0];
				assert(embedding, "Expected at least one embedding result");
				return {
					embedding,
					textEmbeddingModel,
				};
			},
		},
	);

	const promptMessageIndex = args.promptMessageId
		? recentMessages.findIndex((m) => m._id === args.promptMessageId)
		: -1;
	const promptMessage =
		promptMessageIndex !== -1 ? recentMessages[promptMessageIndex] : undefined;
	let prePromptDocs = recentMessages;
	const messages = args.messages ?? [];
	let existingResponseDocs: MessageDoc[] = [];
	if (promptMessage) {
		prePromptDocs = recentMessages.slice(0, promptMessageIndex);
		existingResponseDocs = recentMessages.slice(promptMessageIndex + 1);
		if (promptArray.length === 0) {
			// If they didn't override the prompt, use the existing prompt message.
			if (promptMessage.message) {
				promptArray.push(promptMessage.message);
			}
		}
		if (!promptMessage.embeddingId && textEmbeddingModel) {
			// Lazily generate embeddings for the prompt message, if it doesn't have
			// embeddings yet. This can happen if the message was saved in a mutation
			// where the LLM is not available.
			await generateAndSaveEmbeddings(
				ctx,
				component,
				{
					...args,
					userId,
					textEmbeddingModel,
				},
				[promptMessage],
			);
		}
	}

	const search = docsToModelMessages(searchMessages);
	const recent = docsToModelMessages(prePromptDocs);
	const inputMessages = messages.map(toModelMessage);
	const inputPrompt = promptArray.map(toModelMessage);
	const existingResponses = docsToModelMessages(existingResponseDocs);

	const allMessages = [
		...search,
		...recent,
		...inputMessages,
		...inputPrompt,
		...existingResponses,
	];
	let processedMessages = args.contextHandler
		? await args.contextHandler(ctx, {
				allMessages,
				search,
				recent,
				inputMessages,
				inputPrompt,
				existingResponses,
				userId,
				threadId,
			})
		: allMessages;

	// Process messages to inline localhost files (if not, file urls pointing to localhost will be sent to LLM providers)
	if (process.env.CONVEX_CLOUD_URL?.startsWith("http://127.0.0.1")) {
		processedMessages = await inlineMessagesFiles(processedMessages);
	}

	return {
		messages: processedMessages,
		order: promptMessage?.order,
		stepOrder: promptMessage?.stepOrder,
	};
}

export function getPromptArray(
	prompt: string | (ModelMessage | Message)[] | undefined,
): (ModelMessage | Message)[] {
	return !prompt
		? []
		: Array.isArray(prompt)
			? prompt
			: [{ role: "user", content: prompt }];
}
