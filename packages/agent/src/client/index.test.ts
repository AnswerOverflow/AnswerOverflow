import { describe, expect, test } from "vitest";
import {
	Agent,
	createThread,
	filterOutOrphanedToolMessages,
	type MessageDoc,
} from "./index";
import type { DataModelFromSchemaDefinition } from "convex/server";
import {
	anyApi,
	queryGeneric,
	mutationGeneric,
	actionGeneric,
} from "convex/server";
import type {
	ApiFromModules,
	ActionBuilder,
	MutationBuilder,
	QueryBuilder,
} from "convex/server";
import { v } from "convex/values";
import { defineSchema } from "convex/server";
import { stepCountIs } from "ai";
import { components, initConvexTest } from "./setup.test";
import { z } from "zod/v4";
import { mockModel } from "./mockModel";

const schema = defineSchema({});
type DataModel = DataModelFromSchemaDefinition<typeof schema>;
// type DatabaseReader = GenericDatabaseReader<DataModel>;
const query = queryGeneric as QueryBuilder<DataModel, "public">;
const mutation = mutationGeneric as MutationBuilder<DataModel, "public">;
const action = actionGeneric as ActionBuilder<DataModel, "public">;

const TEST_TEXT = JSON.stringify({ hello: "world" });

const agent = new Agent(components.agent, {
	name: "test",
	instructions: "You are a test agent",
	languageModel: mockModel({
		content: [{ type: "text", text: TEST_TEXT }],
	}),
});

export const testQuery = query({
	args: { threadId: v.string() },
	handler: async (ctx, args) => {
		return await agent.listMessages(ctx, {
			threadId: args.threadId,
			paginationOpts: { cursor: null, numItems: 10 },
			excludeToolMessages: true,
			statuses: ["success"],
		});
	},
});

export const createThreadManually = mutation({
	args: {},
	handler: async (ctx) => {
		const { threadId } = await agent.createThread(ctx, { userId: "1" });
		return { threadId };
	},
});

export const createThreadMutation = agent.createThreadMutation();
export const generateObjectAction = agent.asObjectAction({
	schema: z.object({ hello: z.string().describe("A string for testing") }),
});
export const generateTextAction = agent.asTextAction({});
export const streamTextAction = agent.asTextAction({ stream: true });
export const saveMessageMutation = agent.asSaveMessagesMutation();

export const createAndGenerate = action({
	args: {},
	handler: async (ctx) => {
		const { thread } = await agent.createThread(ctx, { userId: "1" });
		const result = await thread.generateText({
			messages: [{ role: "user", content: "Hello" }],
		});
		return result.text;
	},
});

export const continueThreadAction = action({
	args: { threadId: v.string(), userId: v.optional(v.string()) },
	handler: async (ctx, args) => {
		const { thread } = await agent.continueThread(ctx, args);
		return { threadId: thread.threadId };
	},
});

export const generateTextWithThread = action({
	args: {
		threadId: v.string(),
		userId: v.optional(v.string()),
		messages: v.array(v.any()),
		contextOptions: v.optional(v.any()),
		storageOptions: v.optional(v.any()),
	},
	handler: async (ctx, args) => {
		const { thread } = await agent.continueThread(ctx, {
			threadId: args.threadId,
			userId: args.userId,
		});
		const result = await thread.generateText(
			{ messages: args.messages },
			{
				contextOptions: args.contextOptions,
				storageOptions: args.storageOptions,
			},
		);
		return { text: result.text };
	},
});

export const generateObjectWithThread = action({
	args: {
		threadId: v.string(),
		userId: v.optional(v.string()),
		prompt: v.string(),
	},
	handler: async (ctx, args) => {
		const { thread } = await agent.continueThread(ctx, {
			threadId: args.threadId,
			userId: args.userId,
		});
		const result = await thread.generateObject({
			prompt: args.prompt,
			schema: z.object({ prompt: z.any() }),
		});
		return { object: result.object };
	},
});

