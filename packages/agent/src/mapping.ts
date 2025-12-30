import {
	type UIMessage as AIMessage,
	type AssistantContent,
	type ModelMessage,
	type DataContent,
	type FilePart,
	type GenerateObjectResult,
	type ImagePart,
	type StepResult,
	type ToolContent,
	type ToolSet,
	type UserContent,
	type FileUIPart,
	type LanguageModelUsage,
	type Warning,
	type TextPart,
	type ToolCallPart,
	type ToolResultPart,
	type ProviderMetadata,
	type JSONValue,
} from "ai";
import {
	vMessageWithMetadata,
	type vSourcePart,
	type Message,
	type MessageWithMetadata,
	type Usage,
	type vContent,
	type vFilePart,
	type vImagePart,
	type vReasoningPart,
	type vRedactedReasoningPart,
	type vTextPart,
	type vToolCallPart,
	type vToolResultPart,
	type SourcePart,
	vToolResultOutput,
	type MessageDoc,
} from "./validators";
import type { ActionCtx, AgentComponent } from "./client/types";
import type { MutationCtx } from "./client/types";
import { MAX_FILE_SIZE, storeFile } from "./client/files";
import type { Infer } from "convex/values";
import {
	convertUint8ArrayToBase64,
	type ProviderOptions,
	type ReasoningPart,
} from "@ai-sdk/provider-utils";
import { parse, validate } from "convex-helpers/validators";
import {
	getModelName,
	getProviderName,
	type ModelOrMetadata,
} from "./shared";
export type AIMessageWithoutId = Omit<AIMessage, "id">;

export type SerializeUrlsAndUint8Arrays<T> = T extends URL
	? string
	: T extends Uint8Array | ArrayBufferLike
		? ArrayBuffer
		: T extends Array<infer Inner>
			? Array<SerializeUrlsAndUint8Arrays<Inner>>
			: T extends Record<string, any>
				? { [K in keyof T]: SerializeUrlsAndUint8Arrays<T[K]> }
				: T;

export type Content = UserContent | AssistantContent | ToolContent;
export type SerializedContent = Message["content"];

export type SerializedMessage = Message;

export async function serializeMessage(
	ctx: ActionCtx | MutationCtx,
	component: AgentComponent,
	message: ModelMessage | Message,
): Promise<{ message: SerializedMessage; fileIds?: string[] }> {
	const { content, fileIds } = await serializeContent(
		ctx,
		component,
		message.content,
	);
	return {
		message: {
			role: message.role,
			content,
			...(message.providerOptions
				? { providerOptions: message.providerOptions }
				: {}),
		} as SerializedMessage,
		fileIds,
	};
}

// Similar to serializeMessage, but doesn't save any files and is looser
// For use on the frontend / in synchronous environments.
export function fromModelMessage(message: ModelMessage): Message {
	const content = fromModelMessageContent(message.content);
	return {
		role: message.role,
		content,
		...(message.providerOptions
			? { providerOptions: message.providerOptions }
			: {}),
	} as SerializedMessage;
}

export async function serializeOrThrow(
	message: ModelMessage | Message,
): Promise<SerializedMessage> {
	const { content } = await serializeContent(
		{} as any,
		{} as any,
		message.content,
	);
	return {
		role: message.role,
		content,
		...(message.providerOptions
			? { providerOptions: message.providerOptions }
			: {}),
	} as SerializedMessage;
}

export function toModelMessage(
	message: SerializedMessage | ModelMessage,
): ModelMessage {
	return {
		...message,
		content: toModelMessageContent(message.content),
	} as ModelMessage;
}

export function docsToModelMessages(messages: MessageDoc[]): ModelMessage[] {
	return messages
		.map((m) => m.message)
		.filter((m) => !!m)
		.filter((m) => !!m.content.length)
		.map(toModelMessage);
}

