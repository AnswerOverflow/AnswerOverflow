import {
	readUIMessageStream,
	type DynamicToolUIPart,
	type ProviderMetadata,
	type ReasoningUIPart,
	type TextStreamPart,
	type TextUIPart,
	type ToolSet,
	type ToolUIPart,
	type UIMessageChunk,
} from "ai";
import { assert, pick } from "convex-helpers";
import { type UIMessage } from "./UIMessages";
import { joinText, sorted } from "./shared";
import {
	type MessageStatus,
	type StreamDelta,
	type StreamMessage,
} from "./validators";
import { getErrorMessage } from "@ai-sdk/provider-utils";

export function blankUIMessage<METADATA = unknown>(
	streamMessage: StreamMessage & { metadata?: METADATA },
	threadId: string,
): UIMessage<METADATA> {
	return {
		id: `stream:${streamMessage.streamId}`,
		key: `${threadId}-${streamMessage.order}-${streamMessage.stepOrder}`,
		order: streamMessage.order,
		stepOrder: streamMessage.stepOrder,
		status: statusFromStreamStatus(streamMessage.status),
		agentName: streamMessage.agentName,
		text: "",
		_creationTime: Date.now(),
		role: "assistant",
		parts: [],
		...(streamMessage.metadata ? { metadata: streamMessage.metadata } : {}),
	};
}

export function statusFromStreamStatus(
	status: StreamMessage["status"],
): MessageStatus | "streaming" {
	switch (status) {
		case "streaming":
			return "streaming";
		case "finished":
			return "success";
		case "aborted":
			return "failed";
		default:
			return "pending";
	}
}

export async function updateFromUIMessageChunks(
	uiMessage: UIMessage,
	parts: UIMessageChunk[],
) {
	const partsStream = new ReadableStream<UIMessageChunk>({
		start(controller) {
			for (const part of parts) {
				controller.enqueue(part);
			}
			controller.close();
		},
	});
	let failed = false;
	const messageStream = readUIMessageStream({
		message: uiMessage,
		stream: partsStream,
		onError: (e) => {
			failed = true;
			console.error("Error in stream", e);
		},
		terminateOnError: true,
	});
	let message = uiMessage;
	for await (const messagePart of messageStream) {
		assert(
			messagePart.id === message.id,
			`Expecting to only make one UIMessage in a stream`,
		);
		message = messagePart;
	}
	if (failed) {
		message.status = "failed";
	}
	message.text = joinText(message.parts);
	return message;
}

export async function deriveUIMessagesFromDeltas(
	threadId: string,
	streamMessages: StreamMessage[],
	allDeltas: StreamDelta[],
): Promise<UIMessage[]> {
	const messages: UIMessage[] = [];
	for (const streamMessage of streamMessages) {
		if (streamMessage.format === "UIMessageChunk") {
			const { parts } = getParts<UIMessageChunk>(
				allDeltas.filter((d) => d.streamId === streamMessage.streamId),
				0,
			);
			const uiMessage = await updateFromUIMessageChunks(
				blankUIMessage(streamMessage, threadId),
				parts,
			);
			// TODO: this fails on partial tool calls
			messages.push(uiMessage);
		} else {
			const [uiMessages] = deriveUIMessagesFromTextStreamParts(
				threadId,
				[streamMessage],
				[],
				allDeltas,
			);
			messages.push(...uiMessages);
		}
	}
	return sorted(messages);
}

/**
 *
 */

export function deriveUIMessagesFromTextStreamParts(
	threadId: string,
	streamMessages: StreamMessage[],
	existingStreams: Array<{
		streamId: string;
		cursor: number;
		message: UIMessage;
	}>,
	allDeltas: StreamDelta[],
): [
	UIMessage[],
	Array<{ streamId: string; cursor: number; message: UIMessage }>,
	boolean,
] {
	const newStreams: Array<{
		streamId: string;
		cursor: number;
		message: UIMessage;
	}> = [];
	// Seed the existing chunks
	let changed = false;
	for (const streamMessage of streamMessages) {
		const deltas = allDeltas.filter(
			(d) => d.streamId === streamMessage.streamId,
		);
		const existing = existingStreams.find(
			(s) => s.streamId === streamMessage.streamId,
		);
		const [newStream, messageChanged] = updateFromTextStreamParts(
			threadId,
			streamMessage,
			existing,
			deltas,
		);
		newStreams.push(newStream);
		if (messageChanged) changed = true;
	}
	for (const { streamId } of existingStreams) {
		if (!newStreams.find((s) => s.streamId === streamId)) {
			// There's a stream that's no longer active.
			changed = true;
		}
	}
	const messages = sorted(newStreams.map((s) => s.message));
	return [messages, newStreams, changed];
}

