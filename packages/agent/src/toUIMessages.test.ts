import { assert } from "convex-helpers";
import { describe, expect, it } from "vitest";
import { toUIMessages } from "./UIMessages";
import type { MessageDoc } from "./validators";

// Helper to create a base message doc
function baseMessageDoc(overrides: Partial<MessageDoc> = {}): MessageDoc {
	return {
		_id: "msg1",
		_creationTime: Date.now(),
		order: 0,
		stepOrder: 0,
		status: "success",
		threadId: "thread1",
		tool: false,
		...overrides,
	};
}

describe("toUIMessages", () => {
	it("handles user message", () => {
		const messages = [
			baseMessageDoc({
				message: {
					role: "user",
					content: "Hello!",
				},
				text: "Hello!",
			}),
		];
		const uiMessages = toUIMessages(messages);
		expect(uiMessages).toHaveLength(1);
		expect(uiMessages[0]!.role).toBe("user");
		expect(uiMessages[0]!.text).toBe("Hello!");
		expect(uiMessages[0]!.parts[0]!).toEqual({ type: "text", text: "Hello!" });
	});

	it("handles assistant message", () => {
		const messages = [
			baseMessageDoc({
				message: {
					role: "assistant",
					content: "Hi, how can I help?",
				},
				text: "Hi, how can I help?",
			}),
		];
		const uiMessages = toUIMessages(messages);
		expect(uiMessages).toHaveLength(1);
		expect(uiMessages[0]!.role).toBe("assistant");
		expect(uiMessages[0]!.text).toBe("Hi, how can I help?");
		expect(uiMessages[0]!.parts[0]!).toEqual({
			type: "text",
			text: "Hi, how can I help?",
			state: "done",
		});
	});

	it("handles multiple messages", () => {
		const messages = [
			baseMessageDoc({
				message: {
					role: "user",
					content: "Hello!",
				},
				text: "Hello!",
			}),
			baseMessageDoc({
				message: {
					role: "assistant",
					content: [
						{
							type: "reasoning",
							text: "I'm thinking...",
						},
						{
							type: "redacted-reasoning",
							data: "asdfasdfasdf",
						},
						{
							type: "text",
							text: "I'm thinking...",
						},
						{
							type: "file",
							mimeType: "text/plain",
							data: "https://example.com/file.txt",
						},
						{
							type: "tool-call",
							toolName: "myTool",
							toolCallId: "call1",
							args: "an arg",
						},
					],
				},
				tool: true,
				reasoning: "I'm thinking...",
				text: "I'm thinking...",
			}),
			baseMessageDoc({
				message: {
					role: "tool",
					content: [
						{
							type: "tool-result",
							toolCallId: "call1",
							toolName: "myTool",
							output: {
								type: "text",
								value: "42",
							},
						},
					],
				},
				tool: true,
			}),
		];
		const uiMessages = toUIMessages(messages);
		expect(uiMessages).toHaveLength(2);
		expect(uiMessages[0]!.role).toBe("user");
		expect(uiMessages[0]!.parts.filter((p) => p.type === "text")).toHaveLength(
			1,
		);
		expect(uiMessages[1]!.role).toBe("assistant");
		expect(
			uiMessages[1]!.parts.filter((p) => p.type === "tool-myTool"),
		).toHaveLength(1);
		expect(
			uiMessages[1]!.parts.filter((p) => p.type === "tool-myTool")[0]!,
		).toMatchObject({
			type: "tool-myTool",
			toolCallId: "call1",
			state: "output-available",
			output: "42",
		});
	});

	it("handles multiple text and reasoning parts", () => {
		const messages = [
			baseMessageDoc({
				message: {
					role: "assistant",
					content: [
						{
							type: "reasoning",
							text: "I'm thinking...",
						},
						{
							type: "text",
							text: "Here's one idea.",
						},
						{
							type: "reasoning",
							text: "I'm thinking...",
						},
						{
							type: "text",
							text: "Here's another idea.",
						},
					],
				},
				reasoning: "I'm thinking... I'm thinking...",
				text: "Here's one idea. Here's another idea.",
			}),
		];
		const uiMessages = toUIMessages(messages);
		expect(uiMessages).toHaveLength(1);
		expect(uiMessages[0]!.role).toBe("assistant");
		expect(uiMessages[0]!.text).toBe("Here's one idea. Here's another idea.");
		expect(uiMessages[0]!.parts.filter((p) => p.type === "reasoning")).toEqual([
			{
				providerOptions: undefined,
				state: "done",
				text: "I'm thinking...",
				type: "reasoning",
			},
			{
				providerOptions: undefined,
				state: "done",
				text: "I'm thinking...",
				type: "reasoning",
			},
		]);
		expect(uiMessages[0]!.parts[0]!.type).toBe("reasoning");
		assert(uiMessages[0]!.parts[0]!.type === "reasoning");
		expect(uiMessages[0]!.parts[0]!.text).toBe("I'm thinking...");
		expect(uiMessages[0]!.parts[1]!.type).toBe("text");
		assert(uiMessages[0]!.parts[1]!.type === "text");
		expect(uiMessages[0]!.parts[1]!.text).toBe("Here's one idea.");
		expect(uiMessages[0]!.parts[2]!.type).toBe("reasoning");
		assert(uiMessages[0]!.parts[2]!.type === "reasoning");
		expect(uiMessages[0]!.parts[2]!.text).toBe("I'm thinking...");

		expect(uiMessages[0]!.parts.filter((p) => p.type === "text")).toHaveLength(
			2,
		);
		expect(uiMessages[0]!.parts.filter((p) => p.type === "text")[0]!.text).toBe(
			"Here's one idea.",
		);
		expect(uiMessages[0]!.parts.filter((p) => p.type === "text")[1]!.text).toBe(
			"Here's another idea.",
		);
	});

	it("combines text from between messages", () => {
		const messages = [
			baseMessageDoc({
				message: {
					role: "assistant",
					content: [
						{
							type: "reasoning",
							text: "I'm thinking...",
						},
						{
							type: "text",
							text: "I'm going to ask a question.",
						},
						{
							type: "tool-call",
							args: "What's the meaning of life?",
							toolCallId: "call1",
							toolName: "myTool",
						},
					],
				},
				reasoning: "I'm thinking...",
				text: "Here's one idea.",
				tool: true,
				order: 1,
				stepOrder: 1,
			}),
			baseMessageDoc({
				message: {
					role: "tool",
					content: [
						{
							type: "tool-result",
							toolCallId: "call1",
							toolName: "myTool",
							output: {
								type: "text",
								value: "42",
							},
						},
					],
				},
				text: "",
				tool: true,
				order: 1,
				stepOrder: 2,
			}),
			baseMessageDoc({
				message: {
					role: "assistant",
					content: [
						{
							type: "reasoning",
							text: "Thinking again...",
						},
						{
							type: "text",
							text: "Ok now I know.",
						},
					],
				},
				text: "One last thing.",
				order: 1,
				stepOrder: 3,
			}),
		];
		const uiMessages = toUIMessages(messages);
		expect(uiMessages).toHaveLength(1);
		expect(uiMessages[0]!.role).toBe("assistant");
		expect(uiMessages[0]!.text).toBe(
			"I'm going to ask a question. Ok now I know.",
		);
	});

	it("handles system message", () => {
		const messages = [
			baseMessageDoc({
				message: {
					role: "system",
					content: "System message here",
				},
				text: "System message here",
			}),
		];
		const uiMessages = toUIMessages(messages);
		expect(uiMessages).toHaveLength(1);
		expect(uiMessages[0]!.role).toBe("system");
		expect(uiMessages[0]!.text).toBe("System message here");
		expect(uiMessages[0]!.parts[0]!).toEqual({
			type: "text",
			text: "System message here",
			state: "done",
			providerMetadata: undefined,
		});
	});

	it("handles wrapped JSON tool output", () => {
		const messages = [
			baseMessageDoc({
				message: {
					role: "assistant",
					content: [
						{
							type: "tool-call",
							toolName: "myTool",
							toolCallId: "call1",
							args: { query: "test" },
						},
					],
				},
				tool: true,
			}),
			baseMessageDoc({
				message: {
					role: "tool",
					content: [
						{
							type: "tool-result",
							toolName: "myTool",
							toolCallId: "call1",
							output: {
								type: "json",
								value: { data: "wrapped result", success: true },
							},
						},
					],
				},
				tool: true,
			}),
		];
		const uiMessages = toUIMessages(messages);
		expect(uiMessages).toHaveLength(1);
		const toolPart = uiMessages[0]!.parts.find((p) => p.type === "tool-myTool");
		expect(toolPart).toMatchObject({
			type: "tool-myTool",
			toolCallId: "call1",
			state: "output-available",
			input: { query: "test" },
			output: { data: "wrapped result", success: true }, // Should be unwrapped
		});
	});

	it("handles tool call", () => {
		const messages = [
			baseMessageDoc({
				message: {
					role: "assistant",
					content: [
						{
							type: "tool-call",
							toolName: "myTool",
							toolCallId: "call1",
							args: "hi",
						},
					],
				},
				text: "",
			}),
		];
		const uiMessages = toUIMessages(messages);
		expect(uiMessages).toHaveLength(1);
		expect(uiMessages[0]!.role).toBe("assistant");
		expect(
			uiMessages[0]!.parts.filter((p) => p.type === "tool-myTool")[0]!,
		).toMatchObject({
			type: "tool-myTool",
			toolCallId: "call1",
			input: "hi",
			state: "input-available",
		});
	});

	it("handles tool result", () => {
		const messages = [
			baseMessageDoc({
				tool: true,
				message: {
					role: "assistant",
					content: [
						{
							type: "tool-call",
							toolName: "myTool",
							toolCallId: "call1",
							args: "",
						},
					],
				},
				text: "",
			}),
			baseMessageDoc({
				message: {
					role: "tool",
					content: [
						{
							type: "tool-result",
							toolCallId: "call1",
							toolName: "myTool",
							result: "42",
						},
					],
				},
				text: "",
			}),
		];
		const uiMessages = toUIMessages(messages);
		expect(uiMessages).toHaveLength(1);
		expect(uiMessages[0]!.role).toBe("assistant");
		// Should have a tool-invocation part
		expect(uiMessages[0]!.parts.some((p) => p.type === "tool-myTool")).toBe(
			true,
		);
	});

	it("does not duplicate text content", () => {
		const messages = [
			baseMessageDoc({
				message: {
					role: "assistant",
					content: "Hello!",
				},
				text: "Hello!",
			}),
		];
		const uiMessages = toUIMessages(messages);
		// There should only be one text part
		const textParts = uiMessages[0]!.parts.filter((p) => p.type === "text");
		expect(textParts).toHaveLength(1);
		expect(textParts[0]!.text).toBe("Hello!");
	});

	it("sets text field correctly when message has many parts with text part as final part", () => {
		const messages = [
			baseMessageDoc({
				message: {
					role: "assistant",
					content: [
						{
							type: "reasoning",
							text: "Let me think about this...",
						},
						{
							type: "tool-call",
							toolName: "calculator",
							toolCallId: "call1",
							args: { operation: "add", a: 2, b: 3 },
						},
						{
							type: "file",
							mimeType: "application/json",
							data: "some-file-data",
						},
						{
							type: "text",
							text: "Here's my final answer.",
						},
					],
				},
				text: "Here's my final answer.",
				reasoning: "Let me think about this...",
			}),
		];

		const uiMessages = toUIMessages(messages);

		expect(uiMessages).toHaveLength(1);
		expect(uiMessages[0]!.role).toBe("assistant");
		expect(uiMessages[0]!.text).toBe("Here's my final answer.");

		// Verify that the text part exists in parts
		const textParts = uiMessages[0]!.parts.filter((p) => p.type === "text");
		expect(textParts).toHaveLength(1);
		expect(textParts[0]!.text).toBe("Here's my final answer.");
	});

	// Add more tests for array content, tool calls, etc. as needed

	it("should update tool call state from input-available to output-available", () => {
		const messages = [
			baseMessageDoc({
				message: {
					role: "assistant",
					content: [
						{
							type: "tool-call",
							toolName: "calculator",
							toolCallId: "call1",
							args: { operation: "add", a: 1, b: 2 },
						},
					],
				},
				tool: true,
			}),
			baseMessageDoc({
				message: {
					role: "tool",
					content: [
						{
							type: "tool-result",
							toolCallId: "call1",
							toolName: "calculator",
							result: { sum: 3 },
						},
					],
				},
				tool: true,
			}),
		];

		const uiMessages = toUIMessages(messages);

		// Should have one assistant message
		expect(uiMessages).toHaveLength(1);
		expect(uiMessages[0]!.role).toBe("assistant");

		// Should have a single tool-calculator part (not separate tool-call and tool-result parts)
		const toolParts = uiMessages[0]!.parts.filter(
			(p) => p.type === "tool-calculator",
		);
		expect(toolParts).toHaveLength(1);

		const toolPart = toolParts[0]!;
		expect(toolPart).toMatchObject({
			type: "tool-calculator",
			toolCallId: "call1",
			state: "output-available",
			input: { operation: "add", a: 1, b: 2 },
			output: { sum: 3 },
		});

		// Should NOT have a tool-call part (which is what currently happens)
		const toolCallParts = uiMessages[0]!.parts.filter(
			(p) => p.type === "tool-call",
		);
		expect(toolCallParts).toHaveLength(0);
	});
	it("sets text field correctly when message has many parts with text part as final part", () => {
		const messages = [
			baseMessageDoc({
				text: "what time is it in paris?",
				message: {
					role: "user",
					content: "what time is it in paris?",
				},
			}),
			baseMessageDoc({
				tool: true,
				finishReason: "tool-calls",
				text: "",
				stepOrder: 1,
				message: {
					role: "assistant",
					content: [
						{
							type: "reasoning",
							text: "**Finding the Time**\n\nI've pinpointed the core task: obtaining the current time in Paris. It involves using the `dateTime` tool. I've identified \"Europe/Paris\" as the necessary timezone identifier to provide to the tool. My next step is to test the tool.\n\n\n",
						},
						{
							args: {
								timezone: "Europe/Paris",
							},
							type: "tool-call",
							toolName: "dateTime",
							toolCallId: "tool_0_dateTime",
						},
					],
				},
				reasoning:
					"**Finding the Time**\n\nI've pinpointed the core task: obtaining the current time in Paris. It involves using the `dateTime` tool. I've identified \"Europe/Paris\" as the necessary timezone identifier to provide to the tool. My next step is to test the tool.\n\n\n",
				reasoningDetails: [
					{
						text: "**Finding the Time**\n\nI've pinpointed the core task: obtaining the current time in Paris. It involves using the `dateTime` tool. I've identified \"Europe/Paris\" as the necessary timezone identifier to provide to the tool. My next step is to test the tool.\n\n\n",
						type: "reasoning",
					},
				],
				warnings: [],
			}),
			baseMessageDoc({
				tool: true,
				stepOrder: 2,
				message: {
					role: "tool",
					content: [
						{
							type: "tool-result",
							toolCallId: "tool_0_dateTime",
							toolName: "dateTime",
							result: {
								type: "json",
								value: {
									day: "20",
									hours: 16,
									minutes: 3,
									month: "August",
									year: "2025",
								},
							},
						},
					],
				},
				sources: [],
			}),
			baseMessageDoc({
				finishReason: "stop",
				text: "The time in Paris, France is 4:03 PM on August 20, 2025.",
				stepOrder: 3,
				message: {
					role: "assistant",
					content: [
						{
							type: "text",
							text: "The time in Paris, France is 4:03 PM on August 20, 2025.",
						},
					],
				},
				reasoningDetails: [],
				sources: [],
				warnings: [],
			}),
		];

		const uiMessages = toUIMessages(messages);

		expect(uiMessages).toHaveLength(2);
		expect(uiMessages[0]!.role).toBe("user");
		expect(uiMessages[0]!.text).toBe("what time is it in paris?");
		expect(uiMessages[1]!.role).toBe("assistant");
		expect(uiMessages[1]!.text).toBe(
			"The time in Paris, France is 4:03 PM on August 20, 2025.",
		);
	});

	it("handles messages in reverse order (assistant response, then tool response, then tool call)", () => {
		const messages = [
			// Final assistant response comes first (stepOrder 3) - no tool flag since it's the final message
			baseMessageDoc({
				_id: "msg3",
				order: 1,
				stepOrder: 3,
				finishReason: "stop",
				text: "The result is 42.",
				tool: false, // This is the final message without tool calls
				message: {
					role: "assistant",
					content: [
						{
							type: "text",
							text: "The result is 42.",
						},
					],
				},
			}),
			// Tool result comes second (stepOrder 2)
			baseMessageDoc({
				_id: "msg2",
				order: 1,
				stepOrder: 2,
				tool: true,
				message: {
					role: "tool",
					content: [
						{
							type: "tool-result",
							toolCallId: "call1",
							toolName: "calculator",
							output: {
								type: "text",
								value: "42",
							},
						},
					],
				},
			}),
			// Tool call comes last (stepOrder 1)
			baseMessageDoc({
				_id: "msg1",
				order: 1,
				stepOrder: 1,
				tool: true,
				text: "",
				message: {
					role: "assistant",
					content: [
						{
							type: "tool-call",
							toolName: "calculator",
							toolCallId: "call1",
							args: { operation: "add", a: 40, b: 2 },
						},
					],
				},
			}),
		];

		const uiMessages = toUIMessages(messages);

		expect(uiMessages).toHaveLength(1);
		expect(uiMessages[0]!.role).toBe("assistant");

		// Should concatenate text from all messages (only the final response has text)
		expect(uiMessages[0]!.text).toBe("The result is 42.");

		// Should use first message's fields (msg1 with stepOrder 1)
		expect(uiMessages[0]!.id).toBe("msg1");
		expect(uiMessages[0]!.order).toBe(1);
		expect(uiMessages[0]!.stepOrder).toBe(1);

		// Should have both tool call and result parts
		const toolParts = uiMessages[0]!.parts.filter(
			(p) => p.type === "tool-calculator",
		);
		expect(toolParts).toHaveLength(1);
		expect(toolParts[0]!).toMatchObject({
			type: "tool-calculator",
			toolCallId: "call1",
			state: "output-available",
			input: { operation: "add", a: 40, b: 2 },
			output: "42",
		});

		// Should also have text part
		const textParts = uiMessages[0]!.parts.filter((p) => p.type === "text");
		expect(textParts).toHaveLength(1);
		expect(textParts[0]!.text).toBe("The result is 42.");
	});
});
