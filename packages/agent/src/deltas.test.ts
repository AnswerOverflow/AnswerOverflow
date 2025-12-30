import { describe, it, expect } from "vitest";
import {
	blankUIMessage,
	deriveUIMessagesFromTextStreamParts,
	updateFromTextStreamParts,
	updateFromUIMessageChunks,
} from "./deltas";
import type { StreamMessage, StreamDelta } from "./validators";
import { omit } from "convex-helpers";
import type { Tool, ToolUIPart, TypedToolResult } from "ai";

describe("UIMessageChunks", () => {
	it("updates a UIMessage with a tool call and follow up", async () => {
		const uiMessage = blankUIMessage(
			{
				streamId: "s1",
				status: "streaming",
				order: 0,
				stepOrder: 1,
				format: "UIMessageChunk",
				agentName: "agent1",
			},
			"thread1",
		);
		expect(uiMessage.text).toBe("");
		expect(uiMessage.parts).toEqual([]);
		const updatedMessage = await updateFromUIMessageChunks(uiMessage, [
			{ type: "start" },
			{ type: "start-step" },
			{ type: "reasoning-start", id: "reasoning-0" },
			{ type: "reasoning-delta", id: "reasoning-0", delta: "Okay" },
			{
				type: "reasoning-delta",
				id: "reasoning-0",
				delta: ", the user is asking...",
			},
			{ type: "text-start", id: "txt-1" },
			{
				type: "text-delta",
				id: "txt-1",
				delta: "Hey ho.",
			},
			{ type: "reasoning-end", id: "reasoning-0" },
			{ type: "text-end", id: "txt-1" },
			{ type: "tool-input-start", toolCallId: "0ychh9k6f", toolName: "say" },
			{
				type: "tool-input-delta",
				toolCallId: "0ychh9k6f",
				inputTextDelta:
					'{"question":"What is your favorite flavor of ice cream?"}',
			},
			{
				type: "tool-input-available",
				toolCallId: "0ychh9k6f",
				toolName: "say",
				input: { question: "What is your favorite flavor of ice cream?" },
				providerMetadata: { openai: { itemId: "123" } },
			},
			{
				type: "tool-output-available",
				toolCallId: "0ychh9k6f",
				output: "I'm sorry I can't help you. Stop asking me questions.",
			},
			{ type: "finish-step" },
			{ type: "start-step" },
			{ type: "tool-input-start", toolCallId: "1ychh9k6f", toolName: "say" },
			{
				type: "tool-input-delta",
				toolCallId: "1ychh9k6f",
				inputTextDelta:
					'{"question":"What is your favorite flavor of ice cream?"}',
			},
			{
				type: "tool-input-available",
				toolCallId: "1ychh9k6f",
				toolName: "say",
				input: { question: "What is your favorite flavor of ice cream?" },
			},
			{
				type: "tool-output-available",
				toolCallId: "1ychh9k6f",
				output: "I'm serious.",
			},
			{ type: "finish-step" },
			{ type: "start-step" },
			{ type: "text-start", id: "msg_0" },
			{
				type: "text-delta",
				id: "msg_0",
				delta: "The best ice cream flavor is vanilla",
			},
			{
				type: "text-delta",
				id: "msg_0",
				delta: ".",
			},
			{ type: "text-end", id: "msg_0" },
			{ type: "finish-step" },
			{ type: "finish" },
		]);
		expect(updatedMessage.text).toBe(
			"Hey ho. The best ice cream flavor is vanilla.",
		);
		const expectedParts = [
			{
				type: "step-start",
			},
			{
				state: "done",
				text: "Okay, the user is asking...",
				type: "reasoning",
			},
			{
				state: "done",
				text: "Hey ho.",
				type: "text",
			},
			{
				callProviderMetadata: {
					openai: {
						itemId: "123",
					},
				},
				input: {
					question: "What is your favorite flavor of ice cream?",
				},
				output: "I'm sorry I can't help you. Stop asking me questions.",

				state: "output-available",
				toolCallId: "0ychh9k6f",
				type: "tool-say",
			},
			{
				type: "step-start",
			},
			{
				input: {
					question: "What is your favorite flavor of ice cream?",
				},
				output: "I'm serious.",
				state: "output-available",
				toolCallId: "1ychh9k6f",
				type: "tool-say",
			},
			{
				type: "step-start",
			},
			{
				state: "done",
				text: "The best ice cream flavor is vanilla.",
				type: "text",
			},
		];
		expect(updatedMessage.parts).toEqual(expectedParts);
		expect(updatedMessage.parts).toHaveLength(8);
	});
});

