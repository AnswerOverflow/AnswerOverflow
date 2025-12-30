import {
	convertToModelMessages,
	isFileUIPart,
	isReasoningUIPart,
	isTextUIPart,
	type AssistantContent,
	type FileUIPart,
	type ModelMessage,
	type ToolContent,
	type UIMessage as AIUIMessage,
	type DeepPartial,
	type DynamicToolUIPart,
	type ReasoningUIPart,
	type SourceDocumentUIPart,
	type SourceUrlUIPart,
	type StepStartUIPart,
	type TextUIPart,
	type ToolUIPart,
	type UIDataTypes,
	type UITools,
	type UserContent,
} from "ai";
import type { Infer } from "convex/values";
import { toModelMessage, fromModelMessage, toUIFilePart } from "./mapping";
import {
	extractReasoning,
	extractText,
	isTool,
	joinText,
	sorted,
} from "./shared";
import type {
	MessageDoc,
	MessageStatus,
	ProviderOptions,
	SourcePart,
	vSource,
} from "./validators";
import { omit, pick } from "convex-helpers";

function filterDefined<T>(arr: (T | undefined)[]): T[] {
	return arr.filter((x): x is T => x !== undefined);
}

export type UIStatus = "streaming" | MessageStatus;

export type UIMessage<
	METADATA = unknown,
	DATA_PARTS extends UIDataTypes = UIDataTypes,
	TOOLS extends UITools = UITools,
> = AIUIMessage<METADATA, DATA_PARTS, TOOLS> & {
	key: string;
	order: number;
	stepOrder: number;
	status: UIStatus;
	agentName?: string;
	text: string;
	_creationTime: number;
};

type FromUIMessagesMeta<METADATA = unknown> = {
	threadId: string;
	userId?: string;
	model?: string;
	provider?: string;
	providerOptions?: ProviderOptions;
	metadata?: METADATA;
};

type MessageDocWithStreaming<METADATA = unknown> = MessageDoc & {
	streaming: boolean;
	metadata?: METADATA;
};

function createCommonFields<METADATA = unknown>(
	uiMessage: UIMessage<METADATA>,
	meta: FromUIMessagesMeta<METADATA>,
): MessageDocWithStreaming<METADATA> {
	return {
		...pick(meta, [
			"threadId",
			"userId",
			"model",
			"provider",
			"providerOptions",
			"metadata",
		]),
		...omit(uiMessage, ["parts", "role", "key", "text"]),
		status: uiMessage.status === "streaming" ? "pending" : "success",
		streaming: uiMessage.status === "streaming",
		_id: uiMessage.id,
		tool: false,
	} satisfies MessageDocWithStreaming<METADATA>;
}

function extractProviderMetadata<METADATA = unknown>(
	modelMessage: ModelMessage,
	doc: MessageDocWithStreaming<METADATA>,
): void {
	if (!Array.isArray(modelMessage.content)) return;

	for (const c of modelMessage.content) {
		// TODO: Implement tool approval workflow support
		// AI SDK 6.0 introduced tool-approval-request and tool-approval-response
		// content types. These are currently skipped when extracting provider metadata.
		if (
			c.type !== "tool-approval-request" &&
			c.type !== "tool-approval-response" &&
			c.providerOptions
		) {
			doc.providerMetadata = c.providerOptions;
			doc.providerOptions ??= c.providerOptions;
			break;
		}
	}
}

function modelMessageToDoc<METADATA = unknown>(
	modelMessage: ModelMessage,
	uiMessage: UIMessage<METADATA>,
	commonFields: MessageDocWithStreaming<METADATA>,
	index: number,
): MessageDocWithStreaming<METADATA> | undefined {
	if (modelMessage.content.length === 0) return undefined;

	const message = fromModelMessage(modelMessage);
	const tool = isTool(message);
	const doc: MessageDocWithStreaming<METADATA> = {
		...commonFields,
		_id: uiMessage.id + `-${index}`,
		stepOrder: uiMessage.stepOrder + index,
		message,
		tool,
		text: extractText(message),
		reasoning: extractReasoning(message),
		finishReason: tool ? "tool-calls" : "stop",
		sources: fromSourceParts(uiMessage.parts),
	};

	extractProviderMetadata(modelMessage, doc);
	return doc;
}

