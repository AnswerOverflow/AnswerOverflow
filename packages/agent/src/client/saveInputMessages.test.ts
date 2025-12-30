import { beforeEach, describe, expect, test, vi } from "vitest";
import { saveInputMessages } from "./saveInputMessages";
import type { MessageDoc } from "../validators";
import type { ActionCtx } from "./types";
import {
	defineSchema,
	type Auth,
	type StorageActionWriter,
} from "convex/server";
import { initConvexTest } from "./setup.test";
import { components } from "./setup.test";

const schema = defineSchema({});

// Hoisted mock functions
const { mockSaveMessages, mockEmbedMessages } = vi.hoisted(() => ({
	mockSaveMessages: vi.fn(),
	mockEmbedMessages: vi.fn(),
}));

vi.mock("./messages", () => ({
	saveMessages: mockSaveMessages,
}));

vi.mock("./search", async () => {
	const actual = await vi.importActual("./search");
	return {
		...actual,
		embedMessages: mockEmbedMessages,
	};
});

// Helper to create mock MessageDoc
const createMockMessageDoc = (
	id: string,
	role: "user" | "assistant" | "tool" | "system",
	content: any,
): MessageDoc => ({
	_id: id,
	_creationTime: Date.now(),
	userId: "test-user",
	threadId: "test-thread",
	order: 1,
	stepOrder: 1,
	status: role === "assistant" ? "pending" : "success",
	tool: false,
	message: { role, content },
});

