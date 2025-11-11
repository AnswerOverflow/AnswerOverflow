import { defineSchema, defineTable } from "convex/server";
import { makeFunctionReference } from "convex/server";
import { v } from "convex/values";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { convexTest } from "@packages/convex-test";
import * as testFunctions from "./publicInternalTestFunctions";
import * as generatedApi from "./_generated/api";
import * as generatedServer from "./_generated/server";

// Minimal schema for testing
const testSchema = defineSchema({
	testTable: defineTable({
		value: v.string(),
	}),
});

// Load test functions module and _generated modules
const testModules = {
	"/convex/publicInternalTestFunctions": () => Promise.resolve(testFunctions),
	"/convex/_generated/api": () => Promise.resolve(generatedApi),
	"/convex/_generated/server": () => Promise.resolve(generatedServer),
};

// Create function references using modulePath:exportName format
const testQueryWithStringArgRef = makeFunctionReference(
	"publicInternalTestFunctions:testQueryWithStringArg",
);
const testQueryWithMultipleArgsRef = makeFunctionReference(
	"publicInternalTestFunctions:testQueryWithMultipleArgs",
);
const testMutationWithStringArgRef = makeFunctionReference(
	"publicInternalTestFunctions:testMutationWithStringArg",
);
const testMutationWithMultipleArgsRef = makeFunctionReference(
	"publicInternalTestFunctions:testMutationWithMultipleArgs",
);
const testActionWithStringArgRef = makeFunctionReference(
	"publicInternalTestFunctions:testActionWithStringArg",
);
const testActionWithMultipleArgsRef = makeFunctionReference(
	"publicInternalTestFunctions:testActionWithMultipleArgs",
);
const testActionCallingQueryRef = makeFunctionReference(
	"publicInternalTestFunctions:testActionCallingQuery",
);

describe("publicInternalQuery", () => {
	const originalEnv = process.env.BACKEND_ACCESS_TOKEN;

	beforeEach(() => {
		// Reset environment variable before each test
		process.env.BACKEND_ACCESS_TOKEN = "test-token-123";
	});

	afterEach(() => {
		// Restore original environment variable
		if (originalEnv === undefined) {
			delete process.env.BACKEND_ACCESS_TOKEN;
		} else {
			process.env.BACKEND_ACCESS_TOKEN = originalEnv;
		}
	});

	it("should accept valid backendAccessToken and strip it from args", async () => {
		const t = convexTest(testSchema, testModules);
		const result = await t.query(testQueryWithStringArgRef, {
			backendAccessToken: "test-token-123",
			testArg: "test-value",
		});

		expect(result).toBe("success: test-value");
	});

	it("should reject invalid backendAccessToken", async () => {
		const t = convexTest(testSchema, testModules);
		await expect(
			t.query(testQueryWithStringArgRef, {
				backendAccessToken: "wrong-token",
				testArg: "test-value",
			}),
		).rejects.toThrow("Invalid BACKEND_ACCESS_TOKEN");
	});

	it("should reject missing backendAccessToken", async () => {
		const t = convexTest(testSchema, testModules);
		await expect(
			t.query(testQueryWithStringArgRef, {
				testArg: "test-value",
			} as any),
		).rejects.toThrow();
	});

	it("should reject when BACKEND_ACCESS_TOKEN is not configured", async () => {
		delete process.env.BACKEND_ACCESS_TOKEN;

		const t = convexTest(testSchema, testModules);
		await expect(
			t.query(testQueryWithStringArgRef, {
				backendAccessToken: "any-token",
				testArg: "test-value",
			}),
		).rejects.toThrow("BACKEND_ACCESS_TOKEN not configured in environment");
	});

	it("should pass through all other args correctly", async () => {
		const t = convexTest(testSchema, testModules);
		const result = await t.query(testQueryWithMultipleArgsRef, {
			backendAccessToken: "test-token-123",
			arg1: "value1",
			arg2: 42,
			arg3: true,
		});

		expect(result).toEqual({
			arg1: "value1",
			arg2: 42,
			arg3: true,
		});
	});
});

