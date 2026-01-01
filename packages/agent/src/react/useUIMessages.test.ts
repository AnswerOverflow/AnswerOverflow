import { describe, it, expect } from "vitest";
import { dedupeMessages } from "./useUIMessages";

type TestMessage = {
	order: number;
	stepOrder: number;
	status: "pending" | "success" | "failed" | "streaming";
	role: "user" | "assistant" | "system";
	id: string;
};

const user = (
	props: Omit<TestMessage, "role">,
): TestMessage => ({ ...props, role: "user" });

const assistant = (
	props: Omit<TestMessage, "role">,
): TestMessage => ({ ...props, role: "assistant" });

describe("dedupeMessages", () => {
	it("should prefer messages from messages list when streaming messages are absent", () => {
		const messages: TestMessage[] = [
			user({ order: 1, stepOrder: 0, status: "success", id: "msg1" }),
			assistant({ order: 2, stepOrder: 0, status: "success", id: "msg2" }),
		];
		const streamMessages: TestMessage[] = [];

		const result = dedupeMessages(messages, streamMessages);

		expect(result).toHaveLength(2);
		expect(result).toEqual(messages);
	});

	it("should prefer streaming messages when messages list is empty", () => {
		const messages: TestMessage[] = [];
		const streamMessages: TestMessage[] = [
			user({ order: 1, stepOrder: 0, status: "streaming", id: "stream1" }),
			assistant({ order: 2, stepOrder: 0, status: "streaming", id: "stream2" }),
		];

		const result = dedupeMessages(messages, streamMessages);

		expect(result).toHaveLength(2);
		expect(result).toEqual(streamMessages);
	});

	it("should prefer non-pending messages over pending messages", () => {
		const messages: TestMessage[] = [
			user({ order: 1, stepOrder: 0, status: "pending", id: "pending1" }),
			assistant({ order: 2, stepOrder: 0, status: "success", id: "success1" }),
		];
		const streamMessages: TestMessage[] = [
			user({ order: 1, stepOrder: 0, status: "success", id: "finalized1" }),
			assistant({ order: 2, stepOrder: 0, status: "streaming", id: "streaming1" }),
		];

		const result = dedupeMessages(messages, streamMessages);

		expect(result).toHaveLength(2);
		expect(result[0]!).toEqual(
			user({ order: 1, stepOrder: 0, status: "success", id: "finalized1" }),
		);
		expect(result[1]!).toEqual(
			assistant({ order: 2, stepOrder: 0, status: "success", id: "success1" }),
		);
	});

	it("should prefer streaming over pending messages", () => {
		const messages: TestMessage[] = [
			user({ order: 1, stepOrder: 0, status: "pending", id: "pending1" }),
		];
		const streamMessages: TestMessage[] = [
			user({ order: 1, stepOrder: 0, status: "streaming", id: "streaming1" }),
		];

		const result = dedupeMessages(messages, streamMessages);

		expect(result).toHaveLength(1);
		expect(result[0]!).toEqual(
			user({ order: 1, stepOrder: 0, status: "streaming", id: "streaming1" }),
		);
	});

	it("should prefer non-pending messages from messages list over streaming messages", () => {
		const messages: TestMessage[] = [
			assistant({ order: 1, stepOrder: 0, status: "success", id: "success1" }),
		];
		const streamMessages: TestMessage[] = [
			assistant({ order: 1, stepOrder: 0, status: "streaming", id: "streaming1" }),
		];

		const result = dedupeMessages(messages, streamMessages);

		expect(result).toHaveLength(1);
		expect(result[0]!).toEqual(
			assistant({ order: 1, stepOrder: 0, status: "success", id: "success1" }),
		);
	});

	it("should handle complex scenarios with multiple duplicates", () => {
		const messages: TestMessage[] = [
			user({ order: 1, stepOrder: 0, status: "pending", id: "pending1" }),
			assistant({ order: 2, stepOrder: 0, status: "success", id: "success2" }),
			assistant({ order: 3, stepOrder: 0, status: "failed", id: "failed3" }),
			assistant({ order: 4, stepOrder: 0, status: "success", id: "success4" }),
		];
		const streamMessages: TestMessage[] = [
			user({ order: 1, stepOrder: 0, status: "streaming", id: "streaming1" }),
			assistant({ order: 2, stepOrder: 0, status: "streaming", id: "streaming2" }),
			assistant({ order: 5, stepOrder: 0, status: "streaming", id: "streaming5" }),
		];

		const result = dedupeMessages(messages, streamMessages);

		expect(result).toHaveLength(5);
		expect(result[0]!).toEqual(
			user({ order: 1, stepOrder: 0, status: "streaming", id: "streaming1" }),
		);
		expect(result[1]!).toEqual(
			assistant({ order: 2, stepOrder: 0, status: "success", id: "success2" }),
		);
		expect(result[2]!).toEqual(
			assistant({ order: 3, stepOrder: 0, status: "failed", id: "failed3" }),
		);
		expect(result[3]!).toEqual(
			assistant({ order: 4, stepOrder: 0, status: "success", id: "success4" }),
		);
		expect(result[4]!).toEqual(
			assistant({ order: 5, stepOrder: 0, status: "streaming", id: "streaming5" }),
		);
	});

	it("should handle different stepOrder values correctly for user messages", () => {
		const messages: TestMessage[] = [
			user({ order: 1, stepOrder: 0, status: "pending", id: "pending1-0" }),
			user({ order: 1, stepOrder: 1, status: "success", id: "success1-1" }),
		];
		const streamMessages: TestMessage[] = [
			user({ order: 1, stepOrder: 0, status: "streaming", id: "streaming1-0" }),
			user({ order: 1, stepOrder: 2, status: "streaming", id: "streaming1-2" }),
		];

		const result = dedupeMessages(messages, streamMessages);

		expect(result).toHaveLength(3);
		expect(result[0]!).toEqual(
			user({ order: 1, stepOrder: 0, status: "streaming", id: "streaming1-0" }),
		);
		expect(result[1]!).toEqual(
			user({ order: 1, stepOrder: 1, status: "success", id: "success1-1" }),
		);
		expect(result[2]!).toEqual(
			user({ order: 1, stepOrder: 2, status: "streaming", id: "streaming1-2" }),
		);
	});

	it("should maintain proper sorting by order and stepOrder", () => {
		const messages: TestMessage[] = [
			assistant({ order: 3, stepOrder: 0, status: "success", id: "msg3" }),
			user({ order: 1, stepOrder: 1, status: "success", id: "msg1-1" }),
			user({ order: 1, stepOrder: 0, status: "pending", id: "msg1-0" }),
		];
		const streamMessages: TestMessage[] = [
			assistant({ order: 2, stepOrder: 0, status: "streaming", id: "stream2" }),
			user({ order: 1, stepOrder: 0, status: "streaming", id: "stream1-0" }),
		];

		const result = dedupeMessages(messages, streamMessages);

		expect(result).toHaveLength(4);
		expect(result[0]!).toEqual(
			user({ order: 1, stepOrder: 0, status: "streaming", id: "stream1-0" }),
		);
		expect(result[1]!).toEqual(
			user({ order: 1, stepOrder: 1, status: "success", id: "msg1-1" }),
		);
		expect(result[2]!).toEqual(
			assistant({ order: 2, stepOrder: 0, status: "streaming", id: "stream2" }),
		);
		expect(result[3]!).toEqual(
			assistant({ order: 3, stepOrder: 0, status: "success", id: "msg3" }),
		);
	});

	it("should handle empty arrays", () => {
		const result = dedupeMessages([], []);
		expect(result).toEqual([]);
	});

	it("should demonstrate order dependency when messages and streamMessages have same order/stepOrder", () => {
		const messages: TestMessage[] = [
			user({ order: 1, stepOrder: 0, status: "success", id: "messages-success" }),
		];
		const streamMessages: TestMessage[] = [
			user({ order: 1, stepOrder: 0, status: "success", id: "stream-success" }),
		];

		const result = dedupeMessages(messages, streamMessages);

		expect(result).toHaveLength(1);
		expect(result[0]!.id).toBe("messages-success");
	});

	it("should dedupe assistant messages by order only, ignoring stepOrder", () => {
		const messages: TestMessage[] = [
			user({ order: 0, stepOrder: 0, status: "success", id: "user-msg" }),
			assistant({ order: 0, stepOrder: 1, status: "success", id: "combined-assistant" }),
		];
		const streamMessages: TestMessage[] = [
			assistant({ order: 0, stepOrder: 53, status: "streaming", id: "streaming-assistant" }),
		];

		const result = dedupeMessages(messages, streamMessages);

		expect(result).toHaveLength(2);
		expect(result[0]!).toEqual(
			user({ order: 0, stepOrder: 0, status: "success", id: "user-msg" }),
		);
		expect(result[1]!).toEqual(
			assistant({ order: 0, stepOrder: 1, status: "success", id: "combined-assistant" }),
		);
	});

	it("should dedupe assistant messages with different stepOrders when both are streaming/pending", () => {
		const messages: TestMessage[] = [
			user({ order: 0, stepOrder: 0, status: "success", id: "user-msg" }),
			assistant({ order: 0, stepOrder: 1, status: "pending", id: "pending-assistant" }),
		];
		const streamMessages: TestMessage[] = [
			assistant({ order: 0, stepOrder: 53, status: "streaming", id: "streaming-assistant" }),
		];

		const result = dedupeMessages(messages, streamMessages);

		expect(result).toHaveLength(2);
		expect(result[0]!).toEqual(
			user({ order: 0, stepOrder: 0, status: "success", id: "user-msg" }),
		);
		expect(result[1]!).toEqual(
			assistant({ order: 0, stepOrder: 53, status: "streaming", id: "streaming-assistant" }),
		);
	});

	it("should NOT dedupe user messages with different stepOrders", () => {
		const messages: TestMessage[] = [
			user({ order: 0, stepOrder: 0, status: "success", id: "user-msg-0" }),
			user({ order: 0, stepOrder: 1, status: "success", id: "user-msg-1" }),
		];
		const streamMessages: TestMessage[] = [];

		const result = dedupeMessages(messages, streamMessages);

		expect(result).toHaveLength(2);
		expect(result[0]!.id).toBe("user-msg-0");
		expect(result[1]!.id).toBe("user-msg-1");
	});

	it("should handle pagination split scenario - assistant messages across pages", () => {
		const messages: TestMessage[] = [
			user({ order: 0, stepOrder: 0, status: "success", id: "user-prompt" }),
			assistant({ order: 0, stepOrder: 1, status: "success", id: "page1-assistant" }),
			assistant({ order: 0, stepOrder: 25, status: "success", id: "page2-assistant" }),
		];
		const streamMessages: TestMessage[] = [
			assistant({ order: 0, stepOrder: 50, status: "streaming", id: "streaming-final" }),
		];

		const result = dedupeMessages(messages, streamMessages);

		expect(result).toHaveLength(2);
		expect(result[0]!).toEqual(
			user({ order: 0, stepOrder: 0, status: "success", id: "user-prompt" }),
		);
		expect(result[1]!).toEqual(
			assistant({ order: 0, stepOrder: 1, status: "success", id: "page1-assistant" }),
		);
	});
});