describe("saveInputMessages", () => {
	const defaultArgs = {
		threadId: "test-thread",
		userId: "test-user",
		promptMessageId: undefined,
		agentName: "test-agent",
		storageOptions: { saveMessages: "promptAndOutput" as const },
		usageHandler: undefined,
		textEmbeddingModel: undefined,
		callSettings: undefined,
	};

	const mockComponent = components.agent;

	let t = initConvexTest(schema);
	let ctx: ActionCtx;

	beforeEach(() => {
		vi.clearAllMocks();
		t = initConvexTest(schema);
		ctx = {
			runQuery: t.query,
			runAction: t.action,
			runMutation: t.mutation,
			auth: {} as Auth,
			storage: {} as StorageActionWriter,
		} as ActionCtx;

		mockSaveMessages.mockResolvedValue({
			messages: [
				createMockMessageDoc("saved-1", "user", "Test prompt"),
				createMockMessageDoc("pending-1", "assistant", []),
			],
		});

		mockEmbedMessages.mockResolvedValue({
			vectors: [[0.1, 0.2, 0.3], null],
			dimension: 3,
			model: "test-model",
		});
	});

	describe("saveMessages: 'all' scenarios", () => {
		test("should save all messages and prompt when storageOptions.saveMessages is 'all'", async () => {
			const t = initConvexTest(schema);

			await t.run(async (ctx) => {
				const prompt = "Test prompt";
				const messages = [
					{ role: "user" as const, content: "Previous message 1" },
					{ role: "assistant" as const, content: "Response 1" },
				];

				const result = await saveInputMessages(ctx, mockComponent, {
					...defaultArgs,
					prompt,
					messages,
					storageOptions: { saveMessages: "all" },
				});

				expect(mockSaveMessages).toHaveBeenCalledWith(
					ctx,
					mockComponent,
					expect.objectContaining({
						threadId: "test-thread",
						userId: "test-user",
						messages: [
							...messages,
							{ role: "user", content: "Test prompt" },
							{ role: "assistant", content: [] },
						],
						metadata: expect.arrayContaining([
							{},
							{},
							{},
							{ status: "pending" },
						]),
						failPendingSteps: false,
					}),
				);

				expect(result.promptMessageId).toBe("saved-1");
				expect(result.pendingMessage?._id).toBe("pending-1");
				expect(result.savedMessages).toHaveLength(1);
				expect(result.savedMessages[0]!._id).toBe("saved-1");
			});
		});

		test("should save all with promptMessageId provided (no new messages saved)", async () => {
			const t = initConvexTest(schema);

			await t.run(async (ctx) => {
				// Mock saveMessages to return only pending message
				mockSaveMessages.mockResolvedValueOnce({
					messages: [createMockMessageDoc("pending-1", "assistant", [])],
				});

				const prompt = "Test prompt";
				const messages = [
					{ role: "user" as const, content: "Previous message" },
				];

				const result = await saveInputMessages(ctx, mockComponent, {
					...defaultArgs,
					prompt,
					messages,
					promptMessageId: "existing-prompt-id",
					storageOptions: { saveMessages: "all" },
				});

				// Should not save any input messages when promptMessageId is provided
				expect(mockSaveMessages).toHaveBeenCalledWith(
					ctx,
					mockComponent,
					expect.objectContaining({
						messages: [{ role: "assistant", content: [] }],
						metadata: [{ status: "pending" }],
						failPendingSteps: true,
					}),
				);

				expect(result.promptMessageId).toBe("existing-prompt-id");
				expect(result.savedMessages).toHaveLength(0);
			});
		});

		test("should save all with only prompt messages provided", async () => {
			const t = initConvexTest(schema);

			await t.run(async (ctx) => {
				const prompt = [
					{ role: "user" as const, content: "Multi-part prompt 1" },
					{ role: "user" as const, content: "Multi-part prompt 2" },
				];

				const result = await saveInputMessages(ctx, mockComponent, {
					...defaultArgs,
					prompt,
					messages: undefined,
					storageOptions: { saveMessages: "all" },
				});

				expect(mockSaveMessages).toHaveBeenCalledWith(
					ctx,
					mockComponent,
					expect.objectContaining({
						messages: [...prompt, { role: "assistant", content: [] }],
					}),
				);

				expect(result.savedMessages).toHaveLength(1);
			});
		});

		test("should save all with both prompt and messages provided", async () => {
			const t = initConvexTest(schema);

			await t.run(async (ctx) => {
				const prompt = "Single prompt";
				const messages = [
					{ role: "user" as const, content: "Context message" },
				];

				await saveInputMessages(ctx, mockComponent, {
					...defaultArgs,
					prompt,
					messages,
					storageOptions: { saveMessages: "all" },
				});

				expect(mockSaveMessages).toHaveBeenCalledWith(
					ctx,
					mockComponent,
					expect.objectContaining({
						messages: [
							...messages,
							{ role: "user", content: "Single prompt" },
							{ role: "assistant", content: [] },
						],
					}),
				);
			});
		});
	});

	describe("saveMessages: 'promptAndOutput' scenarios", () => {
		test("should save only prompt when storageOptions.saveMessages is 'promptAndOutput'", async () => {
			const t = initConvexTest(schema);

			await t.run(async (ctx) => {
				const prompt = "Test prompt";
				const messages = [
					{ role: "user" as const, content: "Previous message" },
				];

				const result = await saveInputMessages(ctx, mockComponent, {
					...defaultArgs,
					prompt,
					messages,
					storageOptions: { saveMessages: "promptAndOutput" },
				});

				expect(mockSaveMessages).toHaveBeenCalledWith(
					ctx,
					mockComponent,
					expect.objectContaining({
						messages: [
							{ role: "user", content: "Test prompt" },
							{ role: "assistant", content: [] },
						],
						metadata: [{}, { status: "pending" }],
					}),
				);

				expect(result.promptMessageId).toBe("saved-1");
				expect(result.savedMessages).toHaveLength(1);
			});
		});

		test("should save prompt array when provided with promptAndOutput", async () => {
			const t = initConvexTest(schema);

			await t.run(async (ctx) => {
				const prompt = [
					{ role: "user" as const, content: "Part 1" },
					{ role: "user" as const, content: "Part 2" },
				];
				const messages = [
					{ role: "user" as const, content: "Context message" },
				];

				await saveInputMessages(ctx, mockComponent, {
					...defaultArgs,
					prompt,
					messages,
					storageOptions: { saveMessages: "promptAndOutput" },
				});

				expect(mockSaveMessages).toHaveBeenCalledWith(
					ctx,
					mockComponent,
					expect.objectContaining({
						messages: [...prompt, { role: "assistant", content: [] }],
					}),
				);
			});
		});

		test("should save last message when no prompt provided with promptAndOutput", async () => {
			const t = initConvexTest(schema);

			await t.run(async (ctx) => {
				const messages = [
					{ role: "user" as const, content: "First message" },
					{ role: "user" as const, content: "Last message" },
				];

				await saveInputMessages(ctx, mockComponent, {
					...defaultArgs,
					prompt: undefined,
					messages,
					storageOptions: { saveMessages: "promptAndOutput" },
				});

				expect(mockSaveMessages).toHaveBeenCalledWith(
					ctx,
					mockComponent,
					expect.objectContaining({
						messages: [
							{ role: "user", content: "Last message" },
							{ role: "assistant", content: [] },
						],
					}),
				);
			});
		});

		test("should handle promptMessageId with promptAndOutput (no new messages saved)", async () => {
			const t = initConvexTest(schema);

			await t.run(async (ctx) => {
				// Mock saveMessages to return only pending message
				mockSaveMessages.mockResolvedValueOnce({
					messages: [createMockMessageDoc("pending-1", "assistant", [])],
				});

				const result = await saveInputMessages(ctx, mockComponent, {
					...defaultArgs,
					prompt: "Test prompt",
					messages: [{ role: "user" as const, content: "Context" }],
					promptMessageId: "existing-prompt-id",
					storageOptions: { saveMessages: "promptAndOutput" },
				});

				expect(mockSaveMessages).toHaveBeenCalledWith(
					ctx,
					mockComponent,
					expect.objectContaining({
						messages: [{ role: "assistant", content: [] }],
						failPendingSteps: true,
					}),
				);

				expect(result.promptMessageId).toBe("existing-prompt-id");
				expect(result.savedMessages).toHaveLength(0);
			});
		});
	});

	describe("embedding generation scenarios", () => {
		test("should generate embeddings when textEmbeddingModel is provided (action context)", async () => {
			// Create action context with runAction method
			const actionCtx = {
				runQuery: vi.fn(),
				runMutation: vi.fn(),
				runAction: vi.fn(),
				auth: {} as Auth,
				storage: {} as StorageActionWriter,
			} as ActionCtx;

			await saveInputMessages(actionCtx, mockComponent, {
				...defaultArgs,
				prompt: "Test prompt",
				messages: undefined,
				textEmbeddingModel: "test-embedding-model",
				storageOptions: { saveMessages: "promptAndOutput" },
			});

			// Verify embedMessages was called
			expect(mockEmbedMessages).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					userId: "test-user",
					threadId: "test-thread",
					textEmbeddingModel: "test-embedding-model",
				}),
				[{ role: "user", content: "Test prompt" }],
			);

			// Verify saveMessages was called with embeddings
			expect(mockSaveMessages).toHaveBeenCalledWith(
				expect.anything(),
				expect.anything(),
				expect.objectContaining({
					embeddings: expect.objectContaining({
						vectors: expect.arrayContaining([[0.1, 0.2, 0.3], null]),
						dimension: 3,
						model: "test-model",
					}),
				}),
			);
		});

		test("should not generate embeddings in mutation context even with textEmbeddingModel", async () => {
			await expect(
				t.run(async (ctx) => {
					return saveInputMessages(ctx, mockComponent, {
						...defaultArgs,
						prompt: "Test prompt",
						messages: undefined,
						textEmbeddingModel: "test-embedding-model",
						storageOptions: { saveMessages: "promptAndOutput" },
					});
				}),
			).rejects.toThrow(
				"You must be in an action context to generate embeddings",
			);
		});

		test("should not generate embeddings when no textEmbeddingModel provided", async () => {
			await saveInputMessages(ctx, mockComponent, {
				...defaultArgs,
				prompt: "Test prompt",
				messages: undefined,
				textEmbeddingModel: undefined,
				storageOptions: { saveMessages: "promptAndOutput" },
			});

			expect(mockEmbedMessages).not.toHaveBeenCalled();
		});

		test("should not generate embeddings when no messages to save", async () => {
			await saveInputMessages(ctx, mockComponent, {
				...defaultArgs,
				prompt: undefined,
				messages: undefined,
				promptMessageId: "existing-id",
				textEmbeddingModel: "test-model",
				storageOptions: { saveMessages: "promptAndOutput" },
			});

			expect(mockEmbedMessages).not.toHaveBeenCalled();
		});
	});

	describe("edge cases and validation", () => {
		test("should handle empty prompt and messages gracefully", async () => {
			const t = initConvexTest(schema);

			await t.run(async (ctx) => {
				// Mock saveMessages to return only pending message
				mockSaveMessages.mockResolvedValueOnce({
					messages: [createMockMessageDoc("pending-1", "assistant", [])],
				});

				const result = await saveInputMessages(ctx, mockComponent, {
					...defaultArgs,
					prompt: undefined,
					messages: undefined,
					storageOptions: { saveMessages: "promptAndOutput" },
				});

				expect(mockSaveMessages).toHaveBeenCalledWith(
					ctx,
					mockComponent,
					expect.objectContaining({
						messages: [{ role: "assistant", content: [] }],
						metadata: [{ status: "pending" }],
					}),
				);

				expect(result.promptMessageId).toBeUndefined();
				expect(result.savedMessages).toHaveLength(0);
			});
		});

		test("should default to 'promptAndOutput' when storageOptions.saveMessages is not specified", async () => {
			const t = initConvexTest(schema);

			await t.run(async (ctx) => {
				const prompt = "Test prompt";
				const messages = [
					{ role: "user" as const, content: "Context message" },
				];

				await saveInputMessages(ctx, mockComponent, {
					...defaultArgs,
					prompt,
					messages,
					storageOptions: undefined,
				});

				// Should behave like promptAndOutput - only save prompt
				expect(mockSaveMessages).toHaveBeenCalledWith(
					ctx,
					mockComponent,
					expect.objectContaining({
						messages: [
							{ role: "user", content: "Test prompt" },
							{ role: "assistant", content: [] },
						],
					}),
				);
			});
		});

		test("should always include pending message in saved messages", async () => {
			const t = initConvexTest(schema);

			await t.run(async (ctx) => {
				const result = await saveInputMessages(ctx, mockComponent, {
					...defaultArgs,
					prompt: "Test prompt",
					messages: undefined,
					storageOptions: { saveMessages: "all" },
				});

				expect(result.pendingMessage.status).toBe("pending");
				expect(result.pendingMessage.message?.role).toBe("assistant");
				expect(result.pendingMessage.message?.content).toEqual([]);

				// Pending message should NOT be included in savedMessages
				expect(result.savedMessages).not.toContainEqual(
					expect.objectContaining({ status: "pending" }),
				);
			});
		});

		test("should return correct promptMessageId when messages are saved", async () => {
			const t = initConvexTest(schema);

			await t.run(async (ctx) => {
				// Mock saveMessages to return multiple messages
				mockSaveMessages.mockResolvedValueOnce({
					messages: [
						createMockMessageDoc("msg-1", "user", "First"),
						createMockMessageDoc(
							"msg-2",
							"user",
							"Second - this should be the prompt",
						),
						createMockMessageDoc("pending-1", "assistant", []),
					],
				});

				const result = await saveInputMessages(ctx, mockComponent, {
					...defaultArgs,
					prompt: "Test prompt",
					messages: [{ role: "user" as const, content: "Context" }],
					storageOptions: { saveMessages: "all" },
				});

				// promptMessageId should be the second-to-last message (before pending)
				expect(result.promptMessageId).toBe("msg-2");
				expect(result.savedMessages).toHaveLength(2);
				expect(result.savedMessages.map((m) => m._id)).toEqual([
					"msg-1",
					"msg-2",
				]);
			});
		});

		test("should use provided promptMessageId when no new messages are saved", async () => {
			const t = initConvexTest(schema);

			await t.run(async (ctx) => {
				mockSaveMessages.mockResolvedValueOnce({
					messages: [createMockMessageDoc("pending-1", "assistant", [])],
				});

				const result = await saveInputMessages(ctx, mockComponent, {
					...defaultArgs,
					prompt: "Test prompt",
					messages: undefined,
					promptMessageId: "existing-prompt-123",
					storageOptions: { saveMessages: "promptAndOutput" },
				});

				expect(result.promptMessageId).toBe("existing-prompt-123");
				expect(result.savedMessages).toHaveLength(0);
			});
		});
	});
});