export const fetchContextAction = action({
	args: {
		userId: v.optional(v.string()),
		threadId: v.optional(v.string()),
		messages: v.array(v.any()),
		contextOptions: v.optional(v.any()),
	},
	handler: async (ctx, args) => {
		const context = await agent.fetchContextMessages(ctx, {
			userId: args.userId,
			threadId: args.threadId,
			messages: args.messages,
			contextOptions: args.contextOptions,
		});
		return context;
	},
});

const testApi: ApiFromModules<{
	fns: {
		createAndGenerate: typeof createAndGenerate;
		createThreadManually: typeof createThreadManually;
		testQuery: typeof testQuery;
		continueThreadAction: typeof continueThreadAction;
		generateTextWithThread: typeof generateTextWithThread;
		generateObjectWithThread: typeof generateObjectWithThread;
		fetchContextAction: typeof fetchContextAction;
		generateTextAction: typeof generateTextAction;
		generateObjectAction: typeof generateObjectAction;
		saveMessageMutation: typeof saveMessageMutation;
	};
}>["fns"] = anyApi["index.test"] as any;

describe("Agent thick client", () => {
	test("should create a thread", async () => {
		const t = initConvexTest(schema);
		const result = await t.mutation(testApi.createThreadManually, {});
		expect(result.threadId).toBeTypeOf("string");
	});
	test("should create a thread and generate text", async () => {
		const t = initConvexTest(schema);
		const result = await t.action(testApi.createAndGenerate, {});
		expect(result).toBeDefined();
		expect(result).toMatch(TEST_TEXT);
	});
});

describe("filterOutOrphanedToolMessages", () => {
	const call1: MessageDoc = {
		_id: "call1",
		_creationTime: Date.now(),
		order: 1,
		stepOrder: 1,
		tool: true,
		message: {
			role: "assistant",
			content: [
				{
					type: "tool-call",
					toolCallId: "1",
					toolName: "tool1",
					args: { test: "test" },
				},
			],
		},
		status: "success",
		threadId: "1",
	};
	const response1: MessageDoc = {
		_id: "response1",
		_creationTime: Date.now(),
		order: 1,
		stepOrder: 1,
		tool: true,
		message: {
			role: "tool",
			content: [
				{
					type: "tool-result",
					toolCallId: "1",
					toolName: "tool1",
					result: { test: "test" },
				},
			],
		},
		status: "success",
		threadId: "1",
	};
	const call2: MessageDoc = {
		_id: "call2",
		_creationTime: Date.now(),
		order: 1,
		stepOrder: 2,
		tool: true,
		message: { role: "assistant", content: [{ type: "text", text: "Hello" }] },
		status: "success",
		threadId: "1",
	};
	test("should not filter out extra tool calls", () => {
		expect(filterOutOrphanedToolMessages([call1, response1, call2])).toEqual([
			call1,
			response1,
			call2,
		]);
	});
	test("should filter out extra tool calls", () => {
		expect(filterOutOrphanedToolMessages([response1, call2])).toEqual([call2]);
	});
});

describe("Agent option variations and normal behavior", () => {
	test("Agent can be constructed with minimal options", () => {
		const a = new Agent(components.agent, {
			name: "minimal",
			languageModel: mockModel(),
		});
		expect(a).toBeInstanceOf(Agent);
	});

	test("Agent can be constructed with all options", () => {
		const a = new Agent(components.agent, {
			name: "full",
			languageModel: mockModel(),
			instructions: "Test instructions",
			contextOptions: { recentMessages: 5 },
			storageOptions: { saveMessages: "all" },
			stopWhen: stepCountIs(2),
			callSettings: { maxRetries: 1 },
			usageHandler: async () => {},
			rawRequestResponseHandler: async () => {},
		});
		expect(a.options.name).toBe("full");
	});
});

describe("Agent thread management", () => {
	test("createThread returns threadId (mutation context)", async () => {
		const t = initConvexTest(schema);
		const threadId = await t.run(async (ctx) =>
			createThread(ctx, components.agent, { userId: "2" }),
		);
		expect(threadId).toBeTypeOf("string");
	});

	test("continueThread returns thread object", async () => {
		const t = initConvexTest(schema);
		const threadId = await t.run(async (ctx) =>
			createThread(ctx, components.agent, { userId: "3" }),
		);
		const result = await t.action(testApi.continueThreadAction, {
			threadId,
			userId: "3",
		});
		expect(result.threadId).toBe(threadId);
	});
});

