import {
	describe,
	it,
	expect,
	vi,
	beforeEach,
	type MockedFunction,
} from "vitest";
import type { ModelMessage } from "ai";
import {
	defineSchema,
	type Auth,
	type StorageActionWriter,
	type StorageReader,
} from "convex/server";
import type { MessageDoc } from "../validators";
import type { ActionCtx, QueryCtx } from "./types";
import {
	fetchContextWithPrompt,
	fetchContextMessages,
	filterOutOrphanedToolMessages,
	getPromptArray,
} from "./search";
import { components, initConvexTest } from "./setup.test";
import { createThread } from "./threads";
import { saveMessages } from "./messages";

// Helper to create mock MessageDoc
const createMockMessageDoc = (
	id: string,
	role: "user" | "assistant" | "tool" | "system",
	content: any,
	order: number = 1,
): MessageDoc => ({
	_id: id,
	_creationTime: Date.now(),
	userId: "test-user",
	threadId: "test-thread",
	order,
	stepOrder: order,
	status: "success",
	tool: false,
	message: { role, content },
});

const schema = defineSchema({});

describe("search.ts", () => {
	let t = initConvexTest(schema);
	let mockCtx: ActionCtx;
	let ctx: ActionCtx;

	// Shared helper functions
	async function createTestThread(userId: string) {
		return await t.run(async (mutCtx) => {
			return await createThread(mutCtx, components.agent, {
				userId,
			});
		});
	}

	async function createTestMessages(
		threadId: string,
		userId: string,
		messages: Array<{
			role: "user" | "assistant";
			content: string;
			order: number;
		}>,
	) {
		await t.run(async (mutCtx) => {
			await saveMessages(mutCtx, components.agent, {
				threadId,
				userId,
				messages: messages.map((msg) => ({
					role: msg.role,
					content: msg.content,
				})),
				metadata: messages.map((msg) => ({
					order: msg.order,
					stepOrder: msg.order,
					status: "success" as const,
				})),
			});
		});
	}

	beforeEach(() => {
		vi.clearAllMocks();
		t = initConvexTest(schema);
		ctx = {
			runQuery: t.query,
			runAction: t.action,
			runMutation: t.mutation,
		} as ActionCtx;

		mockCtx = {
			runQuery: vi.fn(),
			runAction: vi.fn(),
			runMutation: vi.fn(),
			auth: {} as Auth,
			storage: {} as StorageActionWriter,
		} satisfies ActionCtx;

		// Mock process.env to avoid file inlining in tests
		process.env.CONVEX_CLOUD_URL = "https://example.convex.cloud";
	});

	describe("getPromptArray", () => {
		it("should return empty array for undefined prompt", () => {
			expect(getPromptArray(undefined)).toEqual([]);
		});

		it("should return array as-is for array prompt", () => {
			const prompt: ModelMessage[] = [
				{ role: "user", content: "Hello" },
				{ role: "assistant", content: "Hi there!" },
			];
			expect(getPromptArray(prompt)).toEqual(prompt);
		});

		it("should convert string prompt to user message", () => {
			const prompt = "Hello world";
			expect(getPromptArray(prompt)).toEqual([
				{ role: "user", content: "Hello world" },
			]);
		});
	});

	describe("filterOutOrphanedToolMessages", () => {
		it("should keep non-tool messages", () => {
			const messages: MessageDoc[] = [
				{
					_id: "1",
					message: { role: "user", content: "Hello" },
					order: 1,
				} as MessageDoc,
				{
					_id: "2",
					message: { role: "assistant", content: "Hi!" },
					order: 2,
				} as MessageDoc,
			];

			const result = filterOutOrphanedToolMessages(messages);
			expect(result).toHaveLength(2);
			expect(result).toEqual(messages);
		});

		it("should keep tool messages with corresponding tool calls", () => {
			const messages: MessageDoc[] = [
				{
					_id: "1",
					message: {
						role: "assistant",
						content: [
							{ type: "text", text: "I'll help you with that" },
							{
								type: "tool-call",
								toolCallId: "call_123",
								toolName: "test",
								args: {},
							},
						],
					},
					order: 1,
				} as MessageDoc,
				{
					_id: "2",
					message: {
						role: "tool",
						content: [
							{
								type: "tool-result",
								toolCallId: "call_123",
								result: "success",
							},
						],
					},
					order: 2,
				} as MessageDoc,
			];

			const result = filterOutOrphanedToolMessages(messages);
			expect(result).toHaveLength(2);
			expect(result).toEqual(messages);
		});

		it("should filter out orphaned tool messages", () => {
			const messages: MessageDoc[] = [
				{
					_id: "0",
					message: { role: "user", content: "Hello" },
					order: 1,
				} as MessageDoc,
				{
					_id: "1",
					message: {
						role: "assistant",
						content: [
							{
								type: "tool-call",
								toolCallId: "call_orphaned",
								toolName: "test",
								args: {},
							},
						],
					},
					order: 1,
				} as MessageDoc,
				{
					_id: "2",
					message: {
						role: "tool",
						content: [
							{
								type: "tool-result",
								toolCallId: "result_orphaned",
								result: "orphaned",
							},
						],
					},
					order: 2,
				} as MessageDoc,
				{
					_id: "3",
					message: { role: "assistant", content: "I'll help you with that" },
					order: 1,
				} as MessageDoc,
			];

			const result = filterOutOrphanedToolMessages(messages);
			expect(result).toHaveLength(2);
			expect(result[0]!._id).toBe("0");
			expect(result[1]!._id).toBe("3");
		});
	});

	describe("fetchContextMessages", () => {
		it("should throw error if neither userId nor threadId provided", async () => {
			await expect(
				fetchContextMessages(mockCtx, components.agent, {
					userId: undefined,
					threadId: undefined,
					contextOptions: {},
				}),
			).rejects.toThrow("Specify userId or threadId");
		});

		it("should fetch recent messages when threadId provided", async () => {
			const mockPage = [
				createMockMessageDoc("2", "assistant", "Hi!", 2),
				createMockMessageDoc("1", "user", "Hello", 1),
			];

			(
				mockCtx.runQuery as MockedFunction<ActionCtx["runQuery"]>
			).mockResolvedValue({
				page: mockPage,
			});

			const result = await fetchContextMessages(mockCtx, components.agent, {
				userId: undefined,
				threadId: "thread123",
				contextOptions: { recentMessages: 10 },
			});

			expect(mockCtx.runQuery).toHaveBeenCalledWith(expect.anything(), {
				threadId: "thread123",
				paginationOpts: { numItems: 10, cursor: null },
				order: "desc",
				excludeToolMessages: undefined,
				statuses: ["success"],
				upToAndIncludingMessageId: undefined,
			});

			expect(result.length).toBe(2);
			expect(result[0]!._id).toBe("1"); // Should be reversed back to asc order
			expect(result[1]!._id).toBe("2");
		});

		it("should skip recent messages when recentMessages is 0", async () => {
			const result = await fetchContextMessages(mockCtx, components.agent, {
				userId: "user123",
				threadId: "thread123",
				contextOptions: { recentMessages: 0 },
			});

			expect(mockCtx.runQuery).not.toHaveBeenCalled();
			expect(result).toEqual([]);
		});

		it("should perform search when searchOptions provided", async () => {
			const searchResults = [
				createMockMessageDoc("search1", "user", "Search result", 0),
			];

			(
				mockCtx.runAction as MockedFunction<ActionCtx["runAction"]>
			).mockResolvedValue(searchResults);

			const result = await fetchContextMessages(mockCtx, components.agent, {
				userId: "user123",
				threadId: "thread123",
				searchText: "test query",
				contextOptions: {
					recentMessages: 0,
					searchOptions: {
						textSearch: true,
						limit: 5,
					},
				},
			});

			expect(result.length).toBe(1);
			expect(result[0]!._id).toBe("search1");
		});

		it("should throw error when trying to search in non-action context", async () => {
			const mockQueryCtx = {
				runQuery: vi.fn().mockResolvedValue({ page: [] }),
				// No runAction method
				storage: {} as StorageReader,
			} as QueryCtx;

			await expect(
				fetchContextMessages(mockQueryCtx, components.agent, {
					userId: "user123",
					threadId: "thread123",
					contextOptions: {
						searchOptions: {
							textSearch: true,
							limit: 5,
						},
					},
				}),
			).rejects.toThrow("searchUserMessages only works in an action");
		});
	});

	describe("fetchContextWithPrompt", () => {
		const baseArgs = {
			userId: "user123",
			threadId: "thread123",
			agentName: "test-agent",
			contextOptions: {},
			usageHandler: undefined,
			callSettings: {},
		};

		beforeEach(() => {
			// Mock fetchContextMessages to return empty array by default
			vi.mocked(mockCtx.runQuery).mockResolvedValue({ page: [] });
			vi.mocked(mockCtx.runAction).mockResolvedValue([]);
		});

		it("should handle string prompt correctly", async () => {
			const result = await fetchContextWithPrompt(mockCtx, components.agent, {
				...baseArgs,
				prompt: "Hello, how are you?",
				messages: undefined,
				promptMessageId: undefined,
			});

			expect(result.messages).toHaveLength(1);
			expect(result.messages[0]!).toEqual({
				role: "user",
				content: "Hello, how are you?",
			});
			expect(result.order).toBeUndefined();
			expect(result.stepOrder).toBeUndefined();
		});

		it("should handle array prompt correctly", async () => {
			const promptMessages: ModelMessage[] = [
				{ role: "user", content: "Hello" },
				{ role: "assistant", content: "Hi there!" },
				{ role: "user", content: "How are you?" },
			];

			const result = await fetchContextWithPrompt(mockCtx, components.agent, {
				...baseArgs,
				prompt: promptMessages,
				messages: undefined,
				promptMessageId: undefined,
			});

			expect(result.messages).toHaveLength(3);
			expect(result.messages).toEqual(promptMessages);
		});

		it("should combine context messages with prompt", async () => {
			const contextMessages: MessageDoc[] = [
				{
					_id: "ctx1",
					message: { role: "user", content: "Context message 1" },
					order: 1,
				} as MessageDoc,
				{
					_id: "ctx2",
					message: { role: "assistant", content: "Context response 1" },
					order: 2,
				} as MessageDoc,
			];

			// Mock the internal fetchContextMessages call
			vi.mocked(mockCtx.runQuery).mockResolvedValue({
				page: [...contextMessages].reverse(),
			});

			const result = await fetchContextWithPrompt(mockCtx, components.agent, {
				...baseArgs,
				prompt: "New prompt",
				messages: undefined,
				promptMessageId: undefined,
				contextOptions: { recentMessages: 10 },
			});

			expect(result.messages).toHaveLength(3);
			expect(result.messages[0]!.content).toBe("Context message 1");
			expect(result.messages[1]!.content).toBe("Context response 1");
			expect(result.messages[2]!).toEqual({
				role: "user",
				content: "New prompt",
			});
		});

		it("should handle input messages correctly", async () => {
			const inputMessages: ModelMessage[] = [
				{ role: "user", content: "Input message 1" },
				{ role: "assistant", content: "Input response 1" },
			];

			const result = await fetchContextWithPrompt(mockCtx, components.agent, {
				...baseArgs,
				prompt: "Final prompt",
				messages: inputMessages,
				promptMessageId: undefined,
			});

			expect(result.messages).toHaveLength(3);
			expect(result.messages[0]!).toEqual(inputMessages[0]!);
			expect(result.messages[1]!).toEqual(inputMessages[1]!);
			expect(result.messages[2]!).toEqual({
				role: "user",
				content: "Final prompt",
			});
		});

		it("should splice prompt messages when promptMessageId provided", async () => {
			const contextMessages: MessageDoc[] = [
				{
					_id: "msg1",
					message: { role: "user", content: "Before prompt" },
					order: 1,
				} as MessageDoc,
				{
					_id: "prompt-msg",
					message: { role: "user", content: "Original prompt" },
					order: 2,
				} as MessageDoc,
				{
					_id: "msg3",
					message: { role: "assistant", content: "After prompt" },
					order: 3,
				} as MessageDoc,
			];

			vi.mocked(mockCtx.runQuery).mockResolvedValue({
				page: [...contextMessages].reverse(),
			});

			const result = await fetchContextWithPrompt(mockCtx, components.agent, {
				...baseArgs,
				prompt: "New replacement prompt",
				messages: undefined,
				promptMessageId: "prompt-msg",
				contextOptions: { recentMessages: 10 },
			});

			expect(result.messages).toHaveLength(3);
			expect(result.messages[0]!.content).toBe("Before prompt");
			expect(result.messages[1]!).toEqual({
				role: "user",
				content: "New replacement prompt",
			});
			expect(result.messages[2]!.content).toBe("After prompt");
			expect(result.order).toBe(2);
		});

		it("should use original prompt message when no new prompt provided", async () => {
			const contextMessages: MessageDoc[] = [
				{
					_id: "msg1",
					message: { role: "user", content: "Before prompt" },
					order: 1,
				} as MessageDoc,
				{
					_id: "prompt-msg",
					message: { role: "user", content: "Original prompt" },
					order: 2,
				} as MessageDoc,
				{
					_id: "msg3",
					message: { role: "assistant", content: "After prompt" },
					order: 3,
				} as MessageDoc,
			];

			vi.mocked(mockCtx.runQuery).mockResolvedValue({
				page: [...contextMessages].reverse(),
			});

			const result = await fetchContextWithPrompt(mockCtx, components.agent, {
				...baseArgs,
				prompt: undefined,
				messages: undefined,
				promptMessageId: "prompt-msg",
				contextOptions: { recentMessages: 10 },
			});

			expect(result.messages).toHaveLength(3);
			expect(result.messages[0]!.content).toBe("Before prompt");
			expect(result.messages[1]!.content).toBe("Original prompt");
			expect(result.messages[2]!.content).toBe("After prompt");
		});

		it("should handle complex message ordering correctly", async () => {
			const contextMessages: MessageDoc[] = [
				{
					_id: "ctx1",
					message: { role: "user", content: "Context 1" },
					order: 1,
				} as MessageDoc,
				{
					_id: "prompt-msg",
					message: { role: "user", content: "Prompt" },
					order: 3,
				} as MessageDoc,
				{
					_id: "ctx2",
					message: { role: "assistant", content: "Context 2" },
					order: 5,
				} as MessageDoc,
			];

			vi.mocked(mockCtx.runQuery).mockResolvedValue({
				page: [...contextMessages].reverse(),
			});

			const inputMessages: ModelMessage[] = [
				{ role: "user", content: "Input message" },
			];

			const result = await fetchContextWithPrompt(mockCtx, components.agent, {
				...baseArgs,
				prompt: "New prompt",
				messages: inputMessages,
				promptMessageId: "prompt-msg",
				contextOptions: { recentMessages: 10 },
			});

			expect(result.messages).toHaveLength(4);
			expect(result.messages[0]!.content).toBe("Context 1"); // Pre-prompt
			expect(result.messages[1]!.content).toBe("Input message"); // Input messages
			expect(result.messages[2]!.content).toBe("New prompt"); // New prompt
			expect(result.messages[3]!.content).toBe("Context 2"); // Post-prompt
		});

		it("should handle empty context and messages", async () => {
			const result = await fetchContextWithPrompt(mockCtx, components.agent, {
				...baseArgs,
				prompt: undefined,
				messages: undefined,
				promptMessageId: undefined,
			});

			expect(result.messages).toHaveLength(0);
			expect(result.order).toBeUndefined();
			expect(result.stepOrder).toBeUndefined();
		});
	});

	describe("fetchContextWithPrompt - Integration Tests", () => {
		const baseArgs = {
			userId: "user123",
			threadId: "thread123",
			agentName: "test-agent",
			contextOptions: {},
			usageHandler: undefined,
			callSettings: {},
		};

		it("should fetch and combine real messages with prompt", async () => {
			const threadId = await createTestThread("user123");

			await createTestMessages(threadId, "user123", [
				{ role: "user", content: "Hello", order: 1 },
				{ role: "assistant", content: "Hi there!", order: 2 },
				{ role: "user", content: "How are you?", order: 3 },
			]);

			const result = await fetchContextWithPrompt(ctx, components.agent, {
				...baseArgs,
				threadId,
				prompt: "What's the weather?",
				messages: undefined,
				promptMessageId: undefined,
				contextOptions: { recentMessages: 10 },
			});

			expect(result.messages).toHaveLength(4);
			expect(result.messages[0]!.content).toBe("Hello");
			expect(result.messages[1]!.content).toBe("Hi there!");
			expect(result.messages[2]!.content).toBe("How are you?");
			expect(result.messages[3]!).toEqual({
				role: "user",
				content: "What's the weather?",
			});
		});

		it("should handle prompt message replacement in real data", async () => {
			const threadId = await createTestThread("user456");

			// Create messages and capture the prompt message ID
			const messages = [
				{ role: "user" as const, content: "Before prompt" },
				{ role: "user" as const, content: "Original prompt" },
				{ role: "assistant" as const, content: "Assistant response" },
			];

			const { messages: savedMessages } = await t.run(async (mutCtx) => {
				return await saveMessages(mutCtx, components.agent, {
					threadId,
					userId: "user456",
					messages: messages.map((msg) => ({
						role: msg.role,
						content: msg.content,
					})),
					metadata: messages.map(() => ({})),
				});
			});

			const promptMessageId = savedMessages[1]!._id; // The prompt message

			const result = await fetchContextWithPrompt(ctx, components.agent, {
				...baseArgs,
				userId: "user456",
				threadId,
				prompt: "New replacement prompt",
				messages: undefined,
				promptMessageId,
				contextOptions: { recentMessages: 10 },
			});

			expect(result.messages).toHaveLength(3);
			expect(result.messages[0]!.content).toBe("Before prompt");
			expect(result.messages[1]!).toEqual({
				role: "user",
				content: "New replacement prompt",
			});
			expect(result.messages[2]!.content).toBe("Assistant response");
			// The prompt is the second user message, each on a new order.
			expect(result.order).toBe(1);
			expect(result.stepOrder).toBe(0);
		});

		it("should combine input messages with context and prompt", async () => {
			const threadId = await createTestThread("user789");

			await createTestMessages(threadId, "user789", [
				{ role: "user", content: "Context message", order: 1 },
				{ role: "assistant", content: "Context response", order: 2 },
			]);

			const inputMessages: ModelMessage[] = [
				{ role: "user", content: "Input message 1" },
				{ role: "user", content: "Input message 2" },
			];

			const result = await fetchContextWithPrompt(ctx, components.agent, {
				...baseArgs,
				userId: "user789",
				threadId,
				prompt: "Final prompt",
				messages: inputMessages,
				promptMessageId: undefined,
				contextOptions: { recentMessages: 10 },
			});

			expect(result.messages).toHaveLength(5);
			expect(result.messages[0]!.content).toBe("Context message");
			expect(result.messages[1]!.content).toBe("Context response");
			expect(result.messages[2]!.content).toBe("Input message 1");
			expect(result.messages[3]!.content).toBe("Input message 2");
			expect(result.messages[4]!).toEqual({
				role: "user",
				content: "Final prompt",
			});
		});

		it("should respect recentMessages limit", async () => {
			const threadId = await createTestThread("user999");

			// Create 5 messages but only fetch the most recent 2
			await createTestMessages(threadId, "user999", [
				{ role: "user", content: "Message 1", order: 1 },
				{ role: "assistant", content: "Response 1", order: 2 },
				{ role: "user", content: "Message 2", order: 3 },
				{ role: "assistant", content: "Response 2", order: 4 },
				{ role: "user", content: "Message 3", order: 5 },
			]);

			const result = await fetchContextWithPrompt(ctx, components.agent, {
				...baseArgs,
				userId: "user999",
				threadId,
				prompt: "New prompt",
				messages: undefined,
				promptMessageId: undefined,
				contextOptions: { recentMessages: 2 }, // Only fetch 2 most recent
			});

			expect(result.messages).toHaveLength(3); // 2 context + 1 prompt
			expect(result.messages[0]!.content).toBe("Response 2"); // 4th message
			expect(result.messages[1]!.content).toBe("Message 3"); // 5th message
			expect(result.messages[2]!).toEqual({
				role: "user",
				content: "New prompt",
			});
		});

		it("should handle empty thread gracefully", async () => {
			const threadId = await createTestThread("user000");

			// Don't create any messages

			const result = await fetchContextWithPrompt(ctx, components.agent, {
				...baseArgs,
				userId: "user000",
				threadId,
				prompt: "Only prompt",
				messages: undefined,
				promptMessageId: undefined,
				contextOptions: { recentMessages: 10 },
			});

			expect(result.messages).toHaveLength(1);
			expect(result.messages[0]!).toEqual({
				role: "user",
				content: "Only prompt",
			});
		});
	});

	describe("fetchContextWithPrompt - contextHandler Tests", () => {
		const baseArgs = {
			userId: "user123",
			threadId: "thread123",
			agentName: "test-agent",
			contextOptions: {},
			usageHandler: undefined,
			callSettings: {},
		};

		it("should use custom contextHandler to reorder messages", async () => {
			const threadId = await createTestThread("userContext");

			await createTestMessages(threadId, "userContext", [
				{ role: "user", content: "Recent message 1", order: 1 },
				{ role: "assistant", content: "Recent response 1", order: 2 },
			]);

			// Create a contextHandler that puts inputMessages first, then inputPrompt, then recent
			const contextHandler = vi.fn(async (ctx, args) => {
				return [
					...args.inputMessages,
					...args.inputPrompt,
					...args.recent,
					...args.search,
					...args.existingResponses,
				];
			});

			const result = await fetchContextWithPrompt(ctx, components.agent, {
				...baseArgs,
				userId: "userContext",
				threadId,
				prompt: "Custom prompt",
				messages: [{ role: "user", content: "Input message" }],
				promptMessageId: undefined,
				contextOptions: { recentMessages: 10 },
				contextHandler,
			});

			// Verify contextHandler was called with correct arguments
			expect(contextHandler).toHaveBeenCalledWith(
				ctx,
				expect.objectContaining({
					search: [], // No search performed in this test
					recent: expect.arrayContaining([
						expect.objectContaining({ content: "Recent message 1" }),
						expect.objectContaining({ content: "Recent response 1" }),
					]),
					inputMessages: expect.arrayContaining([
						expect.objectContaining({ content: "Input message" }),
					]),
					inputPrompt: expect.arrayContaining([
						expect.objectContaining({ content: "Custom prompt" }),
					]),
					existingResponses: [], // No existing responses in this test
					userId: "userContext",
					threadId,
				}),
			);

			// Result should follow the custom order: inputMessages, inputPrompt, recent
			expect(result.messages).toHaveLength(4);
			expect(result.messages[0]!.content).toBe("Input message"); // inputMessages
			expect(result.messages[1]!.content).toBe("Custom prompt"); // inputPrompt
			expect(result.messages[2]!.content).toBe("Recent message 1"); // recent
			expect(result.messages[3]!.content).toBe("Recent response 1"); // recent
		});

		it("should allow contextHandler to filter out messages", async () => {
			const threadId = await createTestThread("userFilter");

			await createTestMessages(threadId, "userFilter", [
				{ role: "user", content: "Keep this message", order: 1 },
				{ role: "assistant", content: "Filter this out", order: 2 },
				{ role: "user", content: "Keep this too", order: 3 },
			]);

			// Create a contextHandler that filters out assistant messages
			const contextHandler = vi.fn(async (ctx, args) => {
				const allMessages = [
					...args.search,
					...args.recent,
					...args.inputMessages,
					...args.inputPrompt,
					...args.existingResponses,
				];

				// Filter out assistant messages
				return allMessages.filter((msg) => msg.role !== "assistant");
			});

			const result = await fetchContextWithPrompt(ctx, components.agent, {
				...baseArgs,
				userId: "userFilter",
				threadId,
				prompt: "Filter prompt",
				messages: undefined,
				promptMessageId: undefined,
				contextOptions: { recentMessages: 10 },
				contextHandler,
			});

			// Should only have user messages and the prompt
			expect(result.messages).toHaveLength(3);
			expect(result.messages[0]!.content).toBe("Keep this message");
			expect(result.messages[1]!.content).toBe("Keep this too");
			expect(result.messages[2]!.content).toBe("Filter prompt");

			// Should not contain the filtered assistant message
			expect(
				result.messages.find((m) => m.content === "Filter this out"),
			).toBeUndefined();
		});

		it("should allow contextHandler to add custom messages", async () => {
			const threadId = await createTestThread("userCustom");

			await createTestMessages(threadId, "userCustom", [
				{ role: "user", content: "Original message", order: 1 },
			]);

			// Create a contextHandler that adds a custom system message
			const contextHandler = vi.fn(async (ctx, args) => {
				const customSystemMessage = {
					role: "system" as const,
					content: "This is a custom system message added by contextHandler",
				};

				return [customSystemMessage, ...args.recent, ...args.inputPrompt];
			});

			const result = await fetchContextWithPrompt(ctx, components.agent, {
				...baseArgs,
				userId: "userCustom",
				threadId,
				prompt: "Test prompt",
				messages: undefined,
				promptMessageId: undefined,
				contextOptions: { recentMessages: 10 },
				contextHandler,
			});

			expect(result.messages).toHaveLength(3);
			expect(result.messages[0]!.role).toBe("system");
			expect(result.messages[0]!.content).toBe(
				"This is a custom system message added by contextHandler",
			);
			expect(result.messages[1]!.content).toBe("Original message");
			expect(result.messages[2]!.content).toBe("Test prompt");
		});

		it("should work with search messages in contextHandler", async () => {
			const threadId = await createTestThread("userSearch");

			// Create multiple messages for search to find
			await createTestMessages(threadId, "userSearch", [
				{ role: "user", content: "Searchable content about cats", order: 1 },
				{ role: "assistant", content: "Response about cats", order: 2 },
				{ role: "user", content: "Recent non-searchable message", order: 3 },
			]);

			const contextHandler = vi.fn(async (ctx, args) => {
				// Put search messages first, then recent, then prompt
				return [...args.search, ...args.recent, ...args.inputPrompt];
			});

			const result = await fetchContextWithPrompt(ctx, components.agent, {
				...baseArgs,
				userId: "userSearch",
				threadId,
				prompt: "Tell me about cats",
				messages: undefined,
				promptMessageId: undefined,
				contextOptions: {
					recentMessages: 1, // Only get 1 recent message
					searchOptions: {
						textSearch: true,
						limit: 2,
					},
				},
				contextHandler,
			});

			expect(contextHandler).toHaveBeenCalledWith(
				ctx,
				expect.objectContaining({
					search: expect.any(Array),
					recent: expect.any(Array),
					inputPrompt: expect.arrayContaining([
						expect.objectContaining({ content: "Tell me about cats" }),
					]),
				}),
			);

			// Should have recent + prompt (search may not return results in test environment)
			expect(result.messages.length).toBeGreaterThanOrEqual(2);
			expect(result.messages[result.messages.length - 1].content).toBe(
				"Tell me about cats",
			);
		});

		it("should handle existingResponses in contextHandler when promptMessageId provided", async () => {
			const threadId = await createTestThread("userResponses");

			const { messages: savedMessages } = await t.run(async (mutCtx) => {
				return await saveMessages(mutCtx, components.agent, {
					threadId,
					userId: "userResponses",
					messages: [
						{ role: "user", content: "Before prompt" },
						{ role: "user", content: "Original prompt" },
						{ role: "assistant", content: "Existing response 1" },
						{ role: "assistant", content: "Existing response 2" },
					],
					metadata: [{}, {}, {}, {}],
				});
			});

			const promptMessageId = savedMessages[1]!._id; // The prompt message

			const contextHandler = vi.fn(async (ctx, args) => {
				// Put existing responses first to test they're properly identified
				return [...args.recent, ...args.existingResponses, ...args.inputPrompt];
			});

			const result = await fetchContextWithPrompt(ctx, components.agent, {
				...baseArgs,
				userId: "userResponses",
				threadId,
				prompt: "New replacement prompt",
				messages: undefined,
				promptMessageId,
				contextOptions: { recentMessages: 10 },
				contextHandler,
			});

			expect(contextHandler).toHaveBeenCalledWith(
				ctx,
				expect.objectContaining({
					recent: expect.arrayContaining([
						expect.objectContaining({ content: "Before prompt" }),
					]),
					existingResponses: expect.arrayContaining([
						expect.objectContaining({ content: "Existing response 1" }),
						expect.objectContaining({ content: "Existing response 2" }),
					]),
					inputPrompt: expect.arrayContaining([
						expect.objectContaining({ content: "New replacement prompt" }),
					]),
				}),
			);

			expect(result.messages).toHaveLength(4);
			expect(result.messages[0]!.content).toBe("Before prompt");
			expect(result.messages[1]!.content).toBe("Existing response 1");
			expect(result.messages[2]!.content).toBe("Existing response 2");
			expect(result.messages[3]!.content).toBe("New replacement prompt");
		});

		it("should work without contextHandler (default behavior)", async () => {
			const threadId = await createTestThread("userDefault");

			await createTestMessages(threadId, "userDefault", [
				{ role: "user", content: "Default order test", order: 1 },
			]);

			const result = await fetchContextWithPrompt(ctx, components.agent, {
				...baseArgs,
				userId: "userDefault",
				threadId,
				prompt: "Default prompt",
				messages: [{ role: "user", content: "Input message" }],
				promptMessageId: undefined,
				contextOptions: { recentMessages: 10 },
				// No contextHandler provided
			});

			// Should follow default order: recent, input, prompt
			expect(result.messages).toHaveLength(3);
			expect(result.messages[0]!.content).toBe("Default order test"); // recent
			expect(result.messages[1]!.content).toBe("Input message"); // inputMessages
			expect(result.messages[2]!.content).toBe("Default prompt"); // inputPrompt
		});
	});
});
