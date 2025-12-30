/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { describe, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";
import { modules } from "./setup.test";

describe("threads", () => {
	test("createThread creates a thread with correct data", async () => {
		const t = convexTest(schema, modules);

		const thread = await t.mutation(api.threads.createThread, {
			userId: "testUser",
			title: "Test Thread",
			summary: "A test thread",
		});

		expect(thread.userId).toBe("testUser");
		expect(thread.title).toBe("Test Thread");
		expect(thread.summary).toBe("A test thread");
		expect(thread.status).toBe("active");
		expect(thread._id).toBeTruthy();
		expect(thread._creationTime).toBeTruthy();
	});

	test("getThread returns thread data", async () => {
		const t = convexTest(schema, modules);

		const created = await t.mutation(api.threads.createThread, {
			userId: "getUser",
			title: "Get Thread",
		});

		const fetched = await t.query(api.threads.getThread, {
			threadId: created._id as Id<"threads">,
		});

		expect(fetched).not.toBeNull();
		expect(fetched!._id).toBe(created._id);
		expect(fetched!.userId).toBe("getUser");
		expect(fetched!.title).toBe("Get Thread");
	});

	test("getThread returns null for non-existent thread", async () => {
		const t = convexTest(schema, modules);

		// Create a thread, then delete it to get a valid but non-existent ID
		const thread = await t.mutation(api.threads.createThread, {
			userId: "tempUser",
			title: "Temp Thread",
		});

		// Delete the thread so it no longer exists
		await t.action(api.threads.deleteAllForThreadIdSync, {
			threadId: thread._id as Id<"threads">,
		});

		// Now test with the deleted thread's ID
		const result = await t.query(api.threads.getThread, {
			threadId: thread._id as Id<"threads">,
		});

		expect(result).toBeNull();
	});

	test("listThreadsByUserId returns threads for user", async () => {
		const t = convexTest(schema, modules);

		// Create threads for different users
		const thread1 = await t.mutation(api.threads.createThread, {
			userId: "listUser",
			title: "Thread 1",
		});
		const thread2 = await t.mutation(api.threads.createThread, {
			userId: "listUser",
			title: "Thread 2",
		});
		const thread3 = await t.mutation(api.threads.createThread, {
			userId: "otherUser",
			title: "Other Thread",
		});

		const result = await t.query(api.threads.listThreadsByUserId, {
			userId: "listUser",
		});

		expect(result.page).toHaveLength(2);
		expect(result.page.map((t) => t._id)).toContain(thread1._id);
		expect(result.page.map((t) => t._id)).toContain(thread2._id);
		expect(result.page.map((t) => t._id)).not.toContain(thread3._id);
	});

	test("listThreadsByUserId pagination works", async () => {
		const t = convexTest(schema, modules);

		// Create multiple threads
		const threads = [];
		for (let i = 0; i < 5; i++) {
			const thread = await t.mutation(api.threads.createThread, {
				userId: "paginationUser",
				title: `Thread ${i}`,
			});
			threads.push(thread);
		}

		const firstPage = await t.query(api.threads.listThreadsByUserId, {
			userId: "paginationUser",
			paginationOpts: { cursor: null, numItems: 2 },
		});

		expect(firstPage.page).toHaveLength(2);
		expect(firstPage.isDone).toBe(false);

		const secondPage = await t.query(api.threads.listThreadsByUserId, {
			userId: "paginationUser",
			paginationOpts: { cursor: firstPage.continueCursor, numItems: 2 },
		});

		expect(secondPage.page).toHaveLength(2);
		// Should not have duplicate threads
		const firstPageIds = firstPage.page.map((t) => t._id);
		const secondPageIds = secondPage.page.map((t) => t._id);
		expect(firstPageIds.every((id) => !secondPageIds.includes(id))).toBe(true);
	});

	test("listThreadsByUserId ordering works", async () => {
		const t = convexTest(schema, modules);

		// Create threads with slight delays to ensure different creation times
		const thread1 = await t.mutation(api.threads.createThread, {
			userId: "orderUser",
			title: "First Thread",
		});

		// Small delay to ensure different creation times
		await new Promise((resolve) => setTimeout(resolve, 1));

		const thread2 = await t.mutation(api.threads.createThread, {
			userId: "orderUser",
			title: "Second Thread",
		});

		// Test descending order (default)
		const descResult = await t.query(api.threads.listThreadsByUserId, {
			userId: "orderUser",
			order: "desc",
		});

		expect(descResult.page[0]!._id).toBe(thread2._id);
		expect(descResult.page[1]!._id).toBe(thread1._id);

		// Test ascending order
		const ascResult = await t.query(api.threads.listThreadsByUserId, {
			userId: "orderUser",
			order: "asc",
		});

		expect(ascResult.page[0]!._id).toBe(thread1._id);
		expect(ascResult.page[1]!._id).toBe(thread2._id);
	});

	test("updateThread updates thread fields", async () => {
		const t = convexTest(schema, modules);

		const thread = await t.mutation(api.threads.createThread, {
			userId: "updateUser",
			title: "Original Title",
			summary: "Original Summary",
		});

		const updated = await t.mutation(api.threads.updateThread, {
			threadId: thread._id as Id<"threads">,
			patch: {
				title: "Updated Title",
				summary: "Updated Summary",
				status: "archived",
			},
		});

		expect(updated.title).toBe("Updated Title");
		expect(updated.summary).toBe("Updated Summary");
		expect(updated.status).toBe("archived");
		expect(updated._id).toBe(thread._id);
	});

	test("updateThread with partial patch works", async () => {
		const t = convexTest(schema, modules);

		const thread = await t.mutation(api.threads.createThread, {
			userId: "partialUser",
			title: "Original Title",
			summary: "Original Summary",
		});

		const updated = await t.mutation(api.threads.updateThread, {
			threadId: thread._id as Id<"threads">,
			patch: {
				title: "New Title Only",
			},
		});

		expect(updated.title).toBe("New Title Only");
		expect(updated.summary).toBe("Original Summary"); // Unchanged
		expect(updated.status).toBe("active"); // Unchanged
	});

	test("updateThread throws error for non-existent thread", async () => {
		const t = convexTest(schema, modules);

		// Create a thread, then delete it to get a valid but non-existent ID
		const thread = await t.mutation(api.threads.createThread, {
			userId: "tempUser",
			title: "Temp Thread",
		});

		// Delete the thread so it no longer exists
		await t.action(api.threads.deleteAllForThreadIdSync, {
			threadId: thread._id as Id<"threads">,
		});

		// Now test updating the deleted thread
		await expect(
			t.mutation(api.threads.updateThread, {
				threadId: thread._id as Id<"threads">,
				patch: { title: "New Title" },
			}),
		).rejects.toThrow();
	});

	test("deleteAllForThreadIdSync deletes thread and all related data", async () => {
		const t = convexTest(schema, modules);

		// Create a thread with messages
		const thread = await t.mutation(api.threads.createThread, {
			userId: "deleteUser",
			title: "Thread to Delete",
		});

		// Add messages to the thread
		await t.mutation(api.messages.addMessages, {
			threadId: thread._id as Id<"threads">,
			messages: [
				{ message: { role: "user" as const, content: "Hello" } },
				{ message: { role: "assistant" as const, content: "Hi there" } },
				{ message: { role: "user" as const, content: "How are you?" } },
			],
		});

		// Verify data exists before deletion
		const beforeMessages = await t.query(api.messages.listMessagesByThreadId, {
			threadId: thread._id as Id<"threads">,
			order: "desc",
			paginationOpts: { cursor: null, numItems: 10 },
		});
		expect(beforeMessages.page).toHaveLength(3);

		const beforeThread = await t.query(api.threads.getThread, {
			threadId: thread._id as Id<"threads">,
		});
		expect(beforeThread).not.toBeNull();

		// Delete the thread synchronously
		await t.action(api.threads.deleteAllForThreadIdSync, {
			threadId: thread._id as Id<"threads">,
		});

		// Verify thread is deleted
		const afterThread = await t.query(api.threads.getThread, {
			threadId: thread._id as Id<"threads">,
		});
		expect(afterThread).toBeNull();

		// Verify messages are deleted (this will return empty page since thread is gone)
		const afterMessages = await t.query(api.messages.listMessagesByThreadId, {
			threadId: thread._id as Id<"threads">,
			order: "desc",
			paginationOpts: { cursor: null, numItems: 10 },
		});
		expect(afterMessages.page).toHaveLength(0);
	});

	test("deleteAllForThreadIdAsync deletes thread asynchronously", async () => {
		// Enable fake timers for scheduled function testing
		vi.useFakeTimers();

		const t = convexTest(schema, modules);

		// Create a thread with messages
		const thread = await t.mutation(api.threads.createThread, {
			userId: "asyncDeleteUser",
			title: "Async Thread to Delete",
		});

		await t.mutation(api.messages.addMessages, {
			threadId: thread._id as Id<"threads">,
			messages: Array.from({ length: 100 }, (_, i) => ({
				message: { role: "user" as const, content: `Message ${i}` },
			})),
		});

		// Start async deletion
		const result = await t.mutation(api.threads.deleteAllForThreadIdAsync, {
			threadId: thread._id as Id<"threads">,
		});

		// If there's more work to do, advance timers and wait for scheduled functions
		if (!result.isDone) {
			// Run all pending timers to trigger scheduled functions
			vi.runAllTimers();

			// Wait for all scheduled functions to complete
			await t.finishInProgressScheduledFunctions();
		}

		// Verify thread is deleted
		const afterThread = await t.query(api.threads.getThread, {
			threadId: thread._id as Id<"threads">,
		});
		expect(afterThread).toBeNull();

		// Verify streams are deleted
		const afterStreams = await t.query(api.streams.list, {
			threadId: thread._id as Id<"threads">,
		});
		expect(afterStreams).toHaveLength(0);

		// Reset to normal timers
		vi.useRealTimers();
	});

	test("deletePageForThreadId handles pagination correctly", async () => {
		const t = convexTest(schema, modules);

		// Create a thread with many messages to test pagination
		const thread = await t.mutation(api.threads.createThread, {
			userId: "paginationDeleteUser",
			title: "Pagination Delete Thread",
		});

		// Add many messages to force pagination
		const messages = [];
		for (let i = 0; i < 150; i++) {
			messages.push({
				message: { role: "user" as const, content: `Message ${i}` },
			});
		}
		await t.mutation(api.messages.addMessages, {
			threadId: thread._id as Id<"threads">,
			messages,
		});

		// Delete first page
		const result1 = await t.mutation(internal.threads._deletePageForThreadId, {
			threadId: thread._id as Id<"threads">,
		});

		expect(result1.isDone).toBe(false);
		expect(result1.cursor).toBeTruthy();

		// Continue deleting pages until done
		let currentResult = result1;
		let iterations = 0;
		while (!currentResult.isDone && iterations < 10) {
			currentResult = await t.mutation(
				internal.threads._deletePageForThreadId,
				{
					threadId: thread._id as Id<"threads">,
					cursor: currentResult.cursor,
				},
			);
			iterations++;
		}

		// Thread should be deleted when done
		expect(currentResult.isDone).toBe(true);
		const afterThread = await t.query(api.threads.getThread, {
			threadId: thread._id as Id<"threads">,
		});
		expect(afterThread).toBeNull();
	});

	test("deletePageForThreadId with custom limit works", async () => {
		const t = convexTest(schema, modules);

		// Create a thread with messages
		const thread = await t.mutation(api.threads.createThread, {
			userId: "limitUser",
			title: "Limit Test Thread",
		});

		// Add messages
		const messages = [];
		for (let i = 0; i < 50; i++) {
			messages.push({
				message: { role: "user" as const, content: `Message ${i}` },
			});
		}
		await t.mutation(api.messages.addMessages, {
			threadId: thread._id as Id<"threads">,
			messages,
		});

		// Delete with custom limit
		const result = await t.mutation(internal.threads._deletePageForThreadId, {
			threadId: thread._id as Id<"threads">,
			limit: 25,
		});

		// Should still have messages left with this limit
		expect(result.isDone).toBe(false);
		expect(result.cursor).toBeTruthy();
	});

	test("deleteAllForThreadIdAsync with multiple scheduled iterations", async () => {
		// Enable fake timers for scheduled function testing
		vi.useFakeTimers();

		const t = convexTest(schema, modules);

		// Create a thread with many messages to force multiple scheduling iterations
		const thread = await t.mutation(api.threads.createThread, {
			userId: "multiIterDeleteUser",
			title: "Multi Iter Delete Thread",
		});

		// Add many messages to force pagination and multiple scheduled iterations
		const messages = [];
		for (let i = 0; i < 300; i++) {
			messages.push({
				message: { role: "user" as const, content: `Message ${i}` },
			});
		}
		await t.mutation(api.messages.addMessages, {
			threadId: thread._id as Id<"threads">,
			messages,
		});

		// Start async deletion
		const result = await t.mutation(api.threads.deleteAllForThreadIdAsync, {
			threadId: thread._id as Id<"threads">,
		});

		// Should not be done immediately with this many messages
		expect(result.isDone).toBe(false);

		// Use finishAllScheduledFunctions to handle recursive scheduling
		await t.finishAllScheduledFunctions(vi.runAllTimers);

		// Verify thread is deleted
		const afterThread = await t.query(api.threads.getThread, {
			threadId: thread._id as Id<"threads">,
		});
		expect(afterThread).toBeNull();

		// Reset to normal timers
		vi.useRealTimers();
	});

	test("deleteAllForThreadIdSync handles thread with no messages", async () => {
		const t = convexTest(schema, modules);

		// Create a thread with no messages
		const thread = await t.mutation(api.threads.createThread, {
			userId: "emptyUser",
			title: "Empty Thread",
		});

		// Delete should work without errors
		await expect(
			t.action(api.threads.deleteAllForThreadIdSync, {
				threadId: thread._id as Id<"threads">,
			}),
		).resolves.not.toThrow();

		// Thread should be deleted
		const afterThread = await t.query(api.threads.getThread, {
			threadId: thread._id as Id<"threads">,
		});
		expect(afterThread).toBeNull();
	});

	test("deleteAllForThreadIdSync handles non-existent thread", async () => {
		const t = convexTest(schema, modules);

		// Create a thread, then delete it to get a valid but non-existent ID
		const thread = await t.mutation(api.threads.createThread, {
			userId: "tempUser",
			title: "Temp Thread",
		});

		// Delete the thread so it no longer exists
		await t.action(api.threads.deleteAllForThreadIdSync, {
			threadId: thread._id as Id<"threads">,
		});

		// Try to delete the already-deleted thread - should not throw
		await expect(
			t.action(api.threads.deleteAllForThreadIdSync, {
				threadId: thread._id as Id<"threads">,
			}),
		).resolves.not.toThrow();
	});

	test("thread creation sets status to active by default", async () => {
		const t = convexTest(schema, modules);

		const thread = await t.mutation(api.threads.createThread, {
			userId: "statusUser",
			title: "Status Test Thread",
		});

		expect(thread.status).toBe("active");
	});

	test("multiple threads for same user work correctly", async () => {
		const t = convexTest(schema, modules);

		const threads = [];
		for (let i = 0; i < 3; i++) {
			const thread = await t.mutation(api.threads.createThread, {
				userId: "multiThreadUser",
				title: `Thread ${i + 1}`,
			});
			threads.push(thread);
		}

		const result = await t.query(api.threads.listThreadsByUserId, {
			userId: "multiThreadUser",
		});

		expect(result.page).toHaveLength(3);
		expect(result.page.map((t) => t.title)).toContain("Thread 1");
		expect(result.page.map((t) => t.title)).toContain("Thread 2");
		expect(result.page.map((t) => t.title)).toContain("Thread 3");
	});

	test("threads with different users are isolated", async () => {
		const t = convexTest(schema, modules);

		const thread1 = await t.mutation(api.threads.createThread, {
			userId: "user1",
			title: "User 1 Thread",
		});

		const thread2 = await t.mutation(api.threads.createThread, {
			userId: "user2",
			title: "User 2 Thread",
		});

		const user1Threads = await t.query(api.threads.listThreadsByUserId, {
			userId: "user1",
		});

		const user2Threads = await t.query(api.threads.listThreadsByUserId, {
			userId: "user2",
		});

		expect(user1Threads.page).toHaveLength(1);
		expect(user1Threads.page[0]!._id).toBe(thread1._id);

		expect(user2Threads.page).toHaveLength(1);
		expect(user2Threads.page[0]!._id).toBe(thread2._id);
	});
});