export function serializeUsage(usage: LanguageModelUsage): Usage {
	return {
		promptTokens: usage.inputTokens ?? 0,
		completionTokens: usage.outputTokens ?? 0,
		totalTokens: usage.totalTokens ?? 0,
		reasoningTokens: usage.reasoningTokens,
		cachedInputTokens: usage.cachedInputTokens,
	};
}

export function toModelMessageUsage(usage: Usage): LanguageModelUsage {
	return {
		inputTokens: usage.promptTokens,
		outputTokens: usage.completionTokens,
		totalTokens: usage.totalTokens,
		inputTokenDetails: {
			noCacheTokens: undefined,
			cacheReadTokens: usage.cachedInputTokens,
			cacheWriteTokens: undefined,
		},
		outputTokenDetails: {
			textTokens: undefined,
			reasoningTokens: usage.reasoningTokens,
		},
	};
}

export function serializeWarnings(
	warnings: Warning[] | undefined,
): MessageWithMetadata["warnings"] {
	if (!warnings) {
		return undefined;
	}
	return warnings.map((warning) => {
		switch (warning.type) {
			case "compatibility":
				return {
					type: "unsupported-setting" as const,
					setting: warning.feature,
					details: warning.details,
				};
			case "unsupported":
				return {
					type: "unsupported-tool" as const,
					tool: warning.feature,
					details: warning.details,
				};
			case "other":
				return warning;
		}
	});
}

export function toModelMessageWarnings(
	warnings: MessageWithMetadata["warnings"],
): Warning[] | undefined {
	if (!warnings) {
		return undefined;
	}
	return warnings.map((warning) => {
		switch (warning.type) {
			case "unsupported-setting":
				return {
					type: "compatibility" as const,
					feature: warning.setting,
					details: warning.details,
				};
			case "unsupported-tool":
				return {
					type: "unsupported" as const,
					feature: warning.tool,
					details: warning.details,
				};
			case "other":
				return warning;
		}
	});
}

export async function serializeNewMessagesInStep<TOOLS extends ToolSet>(
	ctx: ActionCtx,
	component: AgentComponent,
	step: StepResult<TOOLS>,
	model: ModelOrMetadata | undefined,
): Promise<{ messages: MessageWithMetadata[] }> {
	// If there are tool results, there's another message with the tool results
	// ref: https://github.com/vercel/ai/blob/main/packages/ai/src/generate-text/to-response-messages.ts#L120
	const hasToolMessage = step.response.messages.at(-1)?.role === "tool";
	const assistantFields = {
		model: model ? getModelName(model) : undefined,
		provider: model ? getProviderName(model) : undefined,
		providerMetadata: step.providerMetadata,
		reasoning: step.reasoningText,
		reasoningDetails: step.reasoning,
		usage: serializeUsage(step.usage),
		warnings: serializeWarnings(step.warnings),
		finishReason: step.finishReason,
		// Only store the sources on one message
		sources: hasToolMessage ? undefined : step.sources,
	} satisfies Omit<MessageWithMetadata, "message" | "text" | "fileIds">;
	const toolFields = { sources: step.sources };
	const messages: MessageWithMetadata[] = await Promise.all(
		(hasToolMessage
			? step.response.messages.slice(-2)
			: step.content.length
				? step.response.messages.slice(-1)
				: [{ role: "assistant" as const, content: [] }]
		).map(async (msg): Promise<MessageWithMetadata> => {
			const { message, fileIds } = await serializeMessage(ctx, component, msg);
			return parse(vMessageWithMetadata, {
				message,
				...(message.role === "tool" ? toolFields : assistantFields),
				text: step.text,
				fileIds,
			});
		}),
	);
	// TODO: capture step.files separately?
	return { messages };
}