export async function fromUIMessagesAsync<METADATA = unknown>(
	messages: UIMessage<METADATA>[],
	meta: FromUIMessagesMeta<METADATA>,
): Promise<MessageDocWithStreaming<METADATA>[]> {
	const results: MessageDocWithStreaming<METADATA>[] = [];

	for (const uiMessage of messages) {
		const commonFields = createCommonFields(uiMessage, meta);
		const modelMessages = await convertToModelMessages([uiMessage]);

		for (const [i, modelMessage] of modelMessages.entries()) {
			const doc = modelMessageToDoc(modelMessage, uiMessage, commonFields, i);
			if (doc) results.push(doc);
		}
	}

	return results;
}

export function fromUIMessages<METADATA = unknown>(
	messages: UIMessage<METADATA>[],
	meta: FromUIMessagesMeta<METADATA>,
): MessageDocWithStreaming<METADATA>[] {
	return messages.flatMap((uiMessage) => {
		const commonFields = createCommonFields(uiMessage, meta);
		const modelMessages = convertUIMessageToModelMessagesSync(uiMessage);

		return filterDefined(
			modelMessages.map((modelMessage, i) =>
				modelMessageToDoc(modelMessage, uiMessage, commonFields, i),
			),
		);
	});
}

function convertUIMessageToModelMessagesSync<
	METADATA = unknown,
	DATA_PARTS extends UIDataTypes = UIDataTypes,
	TOOLS extends UITools = UITools,
>(uiMessage: UIMessage<METADATA, DATA_PARTS, TOOLS>): ModelMessage[] {
	const messages: ModelMessage[] = [];
	const parts = uiMessage.parts;

	if (uiMessage.role === "user") {
		const content: UserContent = [];
		for (const part of parts) {
			if (isTextUIPart(part)) {
				content.push({ type: "text", text: part.text });
			} else if (isFileUIPart(part)) {
				content.push({
					type: "file",
					data: part.url,
					mediaType: part.mediaType,
					filename: part.filename,
				});
			}
		}
		if (content.length > 0) {
			messages.push({ role: "user", content });
		}
	} else if (uiMessage.role === "system") {
		const textParts = parts.filter(isTextUIPart);
		if (textParts.length > 0) {
			messages.push({
				role: "system",
				content: textParts.map((p) => p.text).join("\n"),
			});
		}
	} else {
		const assistantContent: AssistantContent = [];
		const toolContent: ToolContent = [];

		for (const part of parts) {
			if (isTextUIPart(part)) {
				assistantContent.push({ type: "text", text: part.text });
			} else if (isReasoningUIPart(part)) {
				assistantContent.push({ type: "reasoning", text: part.text });
			} else if (isFileUIPart(part)) {
				assistantContent.push({
					type: "file",
					data: part.url,
					mediaType: part.mediaType,
					filename: part.filename,
				});
			} else if (
				part.type.startsWith("tool-") &&
				"toolCallId" in part &&
				part.type !== "tool-result"
			) {
				const toolName = part.type.replace("tool-", "");
				const toolPart = part as ToolUIPart<TOOLS>;
				assistantContent.push({
					type: "tool-call",
					toolCallId: toolPart.toolCallId,
					toolName,
					input: toolPart.input ?? null,
					providerExecuted: toolPart.providerExecuted,
				});

				if (
					toolPart.state === "output-available" ||
					toolPart.state === "output-error"
				) {
					toolContent.push({
						type: "tool-result",
						toolCallId: toolPart.toolCallId,
						toolName,
						output: {
							type: "json",
							value: toolPart.output ?? null,
						},
					});
				}
			}
		}

		if (assistantContent.length > 0) {
			messages.push({ role: "assistant", content: assistantContent });
		}
		if (toolContent.length > 0) {
			messages.push({ role: "tool", content: toolContent });
		}
	}

	return messages;
}

function fromSourceParts(parts: UIMessage["parts"]): Infer<typeof vSource>[] {
	return filterDefined(
		parts.map((part) => {
			if (part.type === "source-url") {
				return {
					type: "source",
					sourceType: "url",
					url: part.url,
					id: part.sourceId,
					providerMetadata: part.providerMetadata,
					title: part.title,
				} satisfies Infer<typeof vSource>;
			}
			if (part.type === "source-document") {
				return {
					type: "source",
					sourceType: "document",
					mediaType: part.mediaType,
					id: part.sourceId,
					providerMetadata: part.providerMetadata,
					title: part.title,
				} satisfies Infer<typeof vSource>;
			}
			return undefined;
		}),
	);
}

type ExtraFields<METADATA = unknown> = {
	streaming?: boolean;
	metadata?: METADATA;
};

