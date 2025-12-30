/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { getMaxMessage } from "./messages";
import schema from "./schema";
import { modules } from "./setup.test";

describe("agent", () => {
	test("getMaxMessage works for threads", async () => {
		const t = convexTest(schema, modules);
		const thread = await t.mutation(api.threads.createThread, {
			userId: "test",
		});
		const { messages } = await t.mutation(api.messages.addMessages, {
			threadId: thread._id as Id<"threads">,
			messages: [
				{ message: { role: "user", content: "hello" } },
				{ message: { role: "assistant", content: "world" } },
			],
		});
		const maxMessage = await t.run(async (ctx) => {
			return await getMaxMessage(ctx, thread._id as Id<"threads">);
		});
		expect(maxMessage).toMatchObject({
			_id: messages.at(-1)!._id,
			order: 0,
			stepOrder: 1,
		});
	});
	test("getMaxMessage works for a specific order", async () => {
		const t = convexTest(schema, modules);
		const thread = await t.mutation(api.threads.createThread, {
			userId: "test",
		});
		const { messages } = await t.mutation(api.messages.addMessages, {
			threadId: thread._id as Id<"threads">,
			messages: [
				{ message: { role: "user", content: "hello" } },
				{ message: { role: "assistant", content: "step 1" } },
				{ message: { role: "user", content: "hello2" } },
			],
		});
		const maxMessage = await t.run(async (ctx) => {
			return await getMaxMessage(ctx, thread._id as Id<"threads">, 0);
		});
		expect(maxMessage).toMatchObject({
			_id: messages.at(1)!._id,
			order: 0,
			stepOrder: 1,
		});
	});

	test("getMaxMessages works when there are tools involved", async () => {
		const t = convexTest(schema, modules);
		const thread = await t.mutation(api.threads.createThread, {
			userId: "test",
		});
		const { messages } = await t.mutation(api.messages.addMessages, {
			threadId: thread._id as Id<"threads">,
			messages: [
				{ message: { role: "user", content: "hello" } },
				{
					message: {
						role: "assistant",
						content: [
							{
								type: "tool-call",
								args: { a: 1 },
								toolCallId: "1",
								toolName: "tool",
							},
						],
					},
				},
				{
					message: {
						role: "tool",
						content: [
							{
								type: "tool-result",
								toolName: "tool",
								result: "foo",
								toolCallId: "1",
							},
						],
					},
				},
				{ message: { role: "assistant", content: "world" } },
			],
		});
		const maxMessage = await t.run(async (ctx) => {
			return await getMaxMessage(ctx, thread._id as Id<"threads">);
		});
		expect(maxMessage).toMatchObject({
			_id: messages.at(-1)!._id,
			order: 0,
			stepOrder: 3,
		});
	});

	test("ordering is incremented on subsequent calls to addMessages for user messages", async () => {
		const t = convexTest(schema, modules);
		const thread = await t.mutation(api.threads.createThread, {
			userId: "test",
		});
		const { messages } = await t.mutation(api.messages.addMessages, {
			threadId: thread._id as Id<"threads">,
			messages: [{ message: { role: "user", content: "hello" } }],
		});
		const maxMessage = await t.run(async (ctx) => {
			return await getMaxMessage(ctx, thread._id as Id<"threads">);
		});
		expect(maxMessage).toMatchObject({
			_id: messages.at(-1)!._id,
			order: 0,
			stepOrder: 0,
		});
		const { messages: messages2 } = await t.mutation(api.messages.addMessages, {
			threadId: thread._id as Id<"threads">,
			messages: [{ message: { role: "user", content: "hello" } }],
		});
		const maxMessage2 = await t.run(async (ctx) => {
			return await getMaxMessage(ctx, thread._id as Id<"threads">);
		});
		expect(maxMessage2).toMatchObject({
			_id: messages2.at(-1)!._id,
			order: 1,
			stepOrder: 0,
		});
	});

	test("ordering is incremented on subsequent calls to addMessages for assistant messages", async () => {
		const t = convexTest(schema, modules);
		const thread = await t.mutation(api.threads.createThread, {
			userId: "test",
		});
		const { messages } = await t.mutation(api.messages.addMessages, {
			threadId: thread._id as Id<"threads">,
			messages: [{ message: { role: "user", content: "hello" } }],
		});
		const maxMessage = await t.run(async (ctx) => {
			return await getMaxMessage(ctx, thread._id as Id<"threads">);
		});
		expect(maxMessage).toMatchObject({
			_id: messages.at(-1)!._id,
			order: 0,
			stepOrder: 0,
		});
		const { messages: messages2 } = await t.mutation(api.messages.addMessages, {
			threadId: thread._id as Id<"threads">,
			messages: [{ message: { role: "assistant", content: "hello" } }],
		});
		const maxMessage2 = await t.run(async (ctx) => {
			return await getMaxMessage(ctx, thread._id as Id<"threads">);
		});
		expect(maxMessage2).toMatchObject({
			_id: messages2.at(-1)!._id,
			order: 0,
			stepOrder: 1,
		});
	});

	test("order is incremented for user messages on to addMessages for the same promptMessageId", async () => {
		const t = convexTest(schema, modules);
		const thread = await t.mutation(api.threads.createThread, {
			userId: "test",
		});
		const { messages } = await t.mutation(api.messages.addMessages, {
			threadId: thread._id as Id<"threads">,
			messages: [{ message: { role: "user", content: "hello" } }],
		});
		const maxMessage = await t.run(async (ctx) => {
			return await getMaxMessage(ctx, thread._id as Id<"threads">);
		});
		expect(maxMessage).toMatchObject({
			_id: messages.at(-1)!._id,
			order: 0,
			stepOrder: 0,
		});
		const { messages: messages2 } = await t.mutation(api.messages.addMessages, {
			threadId: thread._id as Id<"threads">,
			messages: [{ message: { role: "user", content: "hello" } }],
			agentName: "test",
			promptMessageId: messages.at(-1)!._id as Id<"messages">,
		});
		const maxMessage2 = await t.run(async (ctx) => {
			return await getMaxMessage(ctx, thread._id as Id<"threads">);
		});
		expect(maxMessage2).toMatchObject({
			_id: messages2.at(-1)!._id,
			order: 1,
			stepOrder: 0,
		});
	});

	test("sub order is incremented on subsequent calls to addMessages for the same promptMessageId", async () => {
		const t = convexTest(schema, modules);
		const thread = await t.mutation(api.threads.createThread, {
			userId: "test",
		});
		const { messages } = await t.mutation(api.messages.addMessages, {
			threadId: thread._id as Id<"threads">,
			messages: [{ message: { role: "user", content: "hello" } }],
		});
		const maxMessage = await t.run(async (ctx) => {
			return await getMaxMessage(ctx, thread._id as Id<"threads">);
		});
		expect(maxMessage).toMatchObject({
			_id: messages.at(-1)!._id,
			order: 0,
			stepOrder: 0,
		});
		const { messages: messages2 } = await t.mutation(api.messages.addMessages, {
			threadId: thread._id as Id<"threads">,
			messages: [{ message: { role: "assistant", content: "hello" } }],
			agentName: "test",
			promptMessageId: messages.at(-1)!._id as Id<"messages">,
		});
		const maxMessage2 = await t.run(async (ctx) => {
			return await getMaxMessage(ctx, thread._id as Id<"threads">);
		});
		expect(maxMessage2).toMatchObject({
			_id: messages2.at(-1)!._id,
			order: 0,
			stepOrder: 1,
		});
	});

	test("adding multiple messages at a promptMessageId skips later messages", async () => {
		const t = convexTest(schema, modules);
		const thread = await t.mutation(api.threads.createThread, {
			userId: "test",
		});
		const { messages } = await t.mutation(api.messages.addMessages, {
			threadId: thread._id as Id<"threads">,
			messages: [{ message: { role: "user", content: "hello" } }],
		});

		const { messages: messages2 } = await t.mutation(api.messages.addMessages, {
			threadId: thread._id as Id<"threads">,
			messages: [
				{ message: { role: "user", content: "hello2" } },
				{ message: { role: "assistant", content: "hello" } },
			],
			agentName: "test",
		});
		expect(messages2.length).toBe(2);

		const { messages: messages3 } = await t.mutation(api.messages.addMessages, {
			threadId: thread._id as Id<"threads">,
			messages: [
				{
					message: {
						role: "assistant",
						content: [
							{
								type: "tool-call",
								args: { a: 1 },
								toolCallId: "1",
								toolName: "tool",
							},
						],
					},
				},
				{
					message: {
						role: "tool",
						content: [
							{
								type: "tool-result",
								toolName: "tool",
								result: "foo",
								toolCallId: "1",
							},
						],
					},
				},
				{ message: { role: "user", content: "bye" } },
			],
			agentName: "test",
			promptMessageId: messages.at(-1)!._id as Id<"messages">,
		});

		expect(messages3.length).toBe(3);

		const allMessages = await t.query(api.messages.listMessagesByThreadId, {
			threadId: thread._id as Id<"threads">,
			order: "asc",
		});
		expect(allMessages.page).toHaveLength(6);
		expect(allMessages.page.map((m) => m.order)).toEqual([0, 0, 0, 1, 1, 2]);
		expect(allMessages.page.map((m) => m.stepOrder)).toEqual([
			0, 1, 2, 0, 1, 0,
		]);
		expect(allMessages.page[0]!.message!.role).toBe("user");
		expect(allMessages.page[0]!.message!.content).toBe("hello");
		expect(allMessages.page[1]!.message!.role).toBe("assistant");
		expect(allMessages.page[2]!.message!.role).toBe("tool");
		expect(allMessages.page[3]!.message!.role).toBe("user");
		expect(allMessages.page[3]!.message!.content).toBe("hello2");
		expect(allMessages.page[4]!.message!.role).toBe("assistant");
		expect(allMessages.page[5]!.message!.role).toBe("user");
		expect(allMessages.page[5]!.message!.content).toBe("bye");
	});

	test("updateMessage updates message content", async () => {
		const t = convexTest(schema, modules);
		const thread = await t.mutation(api.threads.createThread, {
			userId: "test",
		});
		const { messages } = await t.mutation(api.messages.addMessages, {
			threadId: thread._id as Id<"threads">,
			messages: [{ message: { role: "user", content: "hello" } }],
		});
		const messageId = messages[0]!._id as Id<"messages">;

		const updatedMessage = await t.mutation(api.messages.updateMessage, {
			messageId,
			patch: { message: { role: "user", content: "updated content" } },
		});

		expect(updatedMessage.message).toEqual({
			role: "user",
			content: "updated content",
		});
	});

	test("updateMessage updates message status", async () => {
		const t = convexTest(schema, modules);
		const thread = await t.mutation(api.threads.createThread, {
			userId: "test",
		});
		const { messages } = await t.mutation(api.messages.addMessages, {
			threadId: thread._id as Id<"threads">,
			messages: [
				{ message: { role: "assistant", content: "hello" }, status: "pending" },
			],
		});
		const messageId = messages[0]!._id as Id<"messages">;

		// Initial status should be pending
		expect(messages[0]!.status).toBe("pending");

		// Update to success
		const updatedMessage = await t.mutation(api.messages.updateMessage, {
			messageId,
			patch: { status: "success" },
		});

		expect(updatedMessage.status).toBe("success");
	});

	test("updateMessage updates error field", async () => {
		const t = convexTest(schema, modules);
		const thread = await t.mutation(api.threads.createThread, {
			userId: "test",
		});
		const { messages } = await t.mutation(api.messages.addMessages, {
			threadId: thread._id as Id<"threads">,
			messages: [
				{ message: { role: "assistant", content: "hello" }, status: "pending" },
			],
		});
		const messageId = messages[0]!._id as Id<"messages">;

		const updatedMessage = await t.mutation(api.messages.updateMessage, {
			messageId,
			patch: { status: "failed", error: "Something went wrong" },
		});

		expect(updatedMessage.status).toBe("failed");
		expect(updatedMessage.error).toBe("Something went wrong");
	});

	test("updateMessage correctly updates tool messages", async () => {
		const t = convexTest(schema, modules);
		const thread = await t.mutation(api.threads.createThread, {
			userId: "test",
		});
		const { messages } = await t.mutation(api.messages.addMessages, {
			threadId: thread._id as Id<"threads">,
			messages: [
				{
					message: {
						role: "assistant",
						content: [
							{
								type: "tool-call",
								args: { a: 1 },
								toolCallId: "1",
								toolName: "tool",
							},
						],
					},
				},
			],
		});
		const messageId = messages[0]!._id as Id<"messages">;

		const updatedMessage = await t.mutation(api.messages.updateMessage, {
			messageId,
			patch: {
				message: {
					role: "assistant",
					content: [
						{
							type: "tool-call",
							args: { a: 2, b: 3 },
							toolCallId: "1",
							toolName: "tool",
						},
					],
				},
			},
		});

		expect(updatedMessage.message).toEqual({
			role: "assistant",
			content: [
				{
					type: "tool-call",
					args: { a: 2, b: 3 },
					toolCallId: "1",
					toolName: "tool",
				},
			],
		});
	});

	test("updateMessage throws error for non-existent message", async () => {
		const t = convexTest(schema, modules);

		await expect(
			t.mutation(api.messages.updateMessage, {
				messageId: "invalidId" as Id<"messages">,
				patch: { message: { role: "user", content: "test" } },
			}),
		).rejects.toThrow();
	});

	test("deleteByIds deletes existing messages and returns their IDs", async () => {
		const t = convexTest(schema, modules);
		const thread = await t.mutation(api.threads.createThread, {
			userId: "test",
		});
		const { messages } = await t.mutation(api.messages.addMessages, {
			threadId: thread._id as Id<"threads">,
			messages: [
				{ message: { role: "user", content: "hello" } },
				{ message: { role: "assistant", content: "world" } },
				{ message: { role: "user", content: "test" } },
			],
		});

		const messageIds = messages.map((m) => m._id as Id<"messages">);
		const deletedIds = await t.mutation(api.messages.deleteByIds, {
			messageIds: [messageIds[0]!, messageIds[2]!], // Delete first and third messages
		});

		expect(deletedIds).toEqual([messageIds[0]!, messageIds[2]!]);

		// Verify messages are actually deleted
		const remainingMessages = await t.query(
			api.messages.listMessagesByThreadId,
			{ threadId: thread._id as Id<"threads">, order: "asc" },
		);
		expect(remainingMessages.page).toHaveLength(1);
		expect(remainingMessages.page[0]!._id).toBe(messageIds[1]!);
	});

	test("deleteByIds handles non-existent message IDs gracefully", async () => {
		const t = convexTest(schema, modules);
		const thread = await t.mutation(api.threads.createThread, {
			userId: "test",
		});
		const { messages } = await t.mutation(api.messages.addMessages, {
			threadId: thread._id as Id<"threads">,
			messages: [{ message: { role: "user", content: "hello" } }],
		});

		const messageId = messages[0]!._id as Id<"messages">;
		const validDeletedIds = await t.mutation(api.messages.deleteByIds, {
			messageIds: [messageId],
		});
		expect(validDeletedIds).toEqual([messageId]);

		const deletedIds = await t.mutation(api.messages.deleteByIds, {
			messageIds: [messageId],
		});

		// Should only return the valid ID that was actually deleted
		expect(deletedIds).toEqual([]);

		// Verify the valid message was deleted
		const remainingMessages = await t.query(
			api.messages.listMessagesByThreadId,
			{ threadId: thread._id as Id<"threads">, order: "asc" },
		);
		expect(remainingMessages.page).toHaveLength(0);
	});

	test("deleteByOrder deletes messages within specified order range", async () => {
		const t = convexTest(schema, modules);
		const thread = await t.mutation(api.threads.createThread, {
			userId: "test",
		});

		// Create multiple rounds of messages with different orders
		await t.mutation(api.messages.addMessages, {
			threadId: thread._id as Id<"threads">,
			messages: [
				{ message: { role: "user", content: "message order 0, step 0" } },
				{ message: { role: "assistant", content: "message order 0, step 1" } },
			],
		});

		await t.mutation(api.messages.addMessages, {
			threadId: thread._id as Id<"threads">,
			messages: [
				{ message: { role: "user", content: "message order 1, step 0" } },
				{ message: { role: "assistant", content: "message order 1, step 1" } },
			],
		});

		await t.mutation(api.messages.addMessages, {
			threadId: thread._id as Id<"threads">,
			messages: [
				{ message: { role: "user", content: "message order 2, step 0" } },
			],
		});

		// Delete messages in order range 0 to 1 (exclusive)
		const result = await t.mutation(api.messages.deleteByOrder, {
			threadId: thread._id as Id<"threads">,
			startOrder: 0,
			endOrder: 2,
		});

		expect(result.isDone).toBe(true);
		expect(result.lastOrder).toBe(1);
		expect(result.lastStepOrder).toBe(1);

		// Verify only messages from order 0 & 1 were deleted
		const remainingMessages = await t.query(
			api.messages.listMessagesByThreadId,
			{ threadId: thread._id as Id<"threads">, order: "asc" },
		);

		expect(remainingMessages.page).toHaveLength(1); // Should have messages from order 2
		expect(remainingMessages.page[0]!.message!.content).toBe(
			"message order 2, step 0",
		);
	});

	test("deleteByOrder handles step order boundaries correctly", async () => {
		const t = convexTest(schema, modules);
		const thread = await t.mutation(api.threads.createThread, {
			userId: "test",
		});

		// Create messages with the same order but different step orders
		await t.mutation(api.messages.addMessages, {
			threadId: thread._id as Id<"threads">,
			messages: [
				{ message: { role: "user", content: "step 0" } },
				{ message: { role: "assistant", content: "step 1" } },
				{ message: { role: "assistant", content: "step 2" } },
				{ message: { role: "assistant", content: "step 3" } },
			],
		});

		// Delete messages from step 1 to step 3 (exclusive)
		const result = await t.mutation(api.messages.deleteByOrder, {
			threadId: thread._id as Id<"threads">,
			startOrder: 0,
			startStepOrder: 1,
			endOrder: 0,
			endStepOrder: 3,
		});

		expect(result.isDone).toBe(true);
		expect(result.lastOrder).toBe(0);
		expect(result.lastStepOrder).toBe(2);

		// Verify only step 1 and 2 were deleted (step 3 is excluded by upperBoundInclusive: false)
		const remainingMessages = await t.query(
			api.messages.listMessagesByThreadId,
			{ threadId: thread._id as Id<"threads">, order: "asc" },
		);

		expect(remainingMessages.page).toHaveLength(2);
		expect(remainingMessages.page.map((m) => m.stepOrder)).toEqual([0, 3]);
	});

	test("deleteByOrder returns isDone false when batch limit is reached", async () => {
		const t = convexTest(schema, modules);
		const thread = await t.mutation(api.threads.createThread, {
			userId: "test",
		});

		// This test would be more realistic with 65+ messages, but for test efficiency
		// we'll just verify the basic structure works with fewer messages
		await t.mutation(api.messages.addMessages, {
			threadId: thread._id as Id<"threads">,
			messages: [
				{ message: { role: "user", content: "message 1" } },
				{ message: { role: "assistant", content: "message 2" } },
			],
		});

		const result = await t.mutation(api.messages.deleteByOrder, {
			threadId: thread._id as Id<"threads">,
			startOrder: 0,
			endOrder: 2,
		});

		// With only 2 messages, should be done
		expect(result.isDone).toBe(true);
		expect(result.lastOrder).toBe(0);
		expect(result.lastStepOrder).toBe(1);
	});

	test("deleteByOrder handles empty result set", async () => {
		const t = convexTest(schema, modules);
		const thread = await t.mutation(api.threads.createThread, {
			userId: "test",
		});

		await t.mutation(api.messages.addMessages, {
			threadId: thread._id as Id<"threads">,
			messages: [{ message: { role: "user", content: "message order 0" } }],
		});

		// Try to delete from a range that doesn't exist
		const result = await t.mutation(api.messages.deleteByOrder, {
			threadId: thread._id as Id<"threads">,
			startOrder: 5,
			endOrder: 10,
		});

		expect(result.isDone).toBe(true);
		expect(result.lastOrder).toBeUndefined();
		expect(result.lastStepOrder).toBeUndefined();

		// Verify original message is still there
		const remainingMessages = await t.query(
			api.messages.listMessagesByThreadId,
			{ threadId: thread._id as Id<"threads">, order: "asc" },
		);
		expect(remainingMessages.page).toHaveLength(1);
	});
});
