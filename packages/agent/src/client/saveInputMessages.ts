import { type ModelMessage } from "ai";
import type { MessageDoc } from "../validators";
import { embedMessages, getPromptArray } from "./search";
import type {
	ActionCtx,
	AgentComponent,
	Config,
	MutationCtx,
} from "./types";
import { saveMessages } from "./messages";
import type { Message } from "../validators";
import { assert } from "convex-helpers";
import type { VectorDimension } from "../component/vector/tables";

export async function saveInputMessages(
	ctx: MutationCtx | ActionCtx,
	component: AgentComponent,
	{
		threadId,
		userId,
		prompt,
		messages,
		...args
	}: {
		prompt: string | (ModelMessage | Message)[] | undefined;
		messages: (ModelMessage | Message)[] | undefined;
		promptMessageId: string | undefined;
		userId: string | undefined;
		threadId: string;
		agentName?: string;
		storageOptions?: {
			saveMessages?: "all" | "promptAndOutput";
		};
	} & Pick<Config, "usageHandler" | "textEmbeddingModel" | "callSettings">,
): Promise<{
	promptMessageId: string | undefined;
	pendingMessage: MessageDoc;
	savedMessages: MessageDoc[];
}> {
	const shouldSave = args.storageOptions?.saveMessages ?? "promptAndOutput";
	// If only a promptMessageId is provided, this will be empty.
	const promptArray = getPromptArray(prompt);

	const toSave: (ModelMessage | Message)[] = [];
	if (args.promptMessageId) {
		// We don't save any inputs if a promptMessageId is provided.
		// It's unclear where they'd want to save the new messages.
	} else if (shouldSave === "all") {
		if (messages) toSave.push(...messages);
		toSave.push(...promptArray);
	} else {
		if (promptArray.length) {
			// We treat the whole promptArray as the prompt message to save.
			toSave.push(...promptArray);
		} else if (messages) {
			// Otherwise, treat the last message as the prompt message to save.
			toSave.push(...messages.slice(-1));
		}
	}
	let embeddings:
		| {
				vectors: (number[] | null)[];
				dimension: VectorDimension;
				model: string;
		  }
		| undefined;
	if (args.textEmbeddingModel && toSave.length) {
		assert(
			"runAction" in ctx,
			"You must be in an action context to generate embeddings",
		);
		embeddings = await embedMessages(
			ctx,
			{ ...args, userId: userId ?? undefined, threadId },
			toSave,
		);
		if (embeddings) {
			// for the pending message
			embeddings.vectors.push(null);
		}
	}
	const saved = await saveMessages(ctx, component, {
		threadId,
		userId,
		messages: [...toSave, { role: "assistant", content: [] }],
		metadata: [
			...Array.from({ length: toSave.length }, () => ({})),
			{ status: "pending" },
		],
		failPendingSteps: !!args.promptMessageId,
		promptMessageId: args.promptMessageId,
		embeddings,
	});
	return {
		promptMessageId: toSave.length
			? saved.messages.at(-2)!._id
			: args.promptMessageId,
		pendingMessage: saved.messages.at(-1)!,
		savedMessages: saved.messages.slice(0, -1),
	};
}