export async function serializeObjectResult(
	ctx: ActionCtx,
	component: AgentComponent,
	result: GenerateObjectResult<unknown>,
	model: ModelOrMetadata | undefined,
): Promise<{ messages: MessageWithMetadata[] }> {
	const text = JSON.stringify(result.object);

	const { message, fileIds } = await serializeMessage(ctx, component, {
		role: "assistant" as const,
		content: text,
	});
	return {
		messages: [
			{
				message,
				model: model ? getModelName(model) : undefined,
				provider: model ? getProviderName(model) : undefined,
				providerMetadata: result.providerMetadata,
				finishReason: result.finishReason,
				text,
				usage: serializeUsage(result.usage),
				warnings: serializeWarnings(result.warnings),
				fileIds,
			},
		],
	};
}

function getMimeOrMediaType(part: { mediaType?: string; mimeType?: string }) {
	if ("mediaType" in part) {
		return part.mediaType;
	}
	if ("mimeType" in part) {
		return part.mimeType;
	}
	return undefined;
}

export async function serializeContent(
	ctx: ActionCtx | MutationCtx,
	component: AgentComponent,
	content: Content | Message["content"],
): Promise<{ content: SerializedContent; fileIds?: string[] }> {
	if (typeof content === "string") {
		return { content };
	}
	const fileIds: string[] = [];
	const serialized = await Promise.all(
		content.map(async (part) => {
			const metadata: {
				providerOptions?: ProviderOptions;
				providerMetadata?: ProviderMetadata;
			} = {};
			if ("providerOptions" in part) {
				metadata.providerOptions = part.providerOptions as ProviderOptions;
			}
			if ("providerMetadata" in part) {
				metadata.providerMetadata = part.providerMetadata as ProviderMetadata;
			}
			switch (part.type) {
				case "text": {
					return {
						type: part.type,
						text: part.text,
						...metadata,
					} satisfies Infer<typeof vTextPart>;
				}
				case "image": {
					let image = serializeDataOrUrl(part.image);
					if (
						image instanceof ArrayBuffer &&
						image.byteLength > MAX_FILE_SIZE
					) {
						const { file } = await storeFile(
							ctx,
							component,
							new Blob([image], {
								type: getMimeOrMediaType(part) || guessMimeType(image),
							}),
						);
						image = file.url;
						fileIds.push(file.fileId);
					}
					return {
						type: part.type,
						mimeType: getMimeOrMediaType(part),
						...metadata,
						image,
					} satisfies Infer<typeof vImagePart>;
				}
				case "file": {
					let data = serializeDataOrUrl(part.data);
					if (data instanceof ArrayBuffer && data.byteLength > MAX_FILE_SIZE) {
						const { file } = await storeFile(
							ctx,
							component,
							new Blob([data], { type: getMimeOrMediaType(part) }),
						);
						data = file.url;
						fileIds.push(file.fileId);
					}
					return {
						type: part.type,
						data,
						filename: part.filename,
						mimeType: getMimeOrMediaType(part)!,
						...metadata,
					} satisfies Infer<typeof vFilePart>;
				}
				case "tool-call": {
					const args = "input" in part ? part.input : part.args;
					return {
						type: part.type,
						args: args ?? null,
						toolCallId: part.toolCallId,
						toolName: part.toolName,
						providerExecuted: part.providerExecuted,
						...metadata,
					} satisfies Infer<typeof vToolCallPart>;
				}
				case "tool-result": {
					return normalizeToolResult(part, metadata);
				}
				case "reasoning": {
					return {
						type: part.type,
						text: part.text,
						...metadata,
					} satisfies Infer<typeof vReasoningPart>;
				}
				// Not in current generation output, but could be in historical messages
				case "redacted-reasoning": {
					return {
						type: part.type,
						data: part.data,
						...metadata,
					} satisfies Infer<typeof vRedactedReasoningPart>;
				}
				case "source": {
					return part satisfies Infer<typeof vSourcePart>;
				}
				// TODO: Implement tool approval workflow support
				// AI SDK 6.0 introduced tool-approval-request and tool-approval-response
				// content types for human-in-the-loop approval of tool calls. These are
				// currently filtered out since we don't have UI/UX for approval workflows.
				// To implement: store approval state, expose in UI, handle user responses.
				// See: https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling#tool-approval
				case "tool-approval-request":
				case "tool-approval-response":
					return null;
				default:
					return part satisfies Infer<typeof vContent>;
			}
		}),
	);
	const filtered = serialized.filter(
		(part): part is NonNullable<typeof part> => part !== null,
	);
	return {
		content: filtered as SerializedContent,
		fileIds: fileIds.length > 0 ? fileIds : undefined,
	};
}

