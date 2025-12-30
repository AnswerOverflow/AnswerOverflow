import type { JSONValue } from "@ai-sdk/provider";
import type {
	FlexibleSchema,
	IdGenerator,
	InferSchema,
} from "@ai-sdk/provider-utils";
import type {
	CallSettings,
	GenerateObjectResult,
	GenerateTextResult,
	LanguageModel,
	ModelMessage,
	StepResult,
	StopCondition,
	StreamTextResult,
	ToolChoice,
	ToolSet,
} from "ai";
import {
	generateObject,
	generateText,
	Output,
	stepCountIs,
	streamObject,
} from "ai";
import { assert, omit, pick } from "convex-helpers";
import {
	internalActionGeneric,
	internalMutationGeneric,
	type GenericActionCtx,
	type GenericDataModel,
	type PaginationOptions,
	type PaginationResult,
	type WithoutSystemFields,
} from "convex/server";
import { convexToJson, v, type Value } from "convex/values";
import type { threadFieldsSupportingPatch } from "../component/threads";
import { type VectorDimension } from "../component/vector/tables";
import {
	toModelMessage,
	serializeMessage,
	serializeNewMessagesInStep,
	serializeObjectResult,
} from "../mapping";
import { getModelName, getProviderName } from "../shared";
import {
	vMessageEmbeddings,
	vMessageWithMetadata,
	vSafeObjectArgs,
	vTextArgs,
	type Message,
	type MessageDoc,
	type MessageStatus,
	type MessageWithMetadata,
	type ProviderMetadata,
	type StreamArgs,
	type ThreadDoc,
} from "../validators";
import {
	listMessages,
	saveMessages,
	type SaveMessageArgs,
	type SaveMessagesArgs,
} from "./messages";
import {
	embedMany,
	embedMessages,
	fetchContextMessages,
	generateAndSaveEmbeddings,
} from "./search";
import { startGeneration } from "./start";
import { syncStreams, type StreamingOptions } from "./streaming";
import { createThread, getThreadMetadata } from "./threads";
import type {
	ActionCtx,
	AgentComponent,
	Config,
	ContextOptions,
	GenerateObjectArgs,
	GenerationOutputMetadata,
	MaybeCustomCtx,
	ObjectMode,
	Options,
	RawRequestResponseHandler,
	MutationCtx,
	StorageOptions,
	StreamingTextArgs,
	StreamObjectArgs,
	SyncStreamsReturnValue,
	TextArgs,
	Thread,
	UsageHandler,
	QueryCtx,
	AgentPrompt,
} from "./types";
import { streamText } from "./streamText";
import { errorToString, willContinue } from "./utils";

export { stepCountIs } from "ai";
export {
	docsToModelMessages,
	toModelMessage,
	//** @deprecated use toModelMessage instead */
	toModelMessage as deserializeMessage,
	guessMimeType,
	serializeDataOrUrl,
	serializeMessage,
	toUIFilePart,
} from "../mapping";
// NOTE: these are also exported via @convex-dev/agent/validators
// a future version may put them all here or move these over there
export { extractText, isTool, sorted } from "../shared";
export {
	vAssistantMessage,
	vContent,
	vContextOptions,
	vMessage,
	vMessageDoc,
	vPaginationResult,
	vProviderMetadata,
	vSource,
	vStorageOptions,
	vStreamArgs,
	vSystemMessage,
	vThreadDoc,
	vToolMessage,
	vUsage,
	vUserMessage,
	type Message,
	type MessageDoc,
	type SourcePart,
	type ThreadDoc,
	type Usage,
} from "../validators";
export { createTool, type ToolCtx } from "./createTool";
export {
	definePlaygroundAPI,
	type AgentsFn,
	type PlaygroundAPI,
} from "./definePlaygroundAPI";
export { getFile, storeFile } from "./files";
export {
	listMessages,
	listUIMessages,
	saveMessage,
	saveMessages,
	type SaveMessageArgs,
	type SaveMessagesArgs,
} from "./messages";
export { mockModel } from "./mockModel";
export {
	fetchContextMessages,
	filterOutOrphanedToolMessages,
	fetchContextWithPrompt,
	generateAndSaveEmbeddings,
	embedMessages,
	embedMany,
} from "./search";
export { startGeneration } from "./start";
export {
	DEFAULT_STREAMING_OPTIONS,
	DeltaStreamer,
	abortStream,
	compressUIMessageChunks,
	listStreams,
	syncStreams,
	vStreamMessagesReturnValue,
} from "./streaming";
export {
	createThread,
	getThreadMetadata,
	searchThreadTitles,
	updateThreadMetadata,
} from "./threads";
export type { ContextHandler } from "./types";
export {
	toUIMessages,
	fromUIMessages,
	fromUIMessagesAsync,
	type UIMessage,
} from "../UIMessages";

export type {
	AgentComponent,
	Config,
	ContextOptions,
	ProviderMetadata,
	RawRequestResponseHandler,
	StorageOptions,
	StreamArgs,
	SyncStreamsReturnValue,
	Thread,
	UsageHandler,
};

export class Agent<
	/**
	 * You can require that all `ctx` args to generateText & streamText
	 * have a certain shape by passing a type here.
	 * e.g.
	 * ```ts
	 * const myAgent = new Agent<{ orgId: string }>(...);
	 * ```
	 * This is useful if you want to share that type in `createTool`
	 * e.g.
	 * ```ts
	 * type MyCtx = ToolCtx & { orgId: string };
	 * const myTool = createTool({
	 *   args: z.object({...}),
	 *   description: "...",
	 *   handler: async (ctx: MyCtx, args) => {
	 *     // use ctx.orgId
	 *   },
	 * });
	 */
	CustomCtx extends object = object,
	AgentTools extends ToolSet = any,