/**
 * Converts a list of MessageDocs to UIMessages.
 * This is somewhat lossy, as many fields are not supported by UIMessages, e.g.
 * the model, provider, userId, etc.
 * The UIMessage type is the augmented type that includes more fields such as
 * key, order, stepOrder, status, agentName, text, etc.
 */
export function toUIMessages<
	METADATA = unknown,
	DATA_PARTS extends UIDataTypes = UIDataTypes,
	TOOLS extends UITools = UITools,
>(
	messages: (MessageDoc & ExtraFields<METADATA>)[],
): UIMessage<METADATA, DATA_PARTS, TOOLS>[] {
	// Group assistant and tool messages together
	const assistantGroups = groupAssistantMessages(sorted(messages));

	const uiMessages: UIMessage<METADATA, DATA_PARTS, TOOLS>[] = [];
	for (const group of assistantGroups) {
		if (group.role === "system") {
			uiMessages.push(createSystemUIMessage(group.message));
		} else if (group.role === "user") {
			uiMessages.push(createUserUIMessage(group.message));
		} else {
			// Assistant/tool group
			uiMessages.push(createAssistantUIMessage(group.messages));
		}
	}

	return uiMessages;
}

type Group<METADATA = unknown> =
	| {
			role: "user";
			message: MessageDoc & ExtraFields<METADATA>;
	  }
	| {
			role: "system";
			message: MessageDoc & ExtraFields<METADATA>;
	  }
	| {
			role: "assistant";
			messages: (MessageDoc & ExtraFields<METADATA>)[];
	  };

function groupAssistantMessages<METADATA = unknown>(
	messages: (MessageDoc & ExtraFields<METADATA>)[],
): Group<METADATA>[] {
	const groups: Group<METADATA>[] = [];

	let currentAssistantGroup: (MessageDoc & ExtraFields<METADATA>)[] = [];
	let currentOrder: number | undefined;

	for (const message of messages) {
		const coreMessage = message.message && toModelMessage(message.message);
		if (!coreMessage) continue;

		if (coreMessage.role === "user" || coreMessage.role === "system") {
			// Finish any current assistant group
			if (currentAssistantGroup.length > 0) {
				groups.push({
					role: "assistant",
					messages: currentAssistantGroup,
				});
				currentAssistantGroup = [];
				currentOrder = undefined;
			}
			// Add singleton group
			groups.push({
				role: coreMessage.role,
				message,
			});
		} else {
			// Assistant or tool message

			// Start new group if order changes or this is the first assistant/tool message
			if (currentOrder !== undefined && message.order !== currentOrder) {
				if (currentAssistantGroup.length > 0) {
					groups.push({
						role: "assistant",
						messages: currentAssistantGroup,
					});
					currentAssistantGroup = [];
				}
			}

			currentOrder = message.order;
			currentAssistantGroup.push(message);

			// End group if this is an assistant message without tool calls
			if (coreMessage.role === "assistant" && !message.tool) {
				groups.push({
					role: "assistant",
					messages: currentAssistantGroup,
				});
				currentAssistantGroup = [];
				currentOrder = undefined;
			}
		}
	}

	// Add any remaining assistant group
	if (currentAssistantGroup.length > 0) {
		groups.push({
			role: "assistant",
			messages: currentAssistantGroup,
		});
	}

	return groups;
}

function createSystemUIMessage<
	METADATA = unknown,
	DATA_PARTS extends UIDataTypes = UIDataTypes,
	TOOLS extends UITools = UITools,
>(
	message: MessageDoc & ExtraFields<METADATA>,
): UIMessage<METADATA, DATA_PARTS, TOOLS> {
	const text = extractTextFromMessageDoc(message);
	const partCommon = {
		state: message.streaming ? ("streaming" as const) : ("done" as const),
		...(message.providerMetadata
			? { providerMetadata: message.providerMetadata }
			: {}),
	};

	return {
		id: message._id,
		_creationTime: message._creationTime,
		order: message.order,
		stepOrder: message.stepOrder,
		status: message.streaming ? ("streaming" as const) : message.status,
		key: `${message.threadId}-${message.order}-${message.stepOrder}`,
		text,
		role: "system",
		agentName: message.agentName,
		parts: [{ type: "text", text, ...partCommon } satisfies TextUIPart],
		metadata: message.metadata,
	};
}

function extractTextFromMessageDoc(message: MessageDoc): string {
	return (
		(message.message && extractText(message.message)) || message.text || ""
	);
}