export function fromModelMessageContent(content: Content): Message["content"] {
	if (typeof content === "string") {
		return content;
	}
	return content
		.map((part) => {
			const metadata: {
				providerOptions?: ProviderOptions;
				providerMetadata?: ProviderMetadata;
			} = {};
			if ("providerOptions" in part) {
				metadata.providerOptions = part.providerOptions as ProviderOptions;
			}
			if ("providerMetadata" in part) {
				metadata.providerMetadata = part.providerMetadata as ProviderMetadata;
			}
			switch (part.type) {
				case "text":
					return part satisfies Infer<typeof vTextPart>;
				case "image":
					return {
						type: part.type,
						mimeType: getMimeOrMediaType(part),
						...metadata,
						image: serializeDataOrUrl(part.image),
					} satisfies Infer<typeof vImagePart>;
				case "file":
					return {
						type: part.type,
						data: serializeDataOrUrl(part.data),
						filename: part.filename,
						mimeType: getMimeOrMediaType(part)!,
						...metadata,
					} satisfies Infer<typeof vFilePart>;
				case "tool-call":
					return {
						type: part.type,
						args: part.input ?? null,
						toolCallId: part.toolCallId,
						toolName: part.toolName,
						providerExecuted: part.providerExecuted,
						...metadata,
					} satisfies Infer<typeof vToolCallPart>;
				case "tool-result":
					return normalizeToolResult(part, metadata);
				case "reasoning":
					return {
						type: part.type,
						text: part.text,
						...metadata,
					} satisfies Infer<typeof vReasoningPart>;
				// TODO: Implement tool approval workflow support
				// AI SDK 6.0 introduced tool-approval-request and tool-approval-response
				// content types for human-in-the-loop approval of tool calls. These are
				// currently filtered out since we don't have UI/UX for approval workflows.
				// To implement: store approval state, expose in UI, handle user responses.
				// See: https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling#tool-approval
				case "tool-approval-request":
				case "tool-approval-response":
					return null;
				// Not in current generation output, but could be in historical messages
				default:
					return part satisfies Infer<typeof vContent>;
			}
		})
		.filter(
			(part): part is NonNullable<typeof part> => part !== null,
		) as Message["content"];
}