describe("publicInternalMutation", () => {
	const originalEnv = process.env.BACKEND_ACCESS_TOKEN;

	beforeEach(() => {
		process.env.BACKEND_ACCESS_TOKEN = "test-token-123";
	});

	afterEach(() => {
		if (originalEnv === undefined) {
			delete process.env.BACKEND_ACCESS_TOKEN;
		} else {
			process.env.BACKEND_ACCESS_TOKEN = originalEnv;
		}
	});

	it("should accept valid backendAccessToken and strip it from args", async () => {
		const t = convexTest(testSchema, testModules);
		const id = await t.mutation(testMutationWithStringArgRef, {
			backendAccessToken: "test-token-123",
			value: "test-value",
		});

		expect(id).toBeDefined();
		const doc = await t.run(async (ctx) => ctx.db.get(id));
		expect(doc?.value).toBe("test-value");
	});

	it("should reject invalid backendAccessToken", async () => {
		const t = convexTest(testSchema, testModules);
		await expect(
			t.mutation(testMutationWithStringArgRef, {
				backendAccessToken: "wrong-token",
				value: "test-value",
			}),
		).rejects.toThrow("Invalid BACKEND_ACCESS_TOKEN");
	});

	it("should reject missing backendAccessToken", async () => {
		const t = convexTest(testSchema, testModules);
		await expect(
			t.mutation(testMutationWithStringArgRef, {
				value: "test-value",
			} as any),
		).rejects.toThrow();
	});

	it("should reject when BACKEND_ACCESS_TOKEN is not configured", async () => {
		delete process.env.BACKEND_ACCESS_TOKEN;

		const t = convexTest(testSchema, testModules);
		await expect(
			t.mutation(testMutationWithStringArgRef, {
				backendAccessToken: "any-token",
				value: "test-value",
			}),
		).rejects.toThrow("BACKEND_ACCESS_TOKEN not configured in environment");
	});

	it("should pass through all other args correctly", async () => {
		const t = convexTest(testSchema, testModules);
		const result = await t.mutation(testMutationWithMultipleArgsRef, {
			backendAccessToken: "test-token-123",
			arg1: "value1",
			arg2: 42,
			arg3: true,
		});

		expect(result).toEqual({
			arg1: "value1",
			arg2: 42,
			arg3: true,
		});
	});
});

describe("publicInternalAction", () => {
	const originalEnv = process.env.BACKEND_ACCESS_TOKEN;

	beforeEach(() => {
		process.env.BACKEND_ACCESS_TOKEN = "test-token-123";
	});

	afterEach(() => {
		if (originalEnv === undefined) {
			delete process.env.BACKEND_ACCESS_TOKEN;
		} else {
			process.env.BACKEND_ACCESS_TOKEN = originalEnv;
		}
	});

	it("should accept valid backendAccessToken and strip it from args", async () => {
		const t = convexTest(testSchema, testModules);
		const result = await t.action(testActionWithStringArgRef, {
			backendAccessToken: "test-token-123",
			value: "test-value",
		});

		expect(result).toBe("processed: test-value");
	});

	it("should reject invalid backendAccessToken", async () => {
		const t = convexTest(testSchema, testModules);
		await expect(
			t.action(testActionWithStringArgRef, {
				backendAccessToken: "wrong-token",
				value: "test-value",
			}),
		).rejects.toThrow("Invalid BACKEND_ACCESS_TOKEN");
	});

	it("should reject missing backendAccessToken", async () => {
		const t = convexTest(testSchema, testModules);
		await expect(
			t.action(testActionWithStringArgRef, {
				value: "test-value",
			} as any),
		).rejects.toThrow();
	});

	it("should reject when BACKEND_ACCESS_TOKEN is not configured", async () => {
		delete process.env.BACKEND_ACCESS_TOKEN;

		const t = convexTest(testSchema, testModules);
		await expect(
			t.action(testActionWithStringArgRef, {
				backendAccessToken: "any-token",
				value: "test-value",
			}),
		).rejects.toThrow("BACKEND_ACCESS_TOKEN not configured in environment");
	});

	it("should pass through all other args correctly", async () => {
		const t = convexTest(testSchema, testModules);
		const result = await t.action(testActionWithMultipleArgsRef, {
			backendAccessToken: "test-token-123",
			arg1: "value1",
			arg2: 42,
			arg3: true,
		});

		expect(result).toEqual({
			arg1: "value1",
			arg2: 42,
			arg3: true,
		});
	});

	it("should allow actions to call queries with backendAccessToken", async () => {
		const t = convexTest(testSchema, testModules);
		const result = await t.action(testActionCallingQueryRef, {
			backendAccessToken: "test-token-123",
			value: "test-value",
		});

		expect(result).toBe("action-result: success: test-value");
	});
});