function createUserUIMessage<
	METADATA = unknown,
	DATA_PARTS extends UIDataTypes = UIDataTypes,
	TOOLS extends UITools = UITools,
>(
	message: MessageDoc & ExtraFields<METADATA>,
): UIMessage<METADATA, DATA_PARTS, TOOLS> {
	const text = extractTextFromMessageDoc(message);
	const coreMessage = toModelMessage(message.message!);
	const content = coreMessage.content;
	const nonStringContent =
		content && typeof content !== "string" ? content : [];

	const partCommon = {
		state: message.streaming ? ("streaming" as const) : ("done" as const),
		...(message.providerMetadata
			? { providerMetadata: message.providerMetadata }
			: {}),
	};

	const parts: UIMessage<METADATA, DATA_PARTS, TOOLS>["parts"] = [];
	if (text && !nonStringContent.length) {
		parts.push({ type: "text", text });
	}
	for (const contentPart of nonStringContent) {
		switch (contentPart.type) {
			case "text":
				parts.push({ type: "text", text: contentPart.text, ...partCommon });
				break;
			case "file":
			case "image":
				parts.push(toUIFilePart(contentPart));
				break;
			default:
				console.warn("Unknown content part type for user", contentPart);
				break;
		}
	}

	return {
		id: message._id,
		_creationTime: message._creationTime,
		order: message.order,
		stepOrder: message.stepOrder,
		status: message.streaming ? ("streaming" as const) : message.status,
		key: `${message.threadId}-${message.order}-${message.stepOrder}`,
		text,
		role: "user",
		parts,
		metadata: message.metadata,
	};
}

function createAssistantUIMessage<
	METADATA = unknown,
	DATA_PARTS extends UIDataTypes = UIDataTypes,
	TOOLS extends UITools = UITools,
>(
	groupUnordered: (MessageDoc & ExtraFields<METADATA>)[],
): UIMessage<METADATA, DATA_PARTS, TOOLS> {
	const group = sorted(groupUnordered);
	const firstMessage = group[0]!;
	const lastMessage = group[group.length - 1]!;

	const common = {
		id: firstMessage._id,
		_creationTime: firstMessage._creationTime,
		order: firstMessage.order,
		stepOrder: firstMessage.stepOrder,
		key: `${firstMessage.threadId}-${firstMessage.order}-${firstMessage.stepOrder}`,
		agentName: firstMessage.agentName,
	};

	const status = lastMessage.streaming
		? ("streaming" as const)
		: lastMessage.status;

	// Collect all parts from all messages
	const allParts: UIMessage<METADATA, DATA_PARTS, TOOLS>["parts"] = [];

	for (const message of group) {
		const coreMessage = message.message && toModelMessage(message.message);
		if (!coreMessage) continue;

		const content = coreMessage.content;
		const nonStringContent =
			content && typeof content !== "string" ? content : [];
		const text = extractTextFromMessageDoc(message);

		const partCommon = {
			state: message.streaming ? ("streaming" as const) : ("done" as const),
			...(message.providerMetadata
				? { providerMetadata: message.providerMetadata }
				: {}),
		};

		// Add reasoning parts
		if (
			message.reasoning &&
			!nonStringContent.some((c) => c.type === "reasoning")
		) {
			allParts.push({
				type: "reasoning",
				text: message.reasoning,
				...partCommon,
			} satisfies ReasoningUIPart);
		}

		// Add text parts if no structured content
		if (text && !nonStringContent.length) {
			allParts.push({
				type: "text",
				text: text,
				...partCommon,
			} satisfies TextUIPart);
		}

		// Add all structured content parts
		for (const contentPart of nonStringContent) {
			switch (contentPart.type) {
				case "text":
					allParts.push({
						...partCommon,
						...contentPart,
					} satisfies TextUIPart);
					break;
				case "reasoning":
					allParts.push({
						...partCommon,
						...contentPart,
					} satisfies ReasoningUIPart);
					break;
				case "file":
				case "image":
					allParts.push(toUIFilePart(contentPart));
					break;
				case "tool-call": {
					allParts.push({
						type: "step-start",
					} satisfies StepStartUIPart);
					const toolPart: ToolUIPart<TOOLS> = {
						type: `tool-${contentPart.toolName as keyof TOOLS & string}`,
						toolCallId: contentPart.toolCallId,
						input: contentPart.input as DeepPartial<
							TOOLS[keyof TOOLS & string]["input"]
						>,
						providerExecuted: contentPart.providerExecuted,
						...(message.streaming
							? { state: "input-streaming" }
							: {
									state: "input-available",
									callProviderMetadata: message.providerMetadata,
								}),
					};
					allParts.push(toolPart);
					break;
				}
				case "tool-result": {
					const rawOutput = contentPart.output;
					const output =
						rawOutput?.type === "text" || rawOutput?.type === "json"
							? rawOutput.value
							: rawOutput?.type === "execution-denied"
								? rawOutput.reason
								: rawOutput;
					const call = allParts.find(
						(part) =>
							part.type === `tool-${contentPart.toolName}` &&
							"toolCallId" in part &&
							part.toolCallId === contentPart.toolCallId,
					) as ToolUIPart | undefined;
					if (call) {
						if (message.error) {
							call.state = "output-error";
							call.errorText = message.error;
							call.output = output;
						} else {
							call.state = "output-available";
							call.output = output;
						}
					} else {
						console.warn(
							"Tool result without preceding tool call.. adding anyways",
							contentPart,
						);
						if (message.error) {
							allParts.push({
								type: `tool-${contentPart.toolName}`,
								toolCallId: contentPart.toolCallId,
								state: "output-error",
								input: undefined,
								errorText: message.error,
								callProviderMetadata: message.providerMetadata,
							} satisfies ToolUIPart<TOOLS>);
						} else {
							allParts.push({
								type: `tool-${contentPart.toolName}`,
								toolCallId: contentPart.toolCallId,
								state: "output-available",
								input: undefined,
								output,
								callProviderMetadata: message.providerMetadata,
							} satisfies ToolUIPart<TOOLS>);
						}
					}
					break;
				}
				case "tool-approval-request":
				case "tool-approval-response":
					// Tool approval types are handled at a higher level, skip them here
					break;
				default: {
					console.warn("Unknown content part type for assistant", contentPart);
				}
			}
		}

		// Add source parts
		for (const source of message.sources ?? []) {
			allParts.push(toSourcePart(source));
		}
	}

	return {
		...common,
		role: "assistant",
		text: joinText(allParts),
		status,
		parts: allParts,
		metadata: group.find((m) => m.metadata)?.metadata,
	};
}

