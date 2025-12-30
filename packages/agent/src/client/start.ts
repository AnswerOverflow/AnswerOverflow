import {
	stepCountIs,
	type CallSettings,
	type GenerateObjectResult,
	type IdGenerator,
	type LanguageModel,
	type ModelMessage,
	type StepResult,
	type StopCondition,
	type ToolSet,
} from "ai";
import {
	serializeNewMessagesInStep,
	serializeObjectResult,
} from "../mapping";
import { embedMessages, fetchContextWithPrompt } from "./search";
import type { ActionCtx, AgentComponent, Config, Options } from "./types";
import type { Message, MessageDoc } from "../validators";
import {
	getModelName,
	getProviderName,
	type ModelOrMetadata,
} from "../shared";
import { wrapTools, type ToolCtx } from "./createTool";
import type { Agent } from "./index";
import { assert, omit } from "convex-helpers";
import { saveInputMessages } from "./saveInputMessages";
import type { GenericActionCtx, GenericDataModel } from "convex/server";

export async function startGeneration<
	T,
	Tools extends ToolSet = ToolSet,
	CustomCtx extends object = object,
>(
	ctx: ActionCtx & CustomCtx,
	component: AgentComponent,
	/**
	 * These are the arguments you'll pass to the LLM call such as
	 * `generateText` or `streamText`. This function will look up the context
	 * and provide functions to save the steps, abort the generation, and more.
	 * The type of the arguments returned infers from the type of the arguments
	 * you pass here.
	 */
	args: T & {
		/**
		 * If provided, this message will be used as the "prompt" for the LLM call,
		 * instead of the prompt or messages.
		 * This is useful if you want to first save a user message, then use it as
		 * the prompt for the LLM call in another call.
		 */
		promptMessageId?: string;
		/**
		 * The model to use for the LLM calls. This will override the model specified
		 * in the Agent constructor.
		 */
		model?: LanguageModel;
		/**
		 * The tools to use for the tool calls. This will override tools specified
		 * in the Agent constructor or createThread / continueThread.
		 */
		tools?: Tools;
		/**
		 * The single prompt message to use for the LLM call. This will be the
		 * last message in the context. If it's a string, it will be a user role.
		 */
		prompt?: string | (ModelMessage | Message)[];
		/**
		 * If provided alongside prompt, the ordering will be:
		 * 1. system prompt
		 * 2. search context
		 * 3. recent messages
		 * 4. these messages
		 * 5. prompt messages, including those already on the same `order` as
		 *   the promptMessageId message, if provided.
		 */
		messages?: (ModelMessage | Message)[];
		/**
		 * The abort signal to be passed to the LLM call. If triggered, it will
		 * mark the pending message as failed. If the generation is asynchronously
		 * aborted, it will trigger this signal when detected.
		 */
		abortSignal?: AbortSignal;
		stopWhen?: StopCondition<Tools> | Array<StopCondition<Tools>>;
		_internal?: { generateId?: IdGenerator };
	},
	{
		threadId,
		...opts
	}: Options &
		Config & {
			userId?: string | null;
			threadId?: string;
			languageModel?: LanguageModel;
			agentName: string;
			agentForToolCtx?: Agent;
		},
): Promise<{
	args: T & {
		system?: string;
		model: LanguageModel;
		messages: ModelMessage[];
		prompt?: never;
		tools?: Tools;
	} & CallSettings;
	order: number;
	stepOrder: number;
	userId: string | undefined;
	promptMessageId: string | undefined;
	updateModel: (model: ModelOrMetadata | undefined) => void;
	save: <TOOLS extends ToolSet>(
		toSave:
			| { step: StepResult<TOOLS> }
			| { object: GenerateObjectResult<unknown> },
		createPendingMessage?: boolean,
	) => Promise<void>;
	fail: (reason: string) => Promise<void>;
	getSavedMessages: () => MessageDoc[];
}> {
	const userId =
		opts.userId ??
		(threadId &&
			(await ctx.runQuery(component.threads.getThread, { threadId }))
				?.userId) ??
		undefined;

	const context = await fetchContextWithPrompt(ctx, component, {
		...opts,
		userId,
		threadId,
		messages: args.messages,
		prompt: args.prompt,
		promptMessageId: args.promptMessageId,
	});

	const saveMessages = opts.storageOptions?.saveMessages ?? "promptAndOutput";
	const { promptMessageId, pendingMessage, savedMessages } =
		threadId && saveMessages !== "none"
			? await saveInputMessages(ctx, component, {
					...opts,
					userId,
					threadId,
					prompt: args.prompt,
					messages: args.messages,
					promptMessageId: args.promptMessageId,
					storageOptions: { saveMessages },
				})
			: {
					promptMessageId: args.promptMessageId,
					pendingMessage: undefined,
					savedMessages: [] as MessageDoc[],
				};

	const order = pendingMessage?.order ?? context.order;
	const stepOrder = pendingMessage?.stepOrder ?? context.stepOrder;
	let pendingMessageId = pendingMessage?._id;

	const model = args.model ?? opts.languageModel;
	assert(model, "model is required");
	let activeModel: ModelOrMetadata = model;

	const fail = async (reason: string) => {
		if (pendingMessageId) {
			await ctx.runMutation(component.messages.finalizeMessage, {
				messageId: pendingMessageId,
				result: { status: "failed", error: reason },
			});
		}
	};
	if (args.abortSignal) {
		const abortSignal = args.abortSignal;
		abortSignal.addEventListener(
			"abort",
			async () => {
				await fail(abortSignal.reason?.toString() ?? "abortSignal");
			},
			{ once: true },
		);
	}
	const toolCtx = {
		...(ctx as GenericActionCtx<GenericDataModel> & CustomCtx),
		userId,
		threadId,
		promptMessageId,
		agent: opts.agentForToolCtx,
	} satisfies ToolCtx;
	const tools = wrapTools(toolCtx, args.tools) as Tools;
	const aiArgs = {
		...opts.callSettings,
		providerOptions: opts.providerOptions,
		...omit(args, ["promptMessageId", "messages", "prompt"]),
		model,
		messages: context.messages,
		stopWhen:
			args.stopWhen ?? (opts.maxSteps ? stepCountIs(opts.maxSteps) : undefined),
		tools,
	} as T & {
		model: LanguageModel;
		messages: ModelMessage[];
		prompt?: never;
		tools?: Tools;
		_internal?: { generateId?: IdGenerator };
	} & CallSettings;
	if (pendingMessageId) {
		if (!aiArgs._internal?.generateId) {
			aiArgs._internal = {
				...aiArgs._internal,
				generateId: pendingMessageId
					? () => pendingMessageId ?? crypto.randomUUID()
					: undefined,
			};
		}
	}
	return {
		args: aiArgs,
		order: order ?? 0,
		stepOrder: stepOrder ?? 0,
		userId,
		promptMessageId,
		getSavedMessages: () => savedMessages,
		updateModel: (model: ModelOrMetadata | undefined) => {
			if (model) {
				activeModel = model;
			}
		},
		fail,
		save: async <TOOLS extends ToolSet>(
			toSave:
				| { step: StepResult<TOOLS> }
				| { object: GenerateObjectResult<unknown> },
			createPendingMessage?: boolean,
		) => {
			if (threadId && saveMessages !== "none") {
				const serialized =
					"object" in toSave
						? await serializeObjectResult(
								ctx,
								component,
								toSave.object,
								activeModel,
							)
						: await serializeNewMessagesInStep(
								ctx,
								component,
								toSave.step,
								activeModel,
							);
				const embeddings = await embedMessages(
					ctx,
					{ threadId, ...opts, userId },
					serialized.messages.map((m) => m.message),
				);
				if (createPendingMessage) {
					serialized.messages.push({
						message: { role: "assistant", content: [] },
						status: "pending",
					});
					embeddings?.vectors.push(null);
				}
				const saved = await ctx.runMutation(component.messages.addMessages, {
					userId,
					threadId,
					agentName: opts.agentName,
					promptMessageId,
					pendingMessageId,
					messages: serialized.messages,
					embeddings,
					failPendingSteps: false,
				});
				const lastMessage = saved.messages.at(-1)!;
				if (createPendingMessage) {
					if (lastMessage.status === "failed") {
						pendingMessageId = undefined;
						savedMessages.push(...saved.messages);
						await fail(
							lastMessage.error ??
								"Aborting - the pending message was marked as failed",
						);
					} else {
						pendingMessageId = lastMessage._id;
						savedMessages.push(...saved.messages.slice(0, -1));
					}
				} else {
					pendingMessageId = undefined;
					savedMessages.push(...saved.messages);
				}
			}
			const output = "object" in toSave ? toSave.object : toSave.step;
			if (opts.rawRequestResponseHandler) {
				await opts.rawRequestResponseHandler(ctx, {
					userId,
					threadId,
					agentName: opts.agentName,
					request: output.request,
					response: output.response,
				});
			}
			if (opts.usageHandler && output.usage) {
				await opts.usageHandler(ctx, {
					userId,
					threadId,
					agentName: opts.agentName,
					model: getModelName(activeModel),
					provider: getProviderName(activeModel),
					usage: output.usage,
					providerMetadata: output.providerMetadata,
				});
			}
		},
	};
}
