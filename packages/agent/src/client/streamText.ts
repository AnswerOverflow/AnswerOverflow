import type {
	StepResult,
	StreamTextResult,
	ToolSet,
	UIMessage as AIUIMessage,
} from "ai";
import { Output, streamText as streamTextAi } from "ai";
import {
	compressUIMessageChunks,
	DeltaStreamer,
	mergeTransforms,
	type StreamingOptions,
} from "./streaming";
import type {
	ActionCtx,
	AgentComponent,
	AgentPrompt,
	GenerationOutputMetadata,
	Options,
} from "./types";
import { startGeneration } from "./start";
import type { Agent } from "./index";
import { getModelName, getProviderName } from "../shared";
import { errorToString, willContinue } from "./utils";

/**
 * This behaves like {@link streamText} from the "ai" package except that
 * it add context based on the userId and threadId and saves the input and
 * resulting messages to the thread, if specified.
 * Use {@link continueThread} to get a version of this function already scoped
 * to a thread (and optionally userId).
 */
export async function streamText<TOOLS extends ToolSet>(
	ctx: ActionCtx,
	component: AgentComponent,
	/**
	 * The arguments to the streamText function, similar to the ai sdk's
	 * {@link streamText} function, along with Agent prompt options.
	 */
	streamTextArgs: AgentPrompt &
		Omit<
			Parameters<typeof streamTextAi<TOOLS>>[0],
			"model" | "prompt" | "messages"
		> & {
			/**
			 * The tools to use for the tool calls. This will override tools specified
			 * in the Agent constructor or createThread / continueThread.
			 */
			tools?: TOOLS;
		},
	/**
	 * The {@link ContextOptions} and {@link StorageOptions}
	 * options to use for fetching contextual messages and saving input/output messages.
	 */
	options: Options & {
		agentName: string;
		userId?: string | null;
		threadId?: string;
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
		agentForToolCtx?: Agent;
	},
): Promise<
	StreamTextResult<TOOLS, ReturnType<typeof Output.text>> &
		GenerationOutputMetadata
> {
	const { threadId } = options ?? {};
	const { args, userId, order, stepOrder, promptMessageId, ...call } =
		await startGeneration(ctx, component, streamTextArgs, options);

	const steps: StepResult<TOOLS>[] = [];

	const streamer =
		threadId && options.saveStreamDeltas
			? new DeltaStreamer(
					component,
					ctx,
					{
						throttleMs:
							typeof options.saveStreamDeltas === "object"
								? options.saveStreamDeltas.throttleMs
								: undefined,
						onAsyncAbort: call.fail,
						compress: compressUIMessageChunks,
						abortSignal: args.abortSignal,
					},
					{
						threadId,
						userId,
						agentName: options?.agentName,
						model: getModelName(args.model),
						provider: getProviderName(args.model),
						providerOptions: args.providerOptions,
						format: "UIMessageChunk",
						order,
						stepOrder,
					},
				)
			: undefined;

	const result = streamTextAi({
		...args,
		abortSignal: streamer?.abortController.signal ?? args.abortSignal,
		experimental_transform: mergeTransforms(
			options?.saveStreamDeltas,
			streamTextArgs.experimental_transform,
		),
		onError: async (error) => {
			console.error("onError", error);
			await call.fail(errorToString(error.error));
			await streamer?.fail(errorToString(error.error));
			return streamTextArgs.onError?.(error);
		},
		prepareStep: async (options) => {
			const result = await streamTextArgs.prepareStep?.(options);
			if (result) {
				const model = result.model ?? options.model;
				call.updateModel(model);
				// streamer?.updateMetadata({
				//   model: getModelName(model),
				//   provider: getProviderName(model),
				//   providerOptions: options.messages.at(-1)?.providerOptions,
				// });
				return result;
			}
			return undefined;
		},
		onStepFinish: async (step) => {
			steps.push(step);
			const createPendingMessage = await willContinue(steps, args.stopWhen);
			await call.save({ step }, createPendingMessage);
			return args.onStepFinish?.(step);
		},
	}) as StreamTextResult<TOOLS, ReturnType<typeof Output.text>>;
	const stream = streamer?.consumeStream(
		result.toUIMessageStream<AIUIMessage<TOOLS>>(),
	);
	if (
		(typeof options?.saveStreamDeltas === "object" &&
			!options.saveStreamDeltas.returnImmediately) ||
		options?.saveStreamDeltas === true
	) {
		await stream;
		await result.consumeStream();
	}
	const metadata: GenerationOutputMetadata = {
		promptMessageId,
		order,
		savedMessages: call.getSavedMessages(),
		messageId: promptMessageId,
	};
	return Object.assign(result, metadata);
}