function toSourcePart(
	part: SourcePart | Infer<typeof vSource>,
): SourceUrlUIPart | SourceDocumentUIPart {
	if (part.sourceType === "url") {
		return {
			type: "source-url",
			url: part.url,
			sourceId: part.id,
			providerMetadata: part.providerMetadata,
			title: part.title,
		} satisfies SourceUrlUIPart;
	}
	return {
		type: "source-document",
		mediaType: part.mediaType,
		sourceId: part.id,
		title: part.title,
		filename: part.filename,
		providerMetadata: part.providerMetadata,
	} satisfies SourceDocumentUIPart;
}

export function combineUIMessages(messages: UIMessage[]): UIMessage[] {
	const combined = messages.reduce((acc, message) => {
		if (!acc.length) {
			return [message];
		}
		const previous = acc.at(-1)!;
		if (
			message.order !== previous.order ||
			previous.role !== message.role ||
			message.role !== "assistant"
		) {
			acc.push(message);
			return acc;
		}
		// We will replace it with a combined message
		acc.pop();
		const newParts = [...previous.parts];
		for (const part of message.parts) {
			const toolCallId = getToolCallId(part);
			if (!toolCallId) {
				newParts.push(part);
				continue;
			}
			const previousPartIndex = newParts.findIndex(
				(p) => getToolCallId(p) === toolCallId,
			);
			const previousPart = newParts.splice(previousPartIndex, 1)[0];
			if (!previousPart) {
				newParts.push(part);
				continue;
			}
			newParts.push(mergeParts(previousPart, part));
		}
		acc.push({
			...previous,
			...pick(message, ["status", "metadata", "agentName"]),
			parts: newParts,
			text: joinText(newParts),
		});
		return acc;
	}, [] as UIMessage[]);
	return combined;
}

function getToolCallId(
	part: UIMessage["parts"][number] & { toolCallId?: string },
) {
	return part.toolCallId;
}

function mergeParts(
	previousPart: UIMessage["parts"][number],
	part: UIMessage["parts"][number],
): UIMessage["parts"][number] {
	const merged: Record<string, unknown> = { ...previousPart };
	for (const [key, value] of Object.entries(part)) {
		if (value !== undefined) {
			merged[key] = value;
		}
	}
	return merged as ToolUIPart | DynamicToolUIPart;
}