export function getParts<T extends StreamDelta["parts"][number]>(
	deltas: StreamDelta[],
	fromCursor?: number,
): { parts: T[]; cursor: number } {
	const parts: T[] = [];
	let cursor = fromCursor ?? 0;
	for (const delta of deltas.sort((a, b) => a.start - b.start)) {
		if (delta.parts.length === 0) {
			console.debug(`Got delta with no parts: ${JSON.stringify(delta)}`);
			continue;
		}
		if (cursor !== delta.start) {
			if (cursor >= delta.end) {
				continue;
			} else if (cursor < delta.start) {
				console.warn(
					`Got delta for stream ${delta.streamId} that has a gap ${cursor} -> ${delta.start}`,
				);
				break;
			} else {
				throw new Error(
					`Got unexpected delta for stream ${delta.streamId}: delta: ${delta.start} -> ${delta.end} existing cursor: ${cursor}`,
				);
			}
		}
		parts.push(...delta.parts);
		cursor = delta.end;
	}
	return { parts, cursor };
}

/**
 * This is historically from when we would use the onChunk callback instead of
 * consuming the full UIMessageStream.
 */

// exported for testing
export function updateFromTextStreamParts(
	threadId: string,
	streamMessage: StreamMessage,
	existing:
		| { streamId: string; cursor: number; message: UIMessage }
		| undefined,
	deltas: StreamDelta[],
): [{ streamId: string; cursor: number; message: UIMessage }, boolean] {
	const { cursor, parts } = getParts<TextStreamPart<ToolSet>>(
		deltas,
		existing?.cursor,
	);
	const changed =
		parts.length > 0 ||
		(existing &&
			statusFromStreamStatus(streamMessage.status) !== existing.message.status);
	const existingMessage =
		existing?.message ?? blankUIMessage(streamMessage, threadId);
	if (!changed) {
		return [
			existing ?? {
				streamId: streamMessage.streamId,
				cursor,
				message: existingMessage,
			},
			false,
		];
	}

	const message: UIMessage = structuredClone(existingMessage);
	message.status = statusFromStreamStatus(streamMessage.status);

	const textPartsById = new Map<string, TextUIPart>();
	const toolPartsById = new Map<string, ToolUIPart | DynamicToolUIPart>(
		message.parts
			.filter(
				(p): p is ToolUIPart | DynamicToolUIPart =>
					p.type.startsWith("tool-") || p.type === "dynamic-tool",
			)
			.map((p) => [p.toolCallId, p]),
	);
	const reasoningPartsById = new Map<string, ReasoningUIPart>();

	for (const part of parts) {
		switch (part.type) {
			case "text-start":
			case "text-delta": {
				if (!textPartsById.has(part.id)) {
					const lastPart = message.parts.at(-1);
					if (lastPart?.type === "text") {
						textPartsById.set(part.id, lastPart);
					} else {
						const newPart = {
							type: "text",
							text: "",
							providerMetadata: part.providerMetadata,
						} satisfies TextUIPart;
						textPartsById.set(part.id, newPart);
						message.parts.push(newPart);
					}
				}
				if (part.type === "text-delta") {
					const textPart = textPartsById.get(part.id)!;
					textPart.text += part.text;
					textPart.providerMetadata = mergeProviderMetadata(
						textPart.providerMetadata,
						part.providerMetadata,
					);
				}
				break;
			}
			case "tool-input-start": {
				let newPart: ToolUIPart | DynamicToolUIPart;
				if (part.dynamic) {
					newPart = {
						type: "dynamic-tool",
						toolCallId: part.id,
						toolName: part.toolName,
						state: "input-streaming",
						input: "",
					} satisfies DynamicToolUIPart;
				} else {
					newPart = {
						type: `tool-${part.toolName}`,
						toolCallId: part.id,
						state: "input-streaming",
						input: "",
						providerExecuted: part.providerExecuted,
					} satisfies ToolUIPart;
				}
				toolPartsById.set(part.id, newPart);
				message.parts.push(newPart);
				break;
			}
			case "tool-input-delta":
				{
					const toUpdate = toolPartsById.get(part.id);
					assert(
						toUpdate,
						`Expected to find tool call part ${part.id} to update`,
					);
					toUpdate.input = (toUpdate.input ?? "") + part.delta;
				}
				break;
			case "tool-input-end":
				{
					const toUpdate = toolPartsById.get(part.id);
					assert(
						toUpdate,
						`Expected to find tool call part ${part.id} to update`,
					);
					toUpdate.state = "input-available";
					if (part.providerMetadata) {
						const updatable = toUpdate as Extract<
							ToolUIPart | DynamicToolUIPart,
							{ state: "input-available" }
						>;
						updatable.callProviderMetadata = mergeProviderMetadata(
							updatable.callProviderMetadata,
							part.providerMetadata,
						);
					}
				}
				break;
			case "tool-call": {
				let newPart: ToolUIPart | DynamicToolUIPart;
				if (part.dynamic) {
					newPart = {
						type: "dynamic-tool",
						toolCallId: part.toolCallId,
						toolName: part.toolName,
						input: part.input,
						state: "input-available",
					};
				} else {
					newPart = {
						type: `tool-${part.toolName}`,
						toolCallId: part.toolCallId,
						input: part.input,
						state: "input-available",
					};
					if (part.providerExecuted) {
						newPart.providerExecuted = part.providerExecuted;
					}
				}
				if (part.providerMetadata) {
					newPart.callProviderMetadata = part.providerMetadata;
				}
				if (toolPartsById.has(part.toolCallId)) {
					const toUpdate = toolPartsById.get(part.toolCallId)!;
					Object.assign(toUpdate, newPart);
				} else {
					toolPartsById.set(part.toolCallId, newPart);
					message.parts.push(newPart);
				}
				break;
			}
			case "tool-result": {
				const toolCall = toolPartsById.get(part.toolCallId);
				assert(
					toolCall,
					`Expected to find tool call part ${part.toolCallId} to update with result`,
				);
				let newPart: ToolUIPart | DynamicToolUIPart;
				if (toolCall.type === "dynamic-tool") {
					newPart = {
						...toolCall,
						state: "output-available",
						input: part.input ?? toolCall.input,
						output: part.output ?? toolCall.output,
						...pick(part, ["preliminary"]),
					} as DynamicToolUIPart;
				} else {
					newPart = {
						...toolCall,
						state: "output-available",
						input: part.input ?? toolCall.input,
						output: part.output ?? toolCall.output,
						preliminary: part.preliminary,
					} as ToolUIPart;
				}
				Object.assign(toolCall, newPart);
				break;
			}
			case "reasoning-start":
			case "reasoning-delta": {
				if (!reasoningPartsById.has(part.id)) {
					const lastPart = message.parts.at(-1);
					if (lastPart?.type === "reasoning") {
						reasoningPartsById.set(part.id, lastPart);
					} else {
						const newPart = {
							type: "reasoning",
							state: "streaming",
							text: "",
							providerMetadata: part.providerMetadata,
						} satisfies ReasoningUIPart;
						reasoningPartsById.set(part.id, newPart);
						message.parts.push(newPart);
					}
				}
				const reasoningPart = reasoningPartsById.get(part.id)!;
				if (part.type === "reasoning-delta") {
					reasoningPart.text += part.text;
					reasoningPart.providerMetadata = mergeProviderMetadata(
						reasoningPart.providerMetadata,
						part.providerMetadata,
					);
				}
				break;
			}
			case "reasoning-end": {
				const reasoningPart =
					reasoningPartsById.get(part.id) ??
					message.parts.find(
						(p): p is ReasoningUIPart =>
							p.type === "reasoning" && p.state === "streaming",
					)!;
				if (reasoningPart) {
					reasoningPart.state = "done";
				} else {
					console.warn(
						`Expected to find reasoning part ${part.id} to finish, but found none`,
					);
				}
				break;
			}
			case "source":
				if (part.sourceType === "url") {
					message.parts.push({
						type: "source-url",
						url: part.url,
						sourceId: part.id,
						providerMetadata: part.providerMetadata,
						title: part.title,
					});
				} else if (part.sourceType === "document") {
					message.parts.push({
						type: "source-document",
						mediaType: part.mediaType,
						sourceId: part.id,
						title: part.title,
						filename: part.filename,
						providerMetadata: part.providerMetadata,
					});
				} else {
					console.warn("Got source part with unknown source type", part);
				}
				break;
			case "abort":
				message.status = "failed";
				break;
			case "error":
				message.status = "failed";
				console.warn("Generation failed with error", part.error);
				break;
			case "tool-error": {
				const toolPart = toolPartsById.get(part.toolCallId);
				if (toolPart) {
					toolPart.errorText = getErrorMessage(part.error);
				}
				break;
			}
			case "file":
			case "text-end":
			case "finish-step":
			case "finish":
			case "raw":
			case "start-step":
			case "start":
				// ignore these types
				break;
			default: {
				const partType = (part as { type: string }).type;
				// TODO: Implement tool approval workflow support
				// AI SDK 6.0 introduced these content types for human-in-the-loop
				// approval of tool calls. Currently ignored in streaming.
				// See: https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling#tool-approval
				if (
					partType === "tool-approval-request" ||
					partType === "tool-approval-response" ||
					partType === "tool-output-denied"
				) {
					break;
				}
				console.warn(`Received unexpected part: ${JSON.stringify(part)}`);
				break;
			}
		}
	}
	// Consider reasoning done once something else happens
	for (const part of message.parts.slice(0, -1)) {
		if (part.type === "reasoning") {
			part.state = "done";
		}
	}
	message.text = joinText(message.parts);
	return [
		{
			streamId: streamMessage.streamId,
			cursor,
			message,
		},
		true,
	];
}

function mergeProviderMetadata(
	existing: ProviderMetadata | undefined,
	part: ProviderMetadata | undefined,
): ProviderMetadata | undefined {
	if (!existing && !part) {
		return undefined;
	}
	if (!existing) {
		return part;
	}
	if (!part) {
		return existing;
	}
	const merged: ProviderMetadata = existing;
	for (const [provider, metadata] of Object.entries(part)) {
		merged[provider] = {
			...merged[provider],
			...metadata,
		};
	}
	return merged;
}
