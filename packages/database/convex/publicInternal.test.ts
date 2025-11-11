import { convexTest } from "@packages/convex-test";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api";

// Minimal schema for testing - includes tables needed by the functions we're testing
const testSchema = defineSchema({
	servers: defineTable({
		discordId: v.string(),
		name: v.string(),
	}),
	serverPreferences: defineTable({
		serverId: v.id("servers"),
	}).index("by_serverId", ["serverId"]),
});

// Auto-discover convex modules
const testModules = import.meta.glob("./**/*.ts");

describe("publicInternalQuery", () => {
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

	it("should reject invalid backendAccessToken", async () => {
		const t = convexTest(testSchema, testModules);
		// Create a valid server ID first
		const serverId = await t.run(async (ctx) => {
			return await ctx.db.insert("servers", {
				discordId: "123456789",
				name: "Test Server",
			});
		});

		await expect(
			t.query(api.server_preferences.getServerPreferencesByServerId, {
				backendAccessToken: "wrong-token",
				serverId,
			}),
		).rejects.toThrow("Invalid BACKEND_ACCESS_TOKEN");
	});

	it("should reject when BACKEND_ACCESS_TOKEN is not configured", async () => {
		delete process.env.BACKEND_ACCESS_TOKEN;

		const t = convexTest(testSchema, testModules);
		// Create a valid server ID first
		const serverId = await t.run(async (ctx) => {
			return await ctx.db.insert("servers", {
				discordId: "123456789",
				name: "Test Server",
			});
		});

		await expect(
			t.query(api.server_preferences.getServerPreferencesByServerId, {
				backendAccessToken: "any-token",
				serverId,
			}),
		).rejects.toThrow("BACKEND_ACCESS_TOKEN not configured in environment");
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

	it("should reject invalid backendAccessToken", async () => {
		const t = convexTest(testSchema, testModules);
		// Create a valid server ID first
		const serverId = await t.run(async (ctx) => {
			return await ctx.db.insert("servers", {
				discordId: "123456789",
				name: "Test Server",
			});
		});

		await expect(
			t.mutation(api.server_preferences.createServerPreferences, {
				backendAccessToken: "wrong-token",
				preferences: {
					serverId,
				},
			}),
		).rejects.toThrow("Invalid BACKEND_ACCESS_TOKEN");
	});

	it("should reject when BACKEND_ACCESS_TOKEN is not configured", async () => {
		delete process.env.BACKEND_ACCESS_TOKEN;

		const t = convexTest(testSchema, testModules);
		// Create a valid server ID first
		const serverId = await t.run(async (ctx) => {
			return await ctx.db.insert("servers", {
				discordId: "123456789",
				name: "Test Server",
			});
		});

		await expect(
			t.mutation(api.server_preferences.createServerPreferences, {
				backendAccessToken: "any-token",
				preferences: {
					serverId,
				},
			}),
		).rejects.toThrow("BACKEND_ACCESS_TOKEN not configured in environment");
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

	it("should reject invalid backendAccessToken", async () => {
		const t = convexTest(testSchema, testModules);
		await expect(
			t.action(api.attachments.uploadAttachmentFromUrl, {
				backendAccessToken: "wrong-token",
				url: "https://example.com/file.jpg",
				filename: "file.jpg",
			}),
		).rejects.toThrow("Invalid BACKEND_ACCESS_TOKEN");
	});

	it("should reject when BACKEND_ACCESS_TOKEN is not configured", async () => {
		delete process.env.BACKEND_ACCESS_TOKEN;

		const t = convexTest(testSchema, testModules);
		await expect(
			t.action(api.attachments.uploadAttachmentFromUrl, {
				backendAccessToken: "any-token",
				url: "https://example.com/file.jpg",
				filename: "file.jpg",
			}),
		).rejects.toThrow("BACKEND_ACCESS_TOKEN not configured in environment");
	});
});
