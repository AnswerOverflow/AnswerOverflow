import { convexTest } from "@packages/convex-test";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { api } from "../_generated/api";

const testSchema = defineSchema({
	servers: defineTable({
		discordId: v.string(),
		name: v.string(),
	}),
	serverPreferences: defineTable({
		serverId: v.id("servers"),
	}).index("by_serverId", ["serverId"]),
});

const normalizePath = (path: string): string => {
	if (path.startsWith("../")) {
		return `/convex/${path.replace(/^\.\.\//, "")}`;
	}
	if (path.startsWith("./")) {
		return `/convex/private/${path.replace(/^\.\//, "")}`;
	}
	return path;
};

const rawModules = {
	...import.meta.glob("./**/*.ts"),
	...import.meta.glob("../_generated/**/*.{ts,js}"),
	...import.meta.glob("../shared/**/*.ts"),
	...import.meta.glob("../public/**/*.ts"),
	...import.meta.glob("../private/**/*.ts"),
};

const testModules = Object.fromEntries(
	Object.entries(rawModules).map(([path, module]) => [
		normalizePath(path),
		module,
	]),
);

describe("privateQuery", () => {
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
		const serverId = await t.run(async (ctx) => {
			return await ctx.db.insert("servers", {
				discordId: "123456789",
				name: "Test Server",
			});
		});

		await expect(
			t.query(api.private.server_preferences.getServerPreferencesByServerId, {
				backendAccessToken: "wrong-token",
				serverId,
			}),
		).rejects.toThrow("Invalid BACKEND_ACCESS_TOKEN");
	});

	it("should reject when BACKEND_ACCESS_TOKEN is not configured", async () => {
		delete process.env.BACKEND_ACCESS_TOKEN;

		const t = convexTest(testSchema, testModules);
		const serverId = await t.run(async (ctx) => {
			return await ctx.db.insert("servers", {
				discordId: "123456789",
				name: "Test Server",
			});
		});

		await expect(
			t.query(api.private.server_preferences.getServerPreferencesByServerId, {
				backendAccessToken: "any-token",
				serverId,
			}),
		).rejects.toThrow("BACKEND_ACCESS_TOKEN not configured in environment");
	});
});

describe("privateMutation", () => {
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
		const serverId = await t.run(async (ctx) => {
			return await ctx.db.insert("servers", {
				discordId: "123456789",
				name: "Test Server",
			});
		});

		await expect(
			t.mutation(api.private.server_preferences.createServerPreferences, {
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
		const serverId = await t.run(async (ctx) => {
			return await ctx.db.insert("servers", {
				discordId: "123456789",
				name: "Test Server",
			});
		});

		await expect(
			t.mutation(api.private.server_preferences.createServerPreferences, {
				backendAccessToken: "any-token",
				preferences: {
					serverId,
				},
			}),
		).rejects.toThrow("BACKEND_ACCESS_TOKEN not configured in environment");
	});
});

describe("privateAction", () => {
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
			t.action(api.private.attachments.uploadAttachmentFromUrl, {
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
			t.action(api.private.attachments.uploadAttachmentFromUrl, {
				backendAccessToken: "any-token",
				url: "https://example.com/file.jpg",
				filename: "file.jpg",
			}),
		).rejects.toThrow("BACKEND_ACCESS_TOKEN not configured in environment");
	});
});
