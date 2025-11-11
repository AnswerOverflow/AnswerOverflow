import { makeFunctionReference } from "convex/server";
import { v } from "convex/values";
import {
	publicInternalAction,
	publicInternalMutation,
	publicInternalQuery,
} from "./publicInternal";

// Test query functions
export const testQueryWithStringArg = publicInternalQuery({
	args: {
		testArg: v.string(),
	},
	handler: async (ctx, args) => {
		// Verify backendAccessToken is not in args
		if ("backendAccessToken" in args) {
			throw new Error("backendAccessToken should not be in args");
		}
		return `success: ${args.testArg}`;
	},
});

export const testQueryWithMultipleArgs = publicInternalQuery({
	args: {
		arg1: v.string(),
		arg2: v.number(),
		arg3: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		return {
			arg1: args.arg1,
			arg2: args.arg2,
			arg3: args.arg3,
		};
	},
});

// Test mutation functions
export const testMutationWithStringArg = publicInternalMutation({
	args: {
		value: v.string(),
	},
	handler: async (ctx, args) => {
		// Verify backendAccessToken is not in args
		if ("backendAccessToken" in args) {
			throw new Error("backendAccessToken should not be in args");
		}
		const id = await ctx.db.insert("testTable", {
			value: args.value,
		});
		return id;
	},
});

export const testMutationWithMultipleArgs = publicInternalMutation({
	args: {
		arg1: v.string(),
		arg2: v.number(),
		arg3: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		return {
			arg1: args.arg1,
			arg2: args.arg2,
			arg3: args.arg3,
		};
	},
});

// Test action functions
export const testActionWithStringArg = publicInternalAction({
	args: {
		value: v.string(),
	},
	handler: async (ctx, args) => {
		// Verify backendAccessToken is not in args
		if ("backendAccessToken" in args) {
			throw new Error("backendAccessToken should not be in args");
		}
		return `processed: ${args.value}`;
	},
});

export const testActionWithMultipleArgs = publicInternalAction({
	args: {
		arg1: v.string(),
		arg2: v.number(),
		arg3: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		return {
			arg1: args.arg1,
			arg2: args.arg2,
			arg3: args.arg3,
		};
	},
});

// Test action calling query
const testQueryWithStringArgRef = makeFunctionReference(
	"publicInternalTestFunctions:testQueryWithStringArg",
);

export const testActionCallingQuery = publicInternalAction({
	args: {
		value: v.string(),
	},
	handler: async (ctx, args) => {
		const queryResult = await ctx.runQuery(testQueryWithStringArgRef, {
			backendAccessToken: process.env.BACKEND_ACCESS_TOKEN!,
			testArg: args.value,
		});
		return `action-result: ${queryResult}`;
	},
});