export function toModelMessageContent(
	content: SerializedContent | ModelMessage["content"],
): Content {
	if (typeof content === "string") {
		return content;
	}
	return content
		.map((part) => {
			const metadata: {
				providerOptions?: ProviderOptions;
				providerMetadata?: ProviderMetadata;
			} = {};
			if ("providerOptions" in part) {
				metadata.providerOptions = part.providerOptions;
			}
			if ("providerMetadata" in part) {
				metadata.providerMetadata = part.providerMetadata;
			}
			switch (part.type) {
				case "text":
					return {
						type: part.type,
						text: part.text,
						...metadata,
					} satisfies TextPart;
				case "image":
					return {
						type: part.type,
						image: toModelMessageDataOrUrl(part.image),
						mediaType: getMimeOrMediaType(part),
						...metadata,
					} satisfies ImagePart;
				case "file":
					return {
						type: part.type,
						data: toModelMessageDataOrUrl(part.data),
						filename: part.filename,
						mediaType: getMimeOrMediaType(part)!,
						...metadata,
					} satisfies FilePart;
				case "tool-call": {
					const input = "input" in part ? part.input : part.args;
					return {
						type: part.type,
						input: input ?? null,
						toolCallId: part.toolCallId,
						toolName: part.toolName,
						providerExecuted: part.providerExecuted,
						...metadata,
					} satisfies ToolCallPart;
				}
				case "tool-result": {
					return normalizeToolResult(part, metadata);
				}
				case "reasoning":
					return {
						type: part.type,
						text: part.text,
						...metadata,
					} satisfies ReasoningPart;
				case "redacted-reasoning":
					// TODO: should we just drop this?
					return {
						type: "reasoning",
						text: "",
						...metadata,
						providerOptions: metadata.providerOptions
							? {
									...Object.fromEntries(
										Object.entries(metadata.providerOptions ?? {}).map(
											([key, value]) => [
												key,
												{ ...value, redactedData: part.data },
											],
										),
									),
								}
							: undefined,
					} satisfies ReasoningPart;
				case "source":
					return part satisfies SourcePart;
				// TODO: Implement tool approval workflow support
				// AI SDK 6.0 introduced tool-approval-request and tool-approval-response
				// content types for human-in-the-loop approval of tool calls. These are
				// currently filtered out since we don't have UI/UX for approval workflows.
				// To implement: store approval state, expose in UI, handle user responses.
				// See: https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling#tool-approval
				case "tool-approval-request":
				case "tool-approval-response":
					return null;
				default:
					return part satisfies Content;
			}
		})
		.filter(
			(part): part is NonNullable<typeof part> => part !== null,
		) as Content;
}

export function normalizeToolOutput(
	result: string | JSONValue | undefined,
): ToolResultPart["output"] {
	if (typeof result === "string") {
		return {
			type: "text",
			value: result,
		};
	}
	if (validate(vToolResultOutput, result)) {
		return result;
	}
	return {
		type: "json",
		value: result ?? null,
	};
}

function normalizeToolResult(
	part: ToolResultPart | Infer<typeof vToolResultPart>,
	metadata: {
		providerOptions?: ProviderOptions;
		providerMetadata?: ProviderMetadata;
	},
): ToolResultPart & Infer<typeof vToolResultPart> {
	return {
		type: part.type,
		output:
			part.output ??
			normalizeToolOutput("result" in part ? part.result : undefined),
		toolCallId: part.toolCallId,
		toolName: part.toolName,
		...metadata,
	} satisfies ToolResultPart;
}

/**
 * Return a best-guess MIME type based on the magic-number signature
 * found at the start of an ArrayBuffer.
 *
 * @param buf – the source ArrayBuffer
 * @returns the detected MIME type, or `"application/octet-stream"` if unknown
 */
