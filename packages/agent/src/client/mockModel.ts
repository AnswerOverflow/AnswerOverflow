import type {
	LanguageModelV2,
	LanguageModelV2Content,
	LanguageModelV2StreamPart,
	SharedV2ProviderMetadata,
} from "@ai-sdk/provider";
import { simulateReadableStream } from "ai";
import { assert, pick } from "convex-helpers";

export const DEFAULT_TEXT = `
A A A A A A A A A A A A A A A
B B B B B B B B B B B B B B B
C C C C C C C C C C C C C C C
D D D D D D D D D D D D D D D
`;
const DEFAULT_USAGE = { outputTokens: 10, inputTokens: 3, totalTokens: 13 };

export type MockModelArgs = {
	provider?: LanguageModelV2["provider"];
	modelId?: LanguageModelV2["modelId"];
	supportedUrls?:
		| LanguageModelV2["supportedUrls"]
		| (() => LanguageModelV2["supportedUrls"]);
	chunkDelayInMs?: number;
	initialDelayInMs?: number;
	/** A list of the responses for multiple steps.
	 * For tool calls, the first list would include a tool call part,
	 * then the next list would be after the tool response or another tool call.
	 * Tool responses come from actual tool calls!
	 */
	contentSteps?: LanguageModelV2Content[][];
	/** A single list of content responded from each step.
	 * Provide contentSteps instead if you want to do multi-step responses with
	 * tool calls.
	 */
	content?: LanguageModelV2Content[];
	// provide either content, contentResponses or doGenerate & doStream
	doGenerate?: LanguageModelV2["doGenerate"];
	doStream?: LanguageModelV2["doStream"];
	providerMetadata?: SharedV2ProviderMetadata;
	fail?:
		| boolean
		| {
				probability?: number;
				error?: string;
		  };
};

function atMostOneOf(...args: unknown[]) {
	return args.filter(Boolean).length <= 1;
}

export function mockModel(args?: MockModelArgs): LanguageModelV2 {
	return new MockLanguageModel(args ?? {});
}

export class MockLanguageModel implements LanguageModelV2 {
	readonly specificationVersion = "v2";

	private _supportedUrls: () => LanguageModelV2["supportedUrls"];

	readonly provider: LanguageModelV2["provider"];
	readonly modelId: LanguageModelV2["modelId"];

	doGenerate: LanguageModelV2["doGenerate"];
	doStream: LanguageModelV2["doStream"];

	doGenerateCalls: Parameters<LanguageModelV2["doGenerate"]>[0][] = [];
	doStreamCalls: Parameters<LanguageModelV2["doStream"]>[0][] = [];

	constructor(args: MockModelArgs) {
		assert(
			atMostOneOf(
				args.content,
				args.contentSteps,
				args.doGenerate && args.doStream,
			),
			"Expected only one of content, contentSteps, or doGenerate and doStream",
		);
		this.provider = args.provider || "mock-provider";
		this.modelId = args.modelId || "mock-model-id";
		const {
			content = [{ type: "text", text: DEFAULT_TEXT }],
			contentSteps = [content],
			chunkDelayInMs = 0,
			initialDelayInMs = 0,
			supportedUrls = {},
		} = args;
		const fail =
			args.fail &&
			(args.fail === true ||
				!args.fail.probability ||
				Math.random() < args.fail.probability);
		const error =
			(typeof args.fail === "object" && args.fail.error) ||
			"Mock error message";
		const metadata = pick(args, ["providerMetadata"]);

		const chunkResponses: LanguageModelV2StreamPart[][] = contentSteps.map(
			(content) => {
				const chunks: LanguageModelV2StreamPart[] = [
					{ type: "stream-start", warnings: [] },
				];
				chunks.push(
					...content.flatMap((c, ci): LanguageModelV2StreamPart[] => {
						if (c.type !== "text" && c.type !== "reasoning") {
							return [c];
						}
						const metadata = pick(c, ["providerMetadata"]);
						const deltas = c.text.split(" ");
						const parts: LanguageModelV2StreamPart[] = [];
						if (c.type === "reasoning") {
							parts.push({
								type: "reasoning-start",
								id: `reasoning-${ci}`,
								...metadata,
							});
							parts.push(
								...deltas.map(
									(delta, di) =>
										({
											type: "reasoning-delta",
											delta: (di ? " " : "") + delta,
											id: `reasoning-${ci}`,
											...metadata,
										}) satisfies LanguageModelV2StreamPart,
								),
							);
							parts.push({
								type: "reasoning-end",
								id: `reasoning-${ci}`,
								...metadata,
							});
						} else if (c.type === "text") {
							parts.push({
								type: "text-start",
								id: `txt-${ci}`,
								...metadata,
							});
							parts.push(
								...deltas.map(
									(delta, di) =>
										({
											type: "text-delta",
											delta: (di ? " " : "") + delta,
											id: `txt-${ci}`,
											...metadata,
										}) satisfies LanguageModelV2StreamPart,
								),
							);
							parts.push({
								type: "text-end",
								id: `txt-${ci}`,
								...metadata,
							});
						}
						return parts;
					}),
				);
				if (fail) {
					chunks.push({
						type: "error",
						error,
					});
				}
				chunks.push({
					type: "finish",
					finishReason: fail ? "error" : "stop",
					usage: DEFAULT_USAGE,
					...metadata,
				});
				return chunks;
			},
		);
		let callIndex = 0;
		this.doGenerate = async (options) => {
			this.doGenerateCalls.push(options);

			if (fail) {
				throw new Error(error);
			}
			if (typeof args.doGenerate === "function") {
				return args.doGenerate(options);
			} else if (Array.isArray(args.doGenerate)) {
				return args.doGenerate[this.doGenerateCalls.length];
			} else if (contentSteps.length) {
				const content = contentSteps[callIndex % contentSteps.length]!;
				const result = {
					content,
					finishReason: "stop" as const,
					usage: DEFAULT_USAGE,
					...metadata,
					warnings: [],
				};
				callIndex++;
				return result;
			} else {
				throw new Error("Unexpected: no content or doGenerate");
			}
		};
		this._supportedUrls =
			typeof supportedUrls === "function"
				? supportedUrls
				: async () => supportedUrls;
		this.doStream = async (options) => {
			this.doStreamCalls.push(options);

			if (typeof args.doStream === "function") {
				return args.doStream(options);
			} else if (Array.isArray(args.doStream)) {
				return args.doStream[this.doStreamCalls.length];
			} else if (contentSteps) {
				const chunks = chunkResponses[callIndex % chunkResponses.length]!;
				const stream = simulateReadableStream({
					chunks,
					initialDelayInMs,
					chunkDelayInMs,
				});
				callIndex++;

				if (options.abortSignal) {
					options.abortSignal.addEventListener("abort", () => {
						console.warn("abortSignal in mock model not supported");
					});
				}
				return {
					stream,
					request: { body: {} },
					response: { headers: {} },
				};
			} else if (args.doStream) {
				return args.doStream;
			} else {
				throw new Error("Provide either content or doStream");
			}
		};
		this._supportedUrls =
			typeof supportedUrls === "function"
				? supportedUrls
				: async () => supportedUrls;
	}

	get supportedUrls() {
		return this._supportedUrls();
	}
}
