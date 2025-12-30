import { describe, it, expect } from "vitest";
import { combineUIMessages } from "./UIMessages";

describe("combineUIMessages", () => {
	it("combines messages spanning two pages correctly", () => {
		const message1 = {
			id: "msg1",
			key: "msg1-key",
			_creationTime: Date.now(),
			order: 1,
			stepOrder: 1,
			status: "success" as const,
			role: "assistant" as const,
			text: "",
			parts: [
				{
					type: "dynamic-tool" as const,
					state: "input-available" as const,
					toolCallId: "call_123",
					toolName: "calculator",
					input: { operation: "add", a: 2, b: 3 },
				},
			],
		};

		const message2 = {
			id: "msg2",
			key: "msg2-key",
			_creationTime: Date.now() + 1,
			order: 1,
			stepOrder: 2,
			status: "success" as const,
			role: "assistant" as const,
			text: "The result is 5.",
			parts: [
				{
					type: "tool-calculator" as const,
					state: "output-available" as const,
					toolCallId: "call_123",
					input: { operation: "add", a: 2, b: 3 },
					output: { result: 5 },
				},
				{
					type: "text" as const,
					text: "The result is 5.",
					state: "done" as const,
				},
			],
		};

		const combined = combineUIMessages([message1, message2]);

		expect(combined).toHaveLength(1);
		expect(combined[0]!.role).toBe("assistant");
		expect(combined[0]!.text).toBe("The result is 5.");
		expect(combined[0]!.parts).toHaveLength(2);

		const toolPart = combined[0]!.parts.find(
			(p) => p.type === "tool-calculator",
		);
		expect(toolPart).toMatchObject({
			type: "tool-calculator",
			state: "output-available",
			toolCallId: "call_123",
			input: { operation: "add", a: 2, b: 3 },
			output: { result: 5 },
		});

		const textPart = combined[0]!.parts.find((p) => p.type === "text");
		expect(textPart).toMatchObject({
			type: "text",
			text: "The result is 5.",
			state: "done",
		});
	});

	it("preserves separate messages with different roles", () => {
		const userMessage = {
			id: "user1",
			key: "user1-key",
			_creationTime: Date.now(),
			order: 1,
			stepOrder: 0,
			status: "success" as const,
			role: "user" as const,
			text: "Calculate 2 + 3",
			parts: [{ type: "text" as const, text: "Calculate 2 + 3" }],
		};

		const assistantMessage = {
			id: "assistant1",
			key: "assistant1-key",
			_creationTime: Date.now() + 1,
			order: 2,
			stepOrder: 0,
			status: "success" as const,
			role: "assistant" as const,
			text: "The result is 5.",
			parts: [
				{
					type: "text" as const,
					text: "The result is 5.",
					state: "done" as const,
				},
			],
		};

		const combined = combineUIMessages([userMessage, assistantMessage]);

		expect(combined).toHaveLength(2);
		expect(combined[0]!).toEqual(userMessage);
		expect(combined[1]!).toEqual(assistantMessage);
	});

	it("combines multiple tool calls across pages", () => {
		const message1 = {
			id: "msg1",
			key: "msg1-key",
			_creationTime: Date.now(),
			order: 1,
			stepOrder: 1,
			status: "success" as const,
			role: "assistant" as const,
			text: "",
			parts: [
				{
					type: "dynamic-tool" as const,
					state: "input-available" as const,
					toolCallId: "call_1",
					toolName: "calculator",
					input: { operation: "add", a: 2, b: 3 },
				},
				{
					type: "dynamic-tool" as const,
					state: "input-available" as const,
					toolCallId: "call_2",
					toolName: "formatter",
					input: { text: "result" },
				},
			],
		};

		const message2 = {
			id: "msg2",
			key: "msg2-key",
			_creationTime: Date.now() + 1,
			order: 1,
			stepOrder: 2,
			status: "success" as const,
			role: "assistant" as const,
			text: "The formatted result is: 5",
			parts: [
				{
					type: "tool-calculator" as const,
					state: "output-available" as const,
					toolCallId: "call_1",
					input: { operation: "add", a: 2, b: 3 },
					output: { result: 5 },
				},
				{
					type: "tool-formatter" as const,
					state: "output-available" as const,
					toolCallId: "call_2",
					input: { text: "result" },
					output: { formatted: "The formatted result is: 5" },
				},
				{
					type: "text" as const,
					text: "The formatted result is: 5",
					state: "done" as const,
				},
			],
		};

		const combined = combineUIMessages([message1, message2]);

		expect(combined).toHaveLength(1);
		expect(combined[0]!.role).toBe("assistant");
		expect(combined[0]!.text).toBe("The formatted result is: 5");
		expect(combined[0]!.parts).toHaveLength(3);

		const calculatorPart = combined[0]!.parts.find(
			(p) =>
				p.type === "tool-calculator" &&
				"toolCallId" in p &&
				p.toolCallId === "call_1",
		);
		expect(calculatorPart).toMatchObject({
			type: "tool-calculator",
			state: "output-available",
			toolCallId: "call_1",
			input: { operation: "add", a: 2, b: 3 },
			output: { result: 5 },
		});

		const formatterPart = combined[0]!.parts.find(
			(p) =>
				p.type === "tool-formatter" &&
				"toolCallId" in p &&
				p.toolCallId === "call_2",
		);
		expect(formatterPart).toMatchObject({
			type: "tool-formatter",
			state: "output-available",
			toolCallId: "call_2",
			input: { text: "result" },
			output: { formatted: "The formatted result is: 5" },
		});
	});

	it("handles tool call without corresponding output", () => {
		const message1 = {
			id: "msg1",
			key: "msg1-key",
			_creationTime: Date.now(),
			order: 1,
			stepOrder: 1,
			status: "success" as const,
			role: "assistant" as const,
			text: "",
			parts: [
				{
					type: "dynamic-tool" as const,
					state: "input-available" as const,
					toolCallId: "call_orphan",
					toolName: "calculator",
					input: { operation: "add", a: 2, b: 3 },
				},
			],
		};

		const message2 = {
			id: "msg2",
			key: "msg2-key",
			_creationTime: Date.now() + 1,
			order: 1,
			stepOrder: 2,
			status: "success" as const,
			role: "assistant" as const,
			text: "Still processing...",
			parts: [
				{
					type: "text" as const,
					text: "Still processing...",
					state: "done" as const,
				},
			],
		};

		const combined = combineUIMessages([message1, message2]);

		expect(combined).toHaveLength(1);
		expect(combined[0]!.role).toBe("assistant");
		expect(combined[0]!.text).toBe("Still processing...");
		expect(combined[0]!.parts).toHaveLength(2);

		const toolPart = combined[0]!.parts.find((p) => p.type === "dynamic-tool");
		expect(toolPart).toMatchObject({
			type: "dynamic-tool",
			state: "input-available",
			toolCallId: "call_orphan",
			toolName: "calculator",
			input: { operation: "add", a: 2, b: 3 },
		});

		const textPart = combined[0]!.parts.find((p) => p.type === "text");
		expect(textPart).toMatchObject({
			type: "text",
			text: "Still processing...",
			state: "done",
		});
	});
});
