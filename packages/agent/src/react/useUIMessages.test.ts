import { describe, it, expect } from "vitest";
import { dedupeMessages } from "./useUIMessages.js";

type TestMessage = {
	order: number;
	stepOrder: number;
	status: "pending" | "success" | "failed" | "streaming";
	id: string;
};

describe("dedupeMessages", () => {
	it("should prefer messages from messages list when streaming messages are absent", () => {
		const messages: TestMessage[] = [
			{ order: 1, stepOrder: 0, status: "success", id: "msg1" },
			{ order: 2, stepOrder: 0, status: "success", id: "msg2" },
		];
		const streamMessages: TestMessage[] = [];

		const result = dedupeMessages(messages, streamMessages);

		expect(result).toHaveLength(2);
		expect(result).toEqual(messages);
	});

	it("should prefer streaming messages when messages list is empty", () => {
		const messages: TestMessage[] = [];
		const streamMessages: TestMessage[] = [
			{ order: 1, stepOrder: 0, status: "streaming", id: "stream1" },
			{ order: 2, stepOrder: 0, status: "streaming", id: "stream2" },
		];

		const result = dedupeMessages(messages, streamMessages);

		expect(result).toHaveLength(2);
		expect(result).toEqual(streamMessages);
	});

	it("should prefer non-pending messages over pending messages", () => {
		const messages: TestMessage[] = [
			{ order: 1, stepOrder: 0, status: "pending", id: "pending1" },
			{ order: 2, stepOrder: 0, status: "success", id: "success1" },
		];
		const streamMessages: TestMessage[] = [
			{ order: 1, stepOrder: 0, status: "success", id: "finalized1" },
			{ order: 2, stepOrder: 0, status: "streaming", id: "streaming1" },
		];

		const result = dedupeMessages(messages, streamMessages);

		expect(result).toHaveLength(2);
		expect(result[0]!).toEqual({
			order: 1,
			stepOrder: 0,
			status: "success",
			id: "finalized1",
		});
		expect(result[1]!).toEqual({
			order: 2,
			stepOrder: 0,
			status: "success",
			id: "success1",
		});
	});

	it("should prefer streaming over pending messages", () => {
		const messages: TestMessage[] = [
			{ order: 1, stepOrder: 0, status: "pending", id: "pending1" },
		];
		const streamMessages: TestMessage[] = [
			{ order: 1, stepOrder: 0, status: "streaming", id: "streaming1" },
		];

		const result = dedupeMessages(messages, streamMessages);

		expect(result).toHaveLength(1);
		expect(result[0]!).toEqual({
			order: 1,
			stepOrder: 0,
			status: "streaming",
			id: "streaming1",
		});
	});

	it("should prefer non-pending messages from messages list over streaming messages", () => {
		const messages: TestMessage[] = [
			{ order: 1, stepOrder: 0, status: "success", id: "success1" },
		];
		const streamMessages: TestMessage[] = [
			{ order: 1, stepOrder: 0, status: "streaming", id: "streaming1" },
		];

		const result = dedupeMessages(messages, streamMessages);

		expect(result).toHaveLength(1);
		expect(result[0]!).toEqual({
			order: 1,
			stepOrder: 0,
			status: "success",
			id: "success1",
		});
	});

	it("should handle complex scenarios with multiple duplicates", () => {
		const messages: TestMessage[] = [
			{ order: 1, stepOrder: 0, status: "pending", id: "pending1" },
			{ order: 2, stepOrder: 0, status: "success", id: "success2" },
			{ order: 3, stepOrder: 0, status: "failed", id: "failed3" },
			{ order: 4, stepOrder: 0, status: "success", id: "success4" },
		];
		const streamMessages: TestMessage[] = [
			{ order: 1, stepOrder: 0, status: "streaming", id: "streaming1" },
			{ order: 2, stepOrder: 0, status: "streaming", id: "streaming2" },
			{ order: 5, stepOrder: 0, status: "streaming", id: "streaming5" },
		];

		const result = dedupeMessages(messages, streamMessages);

		expect(result).toHaveLength(5);
		// Order 1: streaming should replace pending
		expect(result[0]!).toEqual({
			order: 1,
			stepOrder: 0,
			status: "streaming",
			id: "streaming1",
		});
		// Order 2: success should be kept over streaming
		expect(result[1]!).toEqual({
			order: 2,
			stepOrder: 0,
			status: "success",
			id: "success2",
		});
		// Order 3: failed should be kept (no streaming equivalent)
		expect(result[2]!).toEqual({
			order: 3,
			stepOrder: 0,
			status: "failed",
			id: "failed3",
		});
		// Order 4: success should be kept (no streaming equivalent)
		expect(result[3]!).toEqual({
			order: 4,
			stepOrder: 0,
			status: "success",
			id: "success4",
		});
		// Order 5: streaming should be added (no messages equivalent)
		expect(result[4]!).toEqual({
			order: 5,
			stepOrder: 0,
			status: "streaming",
			id: "streaming5",
		});
	});

	it("should handle different stepOrder values correctly", () => {
		const messages: TestMessage[] = [
			{ order: 1, stepOrder: 0, status: "pending", id: "pending1-0" },
			{ order: 1, stepOrder: 1, status: "success", id: "success1-1" },
		];
		const streamMessages: TestMessage[] = [
			{ order: 1, stepOrder: 0, status: "streaming", id: "streaming1-0" },
			{ order: 1, stepOrder: 2, status: "streaming", id: "streaming1-2" },
		];

		const result = dedupeMessages(messages, streamMessages);

		expect(result).toHaveLength(3);
		// Order 1, stepOrder 0: streaming should replace pending
		expect(result[0]!).toEqual({
			order: 1,
			stepOrder: 0,
			status: "streaming",
			id: "streaming1-0",
		});
		// Order 1, stepOrder 1: success should be kept
		expect(result[1]!).toEqual({
			order: 1,
			stepOrder: 1,
			status: "success",
			id: "success1-1",
		});
		// Order 1, stepOrder 2: streaming should be added
		expect(result[2]!).toEqual({
			order: 1,
			stepOrder: 2,
			status: "streaming",
			id: "streaming1-2",
		});
	});

	it("should maintain proper sorting by order and stepOrder", () => {
		const messages: TestMessage[] = [
			{ order: 3, stepOrder: 0, status: "success", id: "msg3" },
			{ order: 1, stepOrder: 1, status: "success", id: "msg1-1" },
			{ order: 1, stepOrder: 0, status: "pending", id: "msg1-0" },
		];
		const streamMessages: TestMessage[] = [
			{ order: 2, stepOrder: 0, status: "streaming", id: "stream2" },
			{ order: 1, stepOrder: 0, status: "streaming", id: "stream1-0" },
		];

		const result = dedupeMessages(messages, streamMessages);

		expect(result).toHaveLength(4);
		// Should be sorted by order, then stepOrder
		expect(result[0]!).toEqual({
			order: 1,
			stepOrder: 0,
			status: "streaming",
			id: "stream1-0",
		});
		expect(result[1]!).toEqual({
			order: 1,
			stepOrder: 1,
			status: "success",
			id: "msg1-1",
		});
		expect(result[2]!).toEqual({
			order: 2,
			stepOrder: 0,
			status: "streaming",
			id: "stream2",
		});
		expect(result[3]!).toEqual({
			order: 3,
			stepOrder: 0,
			status: "success",
			id: "msg3",
		});
	});

	it("should handle empty arrays", () => {
		const result = dedupeMessages([], []);
		expect(result).toEqual([]);
	});

	it("should demonstrate order dependency when messages and streamMessages have same order/stepOrder", () => {
		// This test shows that the current implementation doesn't guarantee
		// which message wins when they have the same order/stepOrder and status
		const messages: TestMessage[] = [
			{ order: 1, stepOrder: 0, status: "success", id: "messages-success" },
		];
		const streamMessages: TestMessage[] = [
			{ order: 1, stepOrder: 0, status: "success", id: "stream-success" },
		];

		const result = dedupeMessages(messages, streamMessages);

		expect(result).toHaveLength(1);
		// The result depends on which array comes first in messages.concat(streamMessages)
		// Since messages comes first, it should win when both have same status
		expect(result[0]!.id).toBe("messages-success");
	});
});