> {
	constructor(
		public component: AgentComponent,
		public options: Config & {
			/**
			 * The name for the agent. This will be attributed on each message
			 * created by this agent.
			 */
			name: string;
			/**
			 * The LLM model to use for generating / streaming text and objects.
			 * e.g.
			 * import { openai } from "@ai-sdk/openai"
			 * const myAgent = new Agent(components.agent, {
			 *   languageModel: openai.chat("gpt-4o-mini"),
			 */
			languageModel: LanguageModel;
			/**
			 * The default system prompt to put in each request.
			 * Override per-prompt by passing the "system" parameter.
			 */
			instructions?: string;
			/**
			 * Tools that the agent can call out to and get responses from.
			 * They can be AI SDK tools (import {tool} from "ai")
			 * or tools that have Convex context
			 * (import { createTool } from "@convex-dev/agent")
			 */
			tools?: AgentTools;
			/**
			 * When generating or streaming text with tools available, this
			 * determines when to stop. Defaults to the AI SDK default.
			 */
			stopWhen?:
				| StopCondition<NoInfer<AgentTools>>
				| Array<StopCondition<NoInfer<AgentTools>>>;
		},
	) {}

	/**
	 * Start a new thread with the agent. This will have a fresh history, though if
	 * you pass in a userId you can have it search across other threads for relevant
	 * messages as context for the LLM calls.
	 * @param ctx The context of the Convex function. From an action, you can thread
	 *   with the agent. From a mutation, you can start a thread and save the threadId
	 *   to pass to continueThread later.
	 * @param args The thread metadata.
	 * @returns The threadId of the new thread and the thread object.
	 */
	async createThread(
		ctx: ActionCtx & CustomCtx,
		args?: {
			/**
			 * The userId to associate with the thread. If not provided, the thread will be
			 * anonymous.
			 */
			userId?: string | null;
			/**
			 * The title of the thread. Not currently used for anything.
			 */
			title?: string;
			/**
			 * The summary of the thread. Not currently used for anything.
			 */
			summary?: string;
		},
	): Promise<{ threadId: string; thread: Thread<AgentTools> }>;
	/**
	 * Start a new thread with the agent. This will have a fresh history, though if
	 * you pass in a userId you can have it search across other threads for relevant
	 * messages as context for the LLM calls.
	 * @param ctx The context of the Convex function. From a mutation, you can
	 * start a thread and save the threadId to pass to continueThread later.
	 * @param args The thread metadata.
	 * @returns The threadId of the new thread.
	 */
	async createThread(
		ctx: MutationCtx,
		args?: {
			/**
			 * The userId to associate with the thread. If not provided, the thread will be
			 * anonymous.
			 */
			userId?: string | null;
			/**
			 * The title of the thread. Not currently used for anything.
			 */
			title?: string;
			/**
			 * The summary of the thread. Not currently used for anything.
			 */
			summary?: string;
		},
	): Promise<{ threadId: string }>;
	async createThread(
		ctx: (ActionCtx & CustomCtx) | MutationCtx,
		args?: { userId: string | null; title?: string; summary?: string },
	): Promise<{ threadId: string; thread?: Thread<AgentTools> }> {
		const threadId = await createThread(ctx, this.component, args);
		if (!("runAction" in ctx) || "workflowId" in ctx) {
			return { threadId };
		}
		const { thread } = await this.continueThread(ctx, {
			threadId,
			userId: args?.userId,
		});
		return { threadId, thread };
	}

	/**
	 * Continues a thread using this agent. Note: threads can be continued
	 * by different agents. This is a convenience around calling the various
	 * generate and stream functions with explicit userId and threadId parameters.
	 * @param ctx The ctx object passed to the action handler
	 * @param { threadId, userId }: the thread and user to associate the messages with.
	 * @returns Functions bound to the userId and threadId on a `{thread}` object.
	 */
	async continueThread(
		ctx: ActionCtx & CustomCtx,
		args: {
			/**
			 * The associated thread created by {@link createThread}
			 */
			threadId: string;
			/**
			 * If supplied, the userId can be used to search across other threads for
			 * relevant messages from the same user as context for the LLM calls.
			 */
			userId?: string | null;
		},
	): Promise<{ thread: Thread<AgentTools> }> {
		return {
			thread: {
				threadId: args.threadId,
				getMetadata: this.getThreadMetadata.bind(this, ctx, {
					threadId: args.threadId,
				}),
				updateMetadata: (patch: Partial<WithoutSystemFields<ThreadDoc>>) =>
					ctx.runMutation(this.component.threads.updateThread, {
						threadId: args.threadId,
						patch,
					}),
				generateText: this.generateText.bind(this, ctx, args),
				streamText: this.streamText.bind(this, ctx, args),
				generateObject: this.generateObject.bind(this, ctx, args),
				streamObject: this.streamObject.bind(this, ctx, args),
			} as Thread<AgentTools>,
		};
	}

	async start<
		TOOLS extends ToolSet | undefined,
		T extends {
			_internal?: { generateId?: IdGenerator };
		},
	>(
		ctx: ActionCtx & CustomCtx,
		/**
		 * These are the arguments you'll pass to the LLM call such as
		 * `generateText` or `streamText`. This function will look up the context
		 * and provide functions to save the steps, abort the generation, and more.
		 * The type of the arguments returned infers from the type of the arguments
		 * you pass here.
		 */
		args: T &
			AgentPrompt & {
				/**
				 * The tools to use for the tool calls. This will override tools specified
				 * in the Agent constructor or createThread / continueThread.
				 */
				tools?: TOOLS;
				/**
				 * The abort signal to be passed to the LLM call. If triggered, it will
				 * mark the pending message as failed. If the generation is asynchronously
				 * aborted, it will trigger this signal when detected.
				 */
				abortSignal?: AbortSignal;
				stopWhen?:
					| StopCondition<TOOLS extends undefined ? AgentTools : TOOLS>
					| Array<StopCondition<TOOLS extends undefined ? AgentTools : TOOLS>>;
			},
		options?: Options & { userId?: string | null; threadId?: string },
	): Promise<{
		args: T & {
			system?: string;
			model: LanguageModel;
			prompt?: never;
			messages: ModelMessage[];
			tools?: TOOLS extends undefined ? AgentTools : TOOLS;
		} & CallSettings;
		order: number;
		stepOrder: number;
		userId: string | undefined;
		promptMessageId: string | undefined;
		updateModel: (model: LanguageModel | undefined) => void;
		save: <TOOLS extends ToolSet>(
			toSave:
				| { step: StepResult<TOOLS> }
				| { object: GenerateObjectResult<unknown> },
			createPendingMessage?: boolean,
		) => Promise<void>;
		fail: (reason: string) => Promise<void>;
		getSavedMessages: () => MessageDoc[];
	}> {
		type Tools = TOOLS extends undefined ? AgentTools : TOOLS;
		return startGeneration<T, Tools, CustomCtx>(
			ctx,
			this.component,
			{
				...args,
				tools: (args.tools ?? this.options.tools) as Tools,
				system: args.system ?? this.options.instructions,
				stopWhen: (args.stopWhen ?? this.options.stopWhen) as
					| StopCondition<Tools>
					| Array<StopCondition<Tools>>,
			},
			{
				...this.options,
				...options,
				agentName: this.options.name,
				agentForToolCtx: this,
			},
		);
	}

	/**
	 * This behaves like {@link generateText} from the "ai" package except that
	 * it add context based on the userId and threadId and saves the input and
	 * resulting messages to the thread, if specified.
	 * Use {@link continueThread} to get a version of this function already scoped
	 * to a thread (and optionally userId).
	 * @param ctx The context passed from the action function calling this.
	 * @param scope: The user and thread to associate the message with
	 * @param generateTextArgs The arguments to the generateText function, along
	 * with {@link AgentPrompt} options, such as promptMessageId.
	 * @param options Extra controls for the {@link ContextOptions} and {@link StorageOptions}.
	 * @returns The result of the generateText function.
	 */
	async generateText<TOOLS extends ToolSet | undefined = undefined>(
		ctx: ActionCtx & CustomCtx,
		threadOpts: { userId?: string | null; threadId?: string },
		/**
		 * The arguments to the generateText function, similar to the ai sdk's
		 * {@link generateText} function, along with Agent prompt options.
		 */
		generateTextArgs: AgentPrompt & TextArgs<AgentTools, TOOLS>,
		options?: Options,
	): Promise<
		GenerateTextResult<
			TOOLS extends undefined ? AgentTools : TOOLS,
			ReturnType<typeof Output.text>
		> &
			GenerationOutputMetadata
	> {
		const { args, promptMessageId, order, ...call } = await this.start(
			ctx,
			generateTextArgs,
			{ ...threadOpts, ...options },
		);

		type Tools = TOOLS extends undefined ? AgentTools : TOOLS;
		const steps: StepResult<Tools>[] = [];
		try {
			const result = (await generateText<Tools>({
				...args,
				prepareStep: async (options) => {
					const result = await generateTextArgs.prepareStep?.(options);
					call.updateModel(result?.model ?? options.model);
					return result;
				},
				onStepFinish: async (step) => {
					steps.push(step);
					await call.save({ step }, await willContinue(steps, args.stopWhen));
					return generateTextArgs.onStepFinish?.(step);
				},
			})) as GenerateTextResult<Tools, ReturnType<typeof Output.text>>;
			const metadata: GenerationOutputMetadata = {
				promptMessageId,
				order,
				savedMessages: call.getSavedMessages(),
				messageId: promptMessageId,
			};
			return Object.assign(result, metadata);
		} catch (error) {
			await call.fail(errorToString(error));
			throw error;
		}
	}

	/**
	 * This behaves like {@link streamText} from the "ai" package except that
	 * it add context based on the userId and threadId and saves the input and
	 * resulting messages to the thread, if specified.
	 * Use {@link continueThread} to get a version of this function already scoped
	 * to a thread (and optionally userId).
	 */
	async streamText<TOOLS extends ToolSet | undefined = undefined>(
		ctx: ActionCtx & CustomCtx,
		threadOpts: { userId?: string | null; threadId?: string },
		/**
		 * The arguments to the streamText function, similar to the ai sdk's
		 * {@link streamText} function, along with Agent prompt options.
		 */
		streamTextArgs: AgentPrompt & StreamingTextArgs<AgentTools, TOOLS>,
		/**
		 * The {@link ContextOptions} and {@link StorageOptions}
		 * options to use for fetching contextual messages and saving input/output messages.
		 */
		options?: Options & {
			/**
			 * Whether to save incremental data (deltas) from streaming responses.
			 * Defaults to false.
			 * If false, it will not save any deltas to the database.
			 * If true, it will save deltas with {@link DEFAULT_STREAMING_OPTIONS}.
			 *
			 * Regardless of this option, when streaming you are able to use this
			 * `streamText` function as you would with the "ai" package's version:
			 * iterating over the text, streaming it over HTTP, etc.
			 */
			saveStreamDeltas?: boolean | StreamingOptions;
		},
	): Promise<
		StreamTextResult<
			TOOLS extends undefined ? AgentTools : TOOLS,
			ReturnType<typeof Output.text>
		> &
			GenerationOutputMetadata
	> {
		type Tools = TOOLS extends undefined ? AgentTools : TOOLS;
		return streamText<Tools>(
			ctx,
			this.component,
			{
				...streamTextArgs,
				model: streamTextArgs.model ?? this.options.languageModel,
				tools: (streamTextArgs.tools ?? this.options.tools) as Tools,
				system: streamTextArgs.system ?? this.options.instructions,
				stopWhen: (streamTextArgs.stopWhen ?? this.options.stopWhen) as
					| StopCondition<Tools>
					| Array<StopCondition<Tools>>,
			},
			{
				...threadOpts,
				...this.options,
				agentName: this.options.name,
				agentForToolCtx: this,
				...options,
			},
		);
	}

	/**
	 * This behaves like {@link generateObject} from the "ai" package except that
	 * it add context based on the userId and threadId and saves the input and
	 * resulting messages to the thread, if specified.
	 * Use {@link continueThread} to get a version of this function already scoped
	 * to a thread (and optionally userId).
	 */
	async generateObject<
		SCHEMA extends FlexibleSchema<unknown> = FlexibleSchema<JSONValue>,
		OUTPUT extends ObjectMode = InferSchema<SCHEMA> extends string
			? "enum"
			: "object",
		RESULT = OUTPUT extends "array"
			? Array<InferSchema<SCHEMA>>
			: InferSchema<SCHEMA>,
	>(
		ctx: ActionCtx & CustomCtx,
		threadOpts: { userId?: string | null; threadId?: string },
		/**
		 * The arguments to the generateObject function, similar to the ai sdk's
		 * {@link generateObject} function, along with Agent prompt options.
		 */
		generateObjectArgs: AgentPrompt &
			GenerateObjectArgs<SCHEMA, OUTPUT, RESULT>,
		/**
		 * The {@link ContextOptions} and {@link StorageOptions}
		 * options to use for fetching contextual messages and saving input/output messages.
		 */
		options?: Options,
	): Promise<GenerateObjectResult<RESULT> & GenerationOutputMetadata> {
		const { args, promptMessageId, order, fail, save, getSavedMessages } =
			await this.start(ctx, generateObjectArgs, { ...threadOpts, ...options });

		try {
			const result = (await generateObject(
				args,
			)) as GenerateObjectResult<RESULT>;

			await save({ object: result });
			const metadata: GenerationOutputMetadata = {
				promptMessageId,
				order,
				savedMessages: getSavedMessages(),
				messageId: promptMessageId,
			};
			return Object.assign(result, metadata);
		} catch (error) {
			await fail(errorToString(error));
			throw error;
		}
	}

	/**
	 * This behaves like `streamObject` from the "ai" package except that
	 * it add context based on the userId and threadId and saves the input and
	 * resulting messages to the thread, if specified.
	 * Use {@link continueThread} to get a version of this function already scoped
	 * to a thread (and optionally userId).
	 */
	async streamObject<
		SCHEMA extends FlexibleSchema<unknown> = FlexibleSchema<JSONValue>,
		OUTPUT extends ObjectMode = InferSchema<SCHEMA> extends string
			? "enum"
			: "object",
		RESULT = OUTPUT extends "array"
			? Array<InferSchema<SCHEMA>>
			: InferSchema<SCHEMA>,
	>(
		ctx: ActionCtx & CustomCtx,
		threadOpts: { userId?: string | null; threadId?: string },
		/**
		 * The arguments to the streamObject function, similar to the ai sdk's
		 * {@link streamObject} function, along with Agent prompt options.
		 */
		streamObjectArgs: AgentPrompt & StreamObjectArgs<SCHEMA, OUTPUT, RESULT>,
		/**
		 * The {@link ContextOptions} and {@link StorageOptions}
		 * options to use for fetching contextual messages and saving input/output messages.
		 */
		options?: Options,
	): Promise<
		ReturnType<typeof streamObject<SCHEMA, OUTPUT, RESULT>> &
			GenerationOutputMetadata
	> {
		const { args, promptMessageId, order, fail, save, getSavedMessages } =
			await this.start(ctx, streamObjectArgs, { ...threadOpts, ...options });

		const stream = streamObject<SCHEMA, OUTPUT, RESULT>({
			...(args as any),
			onError: async (error) => {
				console.error(" streamObject onError", error);
				// TODO: content that we have so far
				// content: stream.fullStream.
				await fail(errorToString(error.error));
				return args.onError?.(error);
			},
			onFinish: async (result) => {
				await save({
					object: {
						object: result.object,
						finishReason: result.error ? "error" : "stop",
						usage: result.usage,
						warnings: result.warnings,
						request: await stream.request,
						response: result.response,
						providerMetadata: result.providerMetadata,
						toJsonResponse: stream.toTextStreamResponse,
						reasoning: undefined,
					},
				});
				return args.onFinish?.(result);
			},
		});
		const metadata: GenerationOutputMetadata = {
			promptMessageId,
			order,
			savedMessages: getSavedMessages(),
			messageId: promptMessageId,
		};
		return Object.assign(stream, metadata);
	}

	/**
	 * Save a message to the thread.
	 * @param ctx A ctx object from a mutation or action.
	 * @param args The message and what to associate it with (user / thread)
	 * You can pass extra metadata alongside the message, e.g. associated fileIds.
	 * @returns The messageId of the saved message.
	 */
	async saveMessage(
		ctx: MutationCtx | ActionCtx,
		args: SaveMessageArgs & {
			/**
			 * If true, it will not generate embeddings for the message.
			 * Useful if you're saving messages in a mutation where you can't run `fetch`.
			 * You can generate them asynchronously by using the scheduler to run an
			 * action later that calls `agent.generateAndSaveEmbeddings`.
			 */
			skipEmbeddings?: boolean;
		},
	) {
		const { messages } = await this.saveMessages(ctx, {
			threadId: args.threadId,
			userId: args.userId,
			embeddings: args.embedding
				? { model: args.embedding.model, vectors: [args.embedding.vector] }
				: undefined,
			messages:
				args.prompt !== undefined
					? [{ role: "user", content: args.prompt }]
					: [args.message],
			metadata: args.metadata ? [args.metadata] : undefined,
			skipEmbeddings: args.skipEmbeddings,
			promptMessageId: args.promptMessageId,
			pendingMessageId: args.pendingMessageId,
		});
		const message = messages.at(-1)!;
		return { messageId: message._id, message };
	}

	/**
	 * Explicitly save messages associated with the thread (& user if provided)
	 * If you have an embedding model set, it will also generate embeddings for
	 * the messages.
	 * @param ctx The ctx parameter to a mutation or action.
	 * @param args The messages and context to save
	 * @returns
	 */
	async saveMessages(
		ctx: MutationCtx | ActionCtx,
		args: SaveMessagesArgs & {
			/**
			 * Skip generating embeddings for the messages. Useful if you're
			 * saving messages in a mutation where you can't run `fetch`.
			 * You can generate them asynchronously by using the scheduler to run an
			 * action later that calls `agent.generateAndSaveEmbeddings`.
			 */
			skipEmbeddings?: boolean;
		},
	): Promise<{ messages: MessageDoc[] }> {
		let embeddings: { vectors: (number[] | null)[]; model: string } | undefined;
		const { skipEmbeddings, ...rest } = args;
		if (args.embeddings) {
			embeddings = args.embeddings;
		} else if (!skipEmbeddings && this.options.textEmbeddingModel) {
			if (!("runAction" in ctx)) {
				console.warn(
					"You're trying to save messages and generate embeddings, but you're in a mutation. " +
						"Pass `skipEmbeddings: true` to skip generating embeddings in the mutation and skip this warning. " +
						"They will be generated lazily when you generate or stream text / objects. " +
						"You can explicitly generate them asynchronously by using the scheduler to run an action later that calls `agent.generateAndSaveEmbeddings`.",
				);
			} else if ("workflowId" in ctx) {
				console.warn(
					"You're trying to save messages and generate embeddings, but you're in a workflow. " +
						"Pass `skipEmbeddings: true` to skip generating embeddings in the workflow and skip this warning. " +
						"They will be generated lazily when you generate or stream text / objects. " +
						"You can explicitly generate them asynchronously by using the scheduler to run an action later that calls `agent.generateAndSaveEmbeddings`.",
				);
			} else {
				embeddings = await this.generateEmbeddings(
					ctx,
					{ userId: args.userId ?? undefined, threadId: args.threadId },
					args.messages,
				);
			}
		}
		return saveMessages(ctx, this.component, {
			...rest,
			agentName: this.options.name,
			embeddings,
		});
	}

	/**
	 * List messages from a thread.
	 * @param ctx A ctx object from a query, mutation, or action.
	 * @param args.threadId The thread to list messages from.
	 * @param args.paginationOpts Pagination options (e.g. via usePaginatedQuery).
	 * @param args.excludeToolMessages Whether to exclude tool messages.
	 *   False by default.
	 * @param args.statuses What statuses to include. All by default.
	 * @returns The MessageDoc's in a format compatible with usePaginatedQuery.
	 */
	async listMessages(
		ctx: QueryCtx | MutationCtx | ActionCtx,
		args: {
			threadId: string;
			paginationOpts: PaginationOptions;
			excludeToolMessages?: boolean;
			statuses?: MessageStatus[];
		},
	): Promise<PaginationResult<MessageDoc>> {
		return listMessages(ctx, this.component, args);
	}

	/**
	 * A function that handles fetching stream deltas, used with the React hooks
	 * `useThreadMessages` or `useStreamingThreadMessages`.
	 * @param ctx A ctx object from a query, mutation, or action.
	 * @param args.threadId The thread to sync streams for.
	 * @param args.streamArgs The stream arguments with per-stream cursors.
	 * @returns The deltas for each stream from their existing cursor.
	 */
	async syncStreams(
		ctx: QueryCtx | MutationCtx | ActionCtx,
		args: {
			threadId: string;
			streamArgs: StreamArgs | undefined;
			// By default, only streaming messages are included.
			includeStatuses?: ("streaming" | "finished" | "aborted")[];
		},
	): Promise<SyncStreamsReturnValue | undefined> {
		return syncStreams(ctx, this.component, args);
	}

	/**
	 * Fetch the context messages for a thread.
	 * @param ctx Either a query, mutation, or action ctx.
	 *   If it is not an action context, you can't do text or
	 *   vector search.
	 * @param args The associated thread, user, message
	 * @returns
	 */
	async fetchContextMessages(
		ctx: QueryCtx | MutationCtx | ActionCtx,
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
			contextOptions: ContextOptions | undefined;
		},
	): Promise<MessageDoc[]> {
		assert(args.userId || args.threadId, "Specify userId or threadId");
		const contextOptions = {
			...this.options.contextOptions,
			...args.contextOptions,
		};
		return fetchContextMessages(ctx, this.component, {
			...args,
			contextOptions,
			getEmbedding: async (text) => {
				assert("runAction" in ctx);
				assert(
					this.options.textEmbeddingModel,
					"A textEmbeddingModel is required to be set on the Agent that you're doing vector search with",
				);
				const result = await embedMany(ctx, {
					...this.options,
					agentName: this.options.name,
					userId: args.userId,
					threadId: args.threadId,
					values: [text],
				});
				const embedding = result.embeddings[0];
				assert(embedding, "Expected at least one embedding result");
				return {
					embedding,
					textEmbeddingModel: this.options.textEmbeddingModel,
				};
			},
		});
	}

	/**
	 * Get the metadata for a thread.
	 * @param ctx A ctx object from a query, mutation, or action.
	 * @param args.threadId The thread to get the metadata for.
	 * @returns The metadata for the thread.
	 */
	async getThreadMetadata(
		ctx: QueryCtx | MutationCtx | ActionCtx,
		args: { threadId: string },
	): Promise<ThreadDoc> {
		return getThreadMetadata(ctx, this.component, args);
	}

	/**
	 * Update the metadata for a thread.
	 * @param ctx A ctx object from a mutation or action.
	 * @param args.threadId The thread to update the metadata for.
	 * @param args.patch The patch to apply to the thread.
	 * @returns The updated thread metadata.
	 */
	async updateThreadMetadata(
		ctx: MutationCtx | ActionCtx,
		args: {
			threadId: string;
			patch: Partial<
				Pick<ThreadDoc, (typeof threadFieldsSupportingPatch)[number]>
			>;
		},
	): Promise<ThreadDoc> {
		const thread = await ctx.runMutation(
			this.component.threads.updateThread,
			args,
		);
		return thread;
	}

	/**
	 * Get the embeddings for a set of messages.
	 * @param messages The messages to get the embeddings for.
	 * @returns The embeddings for the messages.
	 */
	async generateEmbeddings(
		ctx: ActionCtx,
		args: { userId: string | undefined; threadId: string | undefined },
		messages: (ModelMessage | Message)[],
	): Promise<
		| {
				vectors: (number[] | null)[];
				dimension: VectorDimension;
				model: string;
		  }
		| undefined
	> {
		return embedMessages(
			ctx,
			{ ...args, ...this.options, agentName: this.options.name },
			messages,
		);
	}

	/**
	 * Generate embeddings for a set of messages, and save them to the database.
	 * It will not generate or save embeddings for messages that already have an
	 * embedding.
	 * @param ctx The ctx parameter to an action.
	 * @param args The messageIds to generate embeddings for.
	 */
	async generateAndSaveEmbeddings(
		ctx: ActionCtx,
		args: { messageIds: string[] },
	) {
		const messages = (
			await ctx.runQuery(this.component.messages.getMessagesByIds, {
				messageIds: args.messageIds,
			})
		).filter((m): m is NonNullable<typeof m> => m !== null);
		if (messages.length === 0) {
			throw new Error("No messages found for the given IDs");
		}
		if (messages.length !== args.messageIds.length) {
			throw new Error(
				"Some messages were not found: " +
					args.messageIds
						.filter((id) => !messages.some((m) => m?._id === id))
						.join(", "),
			);
		}
		if (messages.some((m) => !m.message)) {
			throw new Error(
				"Some messages don't have a message: " +
					messages
						.filter((m) => !m.message)
						.map((m) => m._id)
						.join(", "),
			);
		}
		const { textEmbeddingModel } = this.options;
		if (!textEmbeddingModel) {
			throw new Error(
				"No embeddings were generated for the messages. You must pass a textEmbeddingModel to the agent constructor.",
			);
		}
		const firstMessage = messages[0]!;
		await generateAndSaveEmbeddings(
			ctx,
			this.component,
			{
				...this.options,
				agentName: this.options.name,
				threadId: firstMessage.threadId,
				userId: firstMessage.userId,
				textEmbeddingModel,
			},
			messages,
		);
	}

	/**
	 * Explicitly save a "step" created by the AI SDK.
	 * @param ctx The ctx argument to a mutation or action.
	 * @param args The Step generated by the AI SDK.
	 */
	async saveStep<TOOLS extends ToolSet>(
		ctx: ActionCtx,
		args: {
			userId?: string;
			threadId: string;
			/**
			 * The message this step is in response to.
			 */
			promptMessageId: string;
			/**
			 * The step to save, possibly including multiple tool calls.
			 */
			step: StepResult<TOOLS>;
			/**
			 * The model used to generate the step.
			 * Defaults to the chat model for the Agent.
			 */
			model?: string;
			/**
			 * The provider of the model used to generate the step.
			 * Defaults to the chat provider for the Agent.
			 */
			provider?: string;
		},
	): Promise<{ messages: MessageDoc[] }> {
		const { messages } = await serializeNewMessagesInStep(
			ctx,
			this.component,
			args.step,
			{
				provider: args.provider ?? getProviderName(this.options.languageModel),
				model: args.model ?? getModelName(this.options.languageModel),
			},
		);
		const embeddings = await this.generateEmbeddings(
			ctx,
			{ userId: args.userId, threadId: args.threadId },
			messages.map((m) => m.message),
		);
		return ctx.runMutation(this.component.messages.addMessages, {
			userId: args.userId,
			threadId: args.threadId,
			agentName: this.options.name,
			promptMessageId: args.promptMessageId,
			messages,
			embeddings,
			failPendingSteps: false,
		});
	}

	/**
	 * Manually save the result of a generateObject call to the thread.
	 * This happens automatically when using {@link generateObject} or {@link streamObject}
	 * from the `thread` object created by {@link continueThread} or {@link createThread}.
	 * @param ctx The context passed from the mutation or action function calling this.
	 * @param args The arguments to the saveObject function.
	 */
	async saveObject(
		ctx: ActionCtx,
		args: {
			userId: string | undefined;
			threadId: string;
			promptMessageId: string;
			model: string | undefined;
			provider: string | undefined;
			result: GenerateObjectResult<unknown>;
			metadata?: Omit<MessageWithMetadata, "message">;
		},
	): Promise<{ messages: MessageDoc[] }> {
		const { messages } = await serializeObjectResult(
			ctx,
			this.component,
			args.result,
			{
				model:
					args.model ??
					args.metadata?.model ??
					getModelName(this.options.languageModel),
				provider:
					args.provider ??
					args.metadata?.provider ??
					getProviderName(this.options.languageModel),
			},
		);
		const embeddings = await this.generateEmbeddings(
			ctx,
			{ userId: args.userId, threadId: args.threadId },
			messages.map((m) => m.message),
		);

		return ctx.runMutation(this.component.messages.addMessages, {
			userId: args.userId,
			threadId: args.threadId,
			promptMessageId: args.promptMessageId,
			failPendingSteps: false,
			messages,
			embeddings,
			agentName: this.options.name,
		});
	}

	/**
	 * Commit or rollback a message that was pending.
	 * This is done automatically when saving messages by default.
	 * If creating pending messages, you can call this when the full "transaction" is done.
	 * @param ctx The ctx argument to your mutation or action.
	 * @param args What message to save. Generally the parent message sent into
	 *   the generateText call.
	 */
	async finalizeMessage(
		ctx: MutationCtx | ActionCtx,
		args: {
			messageId: string;
			result: { status: "failed"; error: string } | { status: "success" };
		},
	): Promise<void> {
		await ctx.runMutation(this.component.messages.finalizeMessage, {
			messageId: args.messageId,
			result: args.result,
		});
	}

	/**
	 * Update a message by its id.
	 * @param ctx The ctx argument to your mutation or action.
	 * @param args The message fields to update.
	 */
	async updateMessage(
		ctx: MutationCtx | ActionCtx,
		args: {
			/** The id of the message to update. */
			messageId: string;
			patch: {
				/** The message to replace the existing message. */
				message: ModelMessage | Message;
				/** The status to set on the message. */
				status: "success" | "error";
				/** The error message to set on the message. */
				error?: string;
				/**
				 * These will override the fileIds in the message.
				 * To remove all existing files, pass an empty array.
				 * If passing in a new message, pass in the fileIds you explicitly want to keep
				 * from the previous message, as the new files generated from the new message
				 * will be added to the list.
				 * If you pass undefined, it will not change the fileIds unless new
				 * files are generated from the message. In that case, the new fileIds
				 * will replace the old fileIds.
				 */
				fileIds?: string[];
			};
		},
	): Promise<void> {
		const { message, fileIds } = await serializeMessage(
			ctx,
			this.component,
			args.patch.message,
		);
		await ctx.runMutation(this.component.messages.updateMessage, {
			messageId: args.messageId,
			patch: {
				message,
				fileIds: args.patch.fileIds
					? [...args.patch.fileIds, ...(fileIds ?? [])]
					: fileIds,
				status: args.patch.status === "success" ? "success" : "failed",
				error: args.patch.error,
			},
		});
	}

	/**
	 * Delete multiple messages by their ids, including their embeddings
	 * and reduce the refcount of any files they reference.
	 * @param ctx The ctx argument to your mutation or action.
	 * @param args The ids of the messages to delete.
	 */
	async deleteMessages(
		ctx: MutationCtx | ActionCtx,
		args: { messageIds: string[] },
	): Promise<void> {
		await ctx.runMutation(this.component.messages.deleteByIds, args);
	}

	/**
	 * Delete a single message by its id, including its embedding
	 * and reduce the refcount of any files it references.
	 * @param ctx The ctx argument to your mutation or action.
	 * @param args The id of the message to delete.
	 */
	async deleteMessage(
		ctx: MutationCtx | ActionCtx,
		args: { messageId: string },
	): Promise<void> {
		await ctx.runMutation(this.component.messages.deleteByIds, {
			messageIds: [args.messageId],
		});
	}

	/**
	 * Delete a range of messages by their order and step order.
	 * Each "order" is a set of associated messages in response to the message
	 * at stepOrder 0.
	 * The (startOrder, startStepOrder) is inclusive
	 * and the (endOrder, endStepOrder) is exclusive.
	 * To delete all messages at "order" 1, you can pass:
	 * `{ startOrder: 1, endOrder: 2 }`
	 * To delete a message at step (order=1, stepOrder=1), you can pass:
	 * `{ startOrder: 1, startStepOrder: 1, endOrder: 1, endStepOrder: 2 }`
	 * To delete all messages between (1, 1) up to and including (3, 5), you can pass:
	 * `{ startOrder: 1, startStepOrder: 1, endOrder: 3, endStepOrder: 6 }`
	 *
	 * If it cannot do it in one transaction, it returns information you can use
	 * to resume the deletion.
	 * e.g.
	 * ```ts
	 * let isDone = false;
	 * let lastOrder = args.startOrder;
	 * let lastStepOrder = args.startStepOrder ?? 0;
	 * while (!isDone) {
	 *   // eslint-disable-next-line @typescript-eslint/no-explicit-any
	 *   ({ isDone, lastOrder, lastStepOrder } = await agent.deleteMessageRange(
	 *     ctx,
	 *     {
	 *       threadId: args.threadId,
	 *       startOrder: lastOrder,
	 *       startStepOrder: lastStepOrder,
	 *       endOrder: args.endOrder,
	 *       endStepOrder: args.endStepOrder,
	 *     }
	 *   ));
	 * }
	 * ```
	 * @param ctx The ctx argument to your mutation or action.
	 * @param args The range of messages to delete.
	 */
	async deleteMessageRange(
		ctx: MutationCtx | ActionCtx,
		args: {
			threadId: string;
			startOrder: number;
			startStepOrder?: number;
			endOrder: number;
			endStepOrder?: number;
		},
	): Promise<{ isDone: boolean; lastOrder?: number; lastStepOrder?: number }> {
		return ctx.runMutation(this.component.messages.deleteByOrder, {
			threadId: args.threadId,
			startOrder: args.startOrder,
			startStepOrder: args.startStepOrder,
			endOrder: args.endOrder,
			endStepOrder: args.endStepOrder,
		});
	}

	/**
	 * Delete a thread and all its messages and streams asynchronously (in batches)
	 * This uses a mutation to that processes one page and recursively queues the
	 * next page for deletion.
	 * @param ctx The ctx argument to your mutation or action.
	 * @param args The id of the thread to delete and optionally the page size to use for the delete.
	 */
	async deleteThreadAsync(
		ctx: MutationCtx | ActionCtx,
		args: { threadId: string; pageSize?: number },
	): Promise<void> {
		await ctx.runMutation(this.component.threads.deleteAllForThreadIdAsync, {
			threadId: args.threadId,
			limit: args.pageSize,
		});
	}

	/**
	 * Delete a thread and all its messages and streams synchronously.
	 * This uses an action to iterate through all pages. If the action fails
	 * partway, it will not automatically restart.
	 * @param ctx The ctx argument to your action.
	 * @param args The id of the thread to delete and optionally the page size to use for the delete.
	 */
	async deleteThreadSync(
		ctx: ActionCtx,
		args: { threadId: string; pageSize?: number },
	): Promise<void> {
		await ctx.runAction(this.component.threads.deleteAllForThreadIdSync, {
			threadId: args.threadId,
			limit: args.pageSize,
		});
	}

	/**
	 * WORKFLOW UTILITIES
	 */

	/**
	 * Create a mutation that creates a thread so you can call it from a Workflow.
	 * e.g.
	 * ```ts
	 * // in convex/foo.ts
	 * export const createThread = weatherAgent.createThreadMutation();
	 *
	 * const workflow = new WorkflowManager(components.workflow);
	 * export const myWorkflow = workflow.define({
	 *   args: {},
	 *   handler: async (step) => {
	 *     const { threadId } = await step.runMutation(internal.foo.createThread);
	 *     // use the threadId to generate text, object, etc.
	 *   },
	 * });
	 * ```
	 * @returns A mutation that creates a thread.
	 */
	createThreadMutation() {
		return internalMutationGeneric({
			args: {
				userId: v.optional(v.string()),
				title: v.optional(v.string()),
				summary: v.optional(v.string()),
			},
			handler: async (ctx, args): Promise<{ threadId: string }> => {
				const { threadId } = await this.createThread(ctx, args);
				return { threadId };
			},
		});
	}

	/**
	 * Create an action out of this agent so you can call it from workflows or other actions
	 * without a wrapping function.
	 * @param spec Configuration for the agent acting as an action, including
	 *   {@link ContextOptions}, {@link StorageOptions}, and {@link stopWhen}.
	 */
	asTextAction<DataModel extends GenericDataModel>(
		spec: MaybeCustomCtx<CustomCtx, DataModel, AgentTools> & {
			/**
			 * Whether to stream the text.
			 * If false, it will generate the text in a single call. (default)
			 * If true or {@link StreamingOptions}, it will stream the text from the LLM
			 * and save the chunks to the database with the options you specify, or the
			 * defaults if you pass true.
			 */
			stream?: boolean | StreamingOptions;
			/**
			 * When to stop generating text.
			 * Defaults to the {@link Agent["options"].stopWhen} option.
			 */
			stopWhen?: StopCondition<AgentTools> | Array<StopCondition<AgentTools>>;
		} & Options,
		overrides?: CallSettings,
	) {
		return internalActionGeneric({
			args: vTextArgs,
			handler: async (ctx_, args) => {
				const stream =
					args.stream === true ? spec?.stream || true : (spec?.stream ?? false);
				const { userId, threadId, prompt, messages, maxSteps, ...rest } = args;
				const targetArgs = { userId, threadId };
				const llmArgs = {
					stopWhen: spec?.stopWhen,
					...overrides,
					...omit(rest, ["storageOptions", "contextOptions", "stream"]),
					messages: messages?.map(toModelMessage),
					prompt: Array.isArray(prompt) ? prompt.map(toModelMessage) : prompt,
					toolChoice: args.toolChoice as ToolChoice<AgentTools>,
				} satisfies StreamingTextArgs<AgentTools>;
				if (maxSteps) {
					llmArgs.stopWhen = stepCountIs(maxSteps);
				}
				const opts = {
					...pick(spec, ["contextOptions", "storageOptions"]),
					...pick(args, ["contextOptions", "storageOptions"]),
					saveStreamDeltas: stream,
				};
				const ctx = (
					spec?.customCtx
						? { ...ctx_, ...spec.customCtx(ctx_, targetArgs, llmArgs) }
						: ctx_
				) as GenericActionCtx<GenericDataModel> & CustomCtx;
				if (stream) {
					const result = await this.streamText<any>(
						ctx,
						targetArgs,
						llmArgs,
						opts,
					);
					await result.consumeStream();
					return {
						text: await result.text,
						promptMessageId: result.promptMessageId,
						order: result.order,
						finishReason: await result.finishReason,
						warnings: await result.warnings,
						savedMessageIds: result.savedMessages?.map((m) => m._id) ?? [],
					};
				} else {
					const res = await this.generateText<any>(
						ctx,
						targetArgs,
						llmArgs,
						opts,
					);
					return {
						text: res.text,
						promptMessageId: res.promptMessageId,
						order: res.order,
						finishReason: res.finishReason,
						warnings: res.warnings,
						savedMessageIds: res.savedMessages?.map((m) => m._id) ?? [],
					};
				}
			},
		});
	}
	/**
	 * Create an action that generates an object out of this agent so you can call
	 * it from workflows or other actions without a wrapping function.
	 * @param spec Configuration for the agent acting as an action, including
	 * the normal parameters to {@link generateObject}, plus {@link ContextOptions}
	 * and stopWhen.
	 */
	asObjectAction<T, DataModel extends GenericDataModel>(
		objectArgs: GenerateObjectArgs<FlexibleSchema<T>> & Partial<AgentPrompt>,
		options?: Options &
			MaybeCustomCtx<
				CustomCtx,
				DataModel,
				AgentTools,
				GenerateObjectArgs<FlexibleSchema<T>>
			>,
	) {
		return internalActionGeneric({
			args: vSafeObjectArgs,
			handler: async (ctx_, args) => {
				const { userId, threadId, callSettings, ...rest } = args;
				const overrides = pick(rest, ["contextOptions", "storageOptions"]);
				const targetArgs = { userId, threadId };
				const llmArgs = {
					...objectArgs,
					...callSettings,
					...omit(rest, ["storageOptions", "contextOptions"]),
					messages: args.messages?.map(toModelMessage),
					prompt: Array.isArray(args.prompt)
						? args.prompt.map(toModelMessage)
						: args.prompt,
				} as GenerateObjectArgs<FlexibleSchema<T>>;
				const ctx = (
					options?.customCtx
						? { ...ctx_, ...options.customCtx(ctx_, targetArgs, llmArgs) }
						: ctx_
				) as GenericActionCtx<GenericDataModel> & CustomCtx;
				const value = await this.generateObject(ctx, targetArgs, llmArgs, {
					...this.options,
					...options,
					...overrides,
				});
				return {
					object: convexToJson(value.object as Value) as T,
					promptMessageId: value.promptMessageId,
					order: value.order,
					finishReason: value.finishReason,
					warnings: value.warnings,
					savedMessageIds: value.savedMessages?.map((m) => m._id) ?? [],
				};
			},
		});
	}

	/**
	 * @deprecated Use {@link saveMessages} directly instead.
	 */
	asSaveMessagesMutation() {
		return internalMutationGeneric({
			args: {
				threadId: v.string(),
				userId: v.optional(v.string()),
				promptMessageId: v.optional(v.string()),
				messages: v.array(vMessageWithMetadata),
				failPendingSteps: v.optional(v.boolean()),
				embeddings: v.optional(vMessageEmbeddings),
			},
			handler: async (ctx, args) => {
				const { messages } = await this.saveMessages(ctx, {
					...args,
					messages: args.messages.map((m) => toModelMessage(m.message)),
					metadata: args.messages.map(({ message: _, ...m }) => m),
					skipEmbeddings: true,
				});
				return {
					lastMessageId: messages.at(-1)!._id,
					messages: messages.map((m) => pick(m, ["_id", "order", "stepOrder"])),
				};
			},
		});
	}
}
