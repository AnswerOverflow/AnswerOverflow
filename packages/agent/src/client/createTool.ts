import type { FlexibleSchema } from "@ai-sdk/provider-utils";
import type { Tool, ToolExecutionOptions, ToolSet } from "ai";
import { tool } from "ai";
import type { Agent } from "./index";
import type { GenericActionCtx, GenericDataModel } from "convex/server";
import type { ProviderOptions } from "../validators";

export type ToolCtx<DataModel extends GenericDataModel = GenericDataModel> =
	GenericActionCtx<DataModel> & {
		agent?: Agent;
		userId?: string;
		threadId?: string;
		messageId?: string;
	};

/**
 * This is a wrapper around the ai.tool function that adds extra context to the
 * tool call, including the action context, userId, threadId, and messageId.
 * @param tool The tool. See https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling
 * but swap parameters for args and handler for execute.
 * @returns A tool to be used with the AI SDK.
 */
export function createTool<INPUT, OUTPUT, Ctx extends ToolCtx = ToolCtx>(def: {
	/**
  An optional description of what the tool does.
  Will be used by the language model to decide whether to use the tool.
  Not used for provider-defined tools.
     */
	description?: string;
	/**
  The schema of the input that the tool expects. The language model will use this to generate the input.
  It is also used to validate the output of the language model.
  Use descriptions to make the input understandable for the language model.
     */
	args: FlexibleSchema<INPUT>;
	/**
  An async function that is called with the arguments from the tool call and produces a result.
  If not provided, the tool will not be executed automatically.

  @args is the input of the tool call.
  @options.abortSignal is a signal that can be used to abort the tool call.
     */
	handler: (
		ctx: Ctx,
		args: INPUT,
		options: ToolExecutionOptions,
	) => PromiseLike<OUTPUT> | AsyncIterable<OUTPUT>;
	/**
	 * Provide the context to use, e.g. when defining the tool at runtime.
	 */
	ctx?: Ctx;
	/**
	 * Optional function that is called when the argument streaming starts.
	 * Only called when the tool is used in a streaming context.
	 */
	onInputStart?: (
		ctx: Ctx,
		options: ToolExecutionOptions,
	) => void | PromiseLike<void>;
	/**
	 * Optional function that is called when an argument streaming delta is available.
	 * Only called when the tool is used in a streaming context.
	 */
	onInputDelta?: (
		ctx: Ctx,
		options: { inputTextDelta: string } & ToolExecutionOptions,
	) => void | PromiseLike<void>;
	/**
	 * Optional function that is called when a tool call can be started,
	 * even if the execute function is not provided.
	 */
	onInputAvailable?: (
		ctx: Ctx,
		options: {
			input: [INPUT] extends [never] ? unknown : INPUT;
		} & ToolExecutionOptions,
	) => void | PromiseLike<void>;

	// Extra AI SDK pass-through options.
	providerOptions?: ProviderOptions;
}): Tool<INPUT, OUTPUT> {
	const t = tool({
		type: "function",
		__acceptsCtx: true,
		ctx: def.ctx,
		description: def.description,
		inputSchema: def.args,
		execute(args: INPUT, options: ToolExecutionOptions) {
			if (!getCtx(this)) {
				throw new Error(
					"To use a Convex tool, you must either provide the ctx" +
						" at definition time (dynamically in an action), or use the Agent to" +
						" call it (which injects the ctx, userId and threadId)",
				);
			}
			return def.handler(getCtx(this), args, options);
		},
		providerOptions: def.providerOptions,
	});
	if (def.onInputStart) {
		t.onInputStart = def.onInputStart.bind(t, getCtx(t));
	}
	if (def.onInputDelta) {
		t.onInputDelta = def.onInputDelta.bind(t, getCtx(t));
	}
	if (def.onInputAvailable) {
		t.onInputAvailable = def.onInputAvailable.bind(t, getCtx(t));
	}
	return t;
}

function getCtx<Ctx extends ToolCtx>(tool: any): Ctx {
	return (tool as { ctx: Ctx }).ctx;
}

export function wrapTools(
	ctx: ToolCtx,
	...toolSets: (ToolSet | undefined)[]
): ToolSet {
	const output = {} as ToolSet;
	for (const toolSet of toolSets) {
		if (!toolSet) {
			continue;
		}
		for (const [name, tool] of Object.entries(toolSet)) {
			if (tool && !(tool as any).__acceptsCtx) {
				output[name] = tool;
			} else {
				const out = { ...tool, ctx };
				output[name] = out;
			}
		}
	}
	return output;
}