export function guessMimeType(buf: ArrayBuffer | string): string {
	if (typeof buf === "string") {
		if (buf.match(/^data:\w+\/\w+;base64/)) {
			const mimeType = buf.split(";")[0]?.split(":")[1];
			return mimeType ?? "application/octet-stream";
		}
		return "text/plain";
	}
	if (buf.byteLength < 4) return "application/octet-stream";

	// Read the first 12 bytes (enough for all signatures below)
	const bytes = new Uint8Array(buf.slice(0, 12));
	const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");

	// Helper so we can look at only the needed prefix
	const startsWith = (sig: string) => hex.startsWith(sig.toLowerCase());

	// --- image formats ---
	if (startsWith("89504e47")) return "image/png"; // PNG  - 89 50 4E 47
	if (
		startsWith("ffd8ffdb") ||
		startsWith("ffd8ffe0") ||
		startsWith("ffd8ffee") ||
		startsWith("ffd8ffe1")
	)
		return "image/jpeg"; // JPEG
	if (startsWith("47494638")) return "image/gif"; // GIF
	if (startsWith("424d")) return "image/bmp"; // BMP
	if (startsWith("52494646") && hex.substr(16, 8) === "57454250")
		return "image/webp"; // WEBP (RIFF....WEBP)
	if (startsWith("49492a00")) return "image/tiff"; // TIFF
	// <svg in hex is 3c 3f 78 6d 6c
	if (startsWith("3c737667")) return "image/svg+xml"; // <svg
	if (startsWith("3c3f786d")) return "image/svg+xml"; // <?xm

	// --- audio/video ---
	if (startsWith("494433")) return "audio/mpeg"; // MP3 (ID3)
	if (startsWith("000001ba") || startsWith("000001b3")) return "video/mpeg"; // MPEG container
	if (startsWith("1a45dfa3")) return "video/webm"; // WEBM / Matroska
	if (startsWith("00000018") && hex.substr(16, 8) === "66747970")
		return "video/mp4"; // MP4
	if (startsWith("4f676753")) return "audio/ogg"; // OGG / Opus

	// --- documents & archives ---
	if (startsWith("25504446")) return "application/pdf"; // PDF
	if (
		startsWith("504b0304") ||
		startsWith("504b0506") ||
		startsWith("504b0708")
	)
		return "application/zip"; // ZIP / DOCX / PPTX / XLSX / EPUB
	if (startsWith("52617221")) return "application/x-rar-compressed"; // RAR
	if (startsWith("7f454c46")) return "application/x-elf"; // ELF binaries
	if (startsWith("1f8b08")) return "application/gzip"; // GZIP
	if (startsWith("425a68")) return "application/x-bzip2"; // BZIP2
	if (startsWith("3c3f786d6c")) return "application/xml"; // XML

	// Plain text, JSON and others are trickier—fallback:
	return "application/octet-stream";
}

/**
 * Serialize an AI SDK `DataContent` or `URL` to a Convex-serializable format.
 * @param dataOrUrl - The data or URL to serialize.
 * @returns The serialized data as an ArrayBuffer or the URL as a string.
 */
export function serializeDataOrUrl(
	dataOrUrl: DataContent | URL,
): ArrayBuffer | string {
	if (typeof dataOrUrl === "string") {
		return dataOrUrl;
	}
	if (dataOrUrl instanceof ArrayBuffer) {
		return dataOrUrl; // Already an ArrayBuffer
	}
	if (dataOrUrl instanceof URL) {
		return dataOrUrl.toString();
	}
	return dataOrUrl.buffer.slice(
		dataOrUrl.byteOffset,
		dataOrUrl.byteOffset + dataOrUrl.byteLength,
	) as ArrayBuffer;
}

export function toModelMessageDataOrUrl(
	urlOrString: string | ArrayBuffer | URL | DataContent,
): URL | DataContent {
	if (urlOrString instanceof URL) {
		return urlOrString;
	}
	if (typeof urlOrString === "string") {
		if (
			urlOrString.startsWith("http://") ||
			urlOrString.startsWith("https://")
		) {
			return new URL(urlOrString);
		}
		return urlOrString;
	}
	return urlOrString;
}

export function toUIFilePart(part: ImagePart | FilePart): FileUIPart {
	const dataOrUrl = part.type === "image" ? part.image : part.data;
	const url =
		dataOrUrl instanceof ArrayBuffer
			? convertUint8ArrayToBase64(new Uint8Array(dataOrUrl))
			: dataOrUrl.toString();

	return {
		type: "file",
		mediaType: part.mediaType!,
		filename: part.type === "file" ? part.filename : undefined,
		url,
		providerMetadata: part.providerOptions,
	};
}

// Currently unused
// export function toModelMessages(args: {
//   messages?: ModelMessage[] | AIMessageWithoutId[];
// }): ModelMessage[] {
//   const messages: ModelMessage[] = [];
//   if (args.messages) {
//     if (
//       args.messages.every(
//         (m) => typeof m === "object" && m !== null && "parts" in m,
//       )
//     ) {
//       messages.push(...convertToModelMessages(args.messages));
//     } else {
//       messages.push(...modelMessageSchema.array().parse(args.messages));
//     }
//   }
//   return messages;
// }