describe("mergeDeltas", () => {
	it("merges a single text-delta into a message", () => {
		const streamId = "s1";
		const deltas = [
			{
				streamId,
				start: 0,
				end: 5,
				parts: [{ type: "text-delta", id: "1", text: "Hello" }],
			} satisfies StreamDelta,
		];
		const [messages, newStreams, changed] = deriveUIMessagesFromTextStreamParts(
			"thread1",
			[{ streamId, order: 1, stepOrder: 0, status: "streaming" }],
			[],
			deltas,
		);
		expect(messages).toHaveLength(1);
		expect(messages[0]!.text).toBe("Hello");
		expect(messages[0]!.role).toBe("assistant");
		expect(changed).toBe(true);
		expect(newStreams[0]!.cursor).toBe(5);
	});

	it("merges multiple deltas for the same stream", () => {
		const streamId = "s1";
		const deltas = [
			{
				streamId,
				start: 0,
				end: 5,
				parts: [{ type: "text-delta", id: "1", text: "Hello" }],
			},
			{
				streamId,
				start: 5,
				end: 11,
				parts: [{ type: "text-delta", id: "2", text: " World!" }],
			},
		];
		const [messages, newStreams, changed] = deriveUIMessagesFromTextStreamParts(
			"thread1",
			[{ streamId, order: 1, stepOrder: 0, status: "streaming" }],
			[],
			deltas,
		);
		expect(messages).toHaveLength(1);
		expect(messages[0]!.text).toBe("Hello World!");
		expect(changed).toBe(true);
		expect(newStreams[0]!.cursor).toBe(11);
	});

	it("handles tool-call and tool-result parts", () => {
		const streamId = "s2";
		const deltas = [
			{
				streamId,
				start: 0,
				end: 1,
				parts: [
					{
						type: "tool-call",
						toolCallId: "call1",
						toolName: "myTool",
						input: "What's the meaning of life?",
					},
				],
			} satisfies StreamDelta,
			{
				streamId,
				start: 1,
				end: 2,
				parts: [
					{
						type: "tool-result",
						toolCallId: "call1",
						toolName: "myTool",
						input: undefined,
						output: "42",
					} satisfies TypedToolResult<{ myTool: Tool }>,
				],
			} satisfies StreamDelta,
		];
		const [[message], _, changed] = deriveUIMessagesFromTextStreamParts(
			"thread1",
			[{ streamId, order: 2, stepOrder: 0, status: "streaming" }],
			[],
			deltas,
		);
		expect(message).toBeDefined();
		expect(message.role).toBe("assistant");
		const content = message.parts;
		expect(content).toEqual([
			{
				type: "tool-myTool",
				toolCallId: "call1",
				input: "What's the meaning of life?",
				output: "42",
				state: "output-available",
			} satisfies ToolUIPart,
		]);
		expect(changed).toBe(true);
	});

	it("returns changed=false if no new deltas", () => {
		const streamId = "s3";
		const deltas: StreamDelta[] = [];
		const [, newStreams, changed] = deriveUIMessagesFromTextStreamParts(
			"thread1",
			[{ streamId, order: 3, stepOrder: 0, status: "streaming" }],
			[],
			deltas,
		);
		expect(changed).toBe(false);
		expect(newStreams[0]!.cursor).toBe(0);
	});

	it("handles multiple streams and sorts by order/stepOrder", () => {
		const deltas = [
			{
				streamId: "s2",
				start: 0,
				end: 3,
				parts: [{ type: "text-delta", id: "1", text: "B" }],
			} satisfies StreamDelta,
			{
				streamId: "s1",
				start: 0,
				end: 3,
				parts: [{ type: "text-delta", id: "2", text: "A" }],
			} satisfies StreamDelta,
		];
		const [messages, _, changed] = deriveUIMessagesFromTextStreamParts(
			"thread1",
			[
				{ streamId: "s1", order: 1, stepOrder: 0, status: "streaming" },
				{ streamId: "s2", order: 2, stepOrder: 0, status: "streaming" },
			],
			[],
			deltas,
		);
		expect(messages).toHaveLength(2);
		expect(messages[0]!.text).toBe("A");
		expect(messages[1]!.text).toBe("B");
		expect(changed).toBe(true);
		// Sorted by order
		expect(messages[0]!.order).toBe(1);
		expect(messages[1]!.order).toBe(2);
	});

	it("does not duplicate text content when merging sequential text-deltas", () => {
		const streamId = "s4";
		const deltas = [
			{
				streamId,
				start: 0,
				end: 5,
				parts: [{ type: "text-delta", id: "1", text: "Hello" }],
			},
			{
				streamId,
				start: 5,
				end: 11,
				parts: [{ type: "text-delta", id: "2", text: " World!" }],
			},
			{
				streamId,
				start: 11,
				end: 12,
				parts: [{ type: "text-delta", id: "3", text: "!" }],
			},
		] satisfies StreamDelta[];
		const [messages] = deriveUIMessagesFromTextStreamParts(
			"thread1",
			[{ streamId, order: 4, stepOrder: 0, status: "streaming" }],
			[],
			deltas,
		);
		expect(messages).toHaveLength(1);
		expect(messages[0]!.text).toBe("Hello World!!");
		// There should only be one text part per message
		const content = messages[0]!.parts;
		if (Array.isArray(content)) {
			const textParts = content.filter((p) => p.type === "text");
			expect(textParts).toHaveLength(1);
			expect(textParts[0]!.text).toBe("Hello World!!");
		}
	});

	it("does not duplicate reasoning parts", () => {
		const streamId = "s6";
		const deltas = [
			{
				streamId,
				start: 0,
				end: 1,
				parts: [
					{ type: "reasoning-start", id: "1" },
					{ type: "reasoning-delta", id: "1", text: "I'm thinking..." },
				],
			},
			{
				streamId,
				start: 1,
				end: 2,
				parts: [
					{ type: "reasoning-delta", id: "1", text: " Still thinking..." },
				],
			},
			{
				streamId,
				start: 2,
				end: 3,
				parts: [{ type: "reasoning-end", id: "1" }],
			},
		];
		const [messages] = deriveUIMessagesFromTextStreamParts(
			"thread1",
			[{ streamId, order: 6, stepOrder: 0, status: "streaming" }],
			[],
			deltas,
		);
		expect(messages).toHaveLength(1);
		if (Array.isArray(messages[0]!.parts)) {
			const reasoningParts = messages[0]!.parts.filter(
				(p) => p.type === "reasoning",
			);
			expect(reasoningParts).toHaveLength(1);
			expect(reasoningParts[0]!.text).toBe("I'm thinking... Still thinking...");
			expect(reasoningParts[0]!.state).toBe("done");
		}
	});

	it("applyDeltasToStreamMessage is idempotent and does not duplicate content", () => {
		const streamId = "s7";
		const streamMessage = {
			streamId,
			order: 7,
			stepOrder: 0,
			status: "streaming",
		} satisfies StreamMessage;
		const deltas = [
			{
				streamId,
				start: 0,
				end: 5,
				parts: [{ type: "text-delta", id: "1", text: "Hello" }],
			},
			{
				streamId,
				start: 5,
				end: 11,
				parts: [{ type: "text-delta", id: "2", text: " World!" }],
			},
		];
		// First call: apply both deltas
		let [result, changed] = updateFromTextStreamParts(
			"thread1",
			streamMessage,
			undefined,
			deltas,
		);
		expect(result.message.text).toBe("Hello World!");
		// Second call: re-apply the same deltas (should not duplicate)
		[result, changed] = updateFromTextStreamParts(
			"thread1",
			streamMessage,
			result,
			deltas,
		);
		expect(result.message.text).toBe("Hello World!");
		// Third call: add a new delta
		const moreDeltas = [
			...deltas,
			{
				streamId,
				start: 11,
				end: 12,
				parts: [{ type: "text-delta", id: "3", text: "!" }],
			},
		];
		[result, changed] = updateFromTextStreamParts(
			"thread1",
			streamMessage,
			result,
			moreDeltas,
		);
		expect(changed).toBe(true);
		expect(result.message.text).toBe("Hello World!!");
		// Re-apply all deltas again (should still not duplicate)
		[result, changed] = updateFromTextStreamParts(
			"thread1",
			streamMessage,
			result,
			moreDeltas,
		);
		expect(changed).toBe(false);
		expect(result.message.text).toBe("Hello World!!");
	});

	it("mergeDeltas is pure and does not mutate inputs", () => {
		const streamId = "s8";
		const streamMessages = [
			{ streamId, order: 8, stepOrder: 0, status: "streaming" },
		] satisfies StreamMessage[];
		const deltas = [
			{
				streamId,
				start: 0,
				end: 5,
				parts: [{ type: "text-delta", id: "1", text: "Hello" }],
			},
			{
				streamId,
				start: 5,
				end: 11,
				parts: [{ type: "text-delta", id: "2", text: " World!" }],
			},
		];
		// Deep freeze inputs to catch mutation
		function deepFreeze(obj: unknown): unknown {
			if (obj && typeof obj === "object" && !Object.isFrozen(obj)) {
				Object.freeze(obj);
				for (const key of Object.keys(obj)) {
					deepFreeze((obj as Record<string, unknown>)[key]);
				}
			}
			return obj;
		}
		deepFreeze(streamMessages);
		deepFreeze(deltas);
		const [messages1, streams1, changed1] = deriveUIMessagesFromTextStreamParts(
			"thread1",
			streamMessages,
			[],
			deltas,
		);
		const [messages2, streams2, changed2] = deriveUIMessagesFromTextStreamParts(
			"thread1",
			streamMessages,
			[],
			deltas,
		);
		expect(messages1.map((m) => omit(m, ["_creationTime"]))).toEqual(
			messages2.map((m) => omit(m, ["_creationTime"])),
		);
		expect(
			streams1.map((s) => ({
				...s,
				message: omit(s.message, ["_creationTime"]),
			})),
		).toEqual(
			streams2.map((s) => ({
				...s,
				message: omit(s.message, ["_creationTime"]),
			})),
		);
		expect(changed1).toBe(changed2);
		// Inputs should remain unchanged
		expect(streamMessages).toMatchObject([
			{ streamId, order: 8, stepOrder: 0, status: "streaming" },
		]);
		expect(deltas).toEqual([
			{
				streamId,
				start: 0,
				end: 5,
				parts: [{ type: "text-delta", id: "1", text: "Hello" }],
			},
			{
				streamId,
				start: 5,
				end: 11,
				parts: [{ type: "text-delta", id: "2", text: " World!" }],
			},
		]);
	});
});