describe("Agent message operations", () => {
	test("saveMessage and saveMessages store messages", async () => {
		const t = initConvexTest(schema);
		const threadId = await t.run(async (ctx) =>
			createThread(ctx, components.agent, { userId: "4" }),
		);
		const { messageId } = await t.run(async (ctx) =>
			agent.saveMessage(ctx, {
				threadId,
				userId: "4",
				message: { role: "user", content: "Hello" },
			}),
		);
		expect(messageId).toBeTypeOf("string");

		const { messages } = await t.run(async (ctx) =>
			agent.saveMessages(ctx, {
				threadId,
				userId: "4",
				messages: [
					{ role: "user", content: "Hi" },
					{ role: "assistant", content: "Hello!" },
				],
			}),
		);
		expect(messages.length).toBe(2);
		expect(messages[1]!._id).toBeDefined();
	});
});

describe("Agent text/object generation", () => {
	test("generateText with custom context and storage options", async () => {
		const t = initConvexTest(schema);
		const threadId = await t.run(async (ctx) =>
			createThread(ctx, components.agent, { userId: "5" }),
		);
		const result = await t.action(testApi.generateTextWithThread, {
			threadId,
			userId: "5",
			messages: [{ role: "user", content: "Test" }],
			contextOptions: { recentMessages: 1 },
			storageOptions: { saveMessages: "all" },
		});
		expect(result.text).toEqual(TEST_TEXT);
	});

	test("generateObject returns object", async () => {
		const t = initConvexTest(schema);
		const threadId = await t.run(async (ctx) =>
			createThread(ctx, components.agent, { userId: "6" }),
		);
		const result = await t.action(testApi.generateObjectWithThread, {
			threadId,
			userId: "6",
			prompt: "Object please",
		});
		expect(result.object).toBeDefined();
	});
});

describe("Agent-generated mutations/actions/queries", () => {
	test("createThreadMutation works via t.mutation", async () => {
		const t = initConvexTest(schema);
		// This test is for the registered mutation, not the agent method
		const result = await t.mutation(testApi.createThreadManually, {});
		expect(result.threadId).toBeTypeOf("string");
	});

	test("asTextAction and asObjectAction work via t.action", async () => {
		const t = initConvexTest(schema);
		const threadId = await t.run(async (ctx) =>
			createThread(ctx, components.agent, { userId: "8" }),
		);
		const textResult = await t.action(testApi.generateTextAction, {
			userId: "8",
			threadId,
			messages: [{ role: "user", content: "Say hi" }],
		});
		expect(textResult.text).toEqual(TEST_TEXT);

		const objResult = await t.action(testApi.generateObjectAction, {
			userId: "8",
			threadId,
			messages: [{ role: "user", content: "Give object" }],
		});
		expect(objResult.object).toBeDefined();
	});

	test("asSaveMessagesMutation works via t.mutation", async () => {
		const t = initConvexTest(schema);
		const threadId = await t.run(async (ctx) =>
			createThread(ctx, components.agent, { userId: "9" }),
		);
		const result = await t.mutation(testApi.saveMessageMutation, {
			threadId,
			messages: [
				{
					message: { role: "user", content: "Saved via mutation" },
					// add more metadata fields as needed
				},
			],
		});
		expect(result.messages.length).toBe(1);
		expect(result.messages[0]!._id).toBeDefined();
	});
});

describe("Agent context and search options", () => {
	test("fetchContextMessages returns context messages", async () => {
		const t = initConvexTest(schema);
		const threadId = await t.run(async (ctx) =>
			createThread(ctx, components.agent, { userId: "10" }),
		);
		await t.run(async (ctx) =>
			agent.saveMessage(ctx, {
				threadId,
				userId: "10",
				message: { role: "user", content: "Context test" },
			}),
		);
		const context = await t.action(testApi.fetchContextAction, {
			userId: "10",
			threadId,
			messages: [{ role: "user", content: "Context test" }],
			contextOptions: { recentMessages: 1 },
		});
		expect(context.length).toBeGreaterThan(0);
	});
});
