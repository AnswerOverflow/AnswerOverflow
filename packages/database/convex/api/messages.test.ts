import { it } from "@effect/vitest";
import { Effect } from "effect";
import { describe, expect } from "vitest";
import { ConvexClientTest } from "../../src/convex-client-test";
import { Database } from "../../src/database";
import { DatabaseTestLayer } from "../../src/database-test";
import {
	createAuthor,
	createChannel,
	createMessage,
	createServer,
	enableChannelIndexing,
	makeMessagesPublic,
} from "../../src/test";
import { api, components } from "../_generated/api";

const ADMINISTRATOR = 0x8;

function base64UrlEncode(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let binary = "";
	for (let i = 0; i < bytes.length; i++) {
		binary += String.fromCharCode(bytes[i]!);
	}
	return btoa(binary)
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
}

async function hashApiKey(key: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(key);
	const hashBuffer = await crypto.subtle.digest("SHA-256", data);
	return base64UrlEncode(hashBuffer);
}

describe("api.messages.updateSolution", () => {
	it.scoped("returns tracking payload and ignores idempotent replays", () =>
		Effect.gen(function* () {
			const database = yield* Database;
			const convexClient = yield* ConvexClientTest;
			const { client } = convexClient;

			const server = yield* createServer();
			const forum = yield* createChannel(server.discordId, { type: 15 });
			const thread = yield* createChannel(server.discordId, {
				type: 11,
				parentId: forum.id,
			});

			yield* enableChannelIndexing(forum.id);
			yield* makeMessagesPublic(server.discordId);

			const questionAuthor = yield* createAuthor();
			const answerAuthor = yield* createAuthor();
			const apiCaller = yield* createAuthor();

			const question = yield* createMessage(
				{
					authorId: questionAuthor.id,
					serverId: server.discordId,
					channelId: thread.id,
				},
				{
					id: thread.id,
					parentChannelId: forum.id,
					content: "Question",
				},
			);

			const answer = yield* createMessage(
				{
					authorId: answerAuthor.id,
					serverId: server.discordId,
					channelId: thread.id,
				},
				{
					id: thread.id + 1n,
					parentChannelId: forum.id,
					content: "Answer",
				},
			);

			yield* database.private.user_server_settings.upsertUserServerSettings({
				settings: {
					serverId: server.discordId,
					userId: apiCaller.id,
					permissions: ADMINISTRATOR,
					roleIds: [],
					canPubliclyDisplayMessages: true,
					messageIndexingDisabled: false,
					apiCallsUsed: 0,
				},
			});

			const rawApiKey = "user_test_solution_key";
			const hashedApiKey = yield* Effect.tryPromise(() =>
				hashApiKey(rawApiKey),
			);
			const now = Date.now();

			const createdUser = yield* Effect.tryPromise(() =>
				client.mutation(components.betterAuth.adapter.create, {
					input: {
						model: "user",
						data: {
							name: "API User",
							email: "api-user@example.com",
							emailVerified: true,
							createdAt: now,
							updatedAt: now,
							userId: null,
						},
					},
				}),
			);
			const betterAuthUserId = String(
				createdUser.id ?? createdUser._id ?? "missing-user-id",
			);

			yield* Effect.tryPromise(() =>
				client.mutation(components.betterAuth.adapter.create, {
					input: {
						model: "account",
						data: {
							accountId: apiCaller.id.toString(),
							providerId: "discord",
							userId: betterAuthUserId,
							createdAt: now,
							updatedAt: now,
						},
					},
				}),
			);

			yield* Effect.tryPromise(() =>
				client.mutation(components.betterAuth.adapter.create, {
					input: {
						model: "apikey",
						data: {
							key: hashedApiKey,
							userId: betterAuthUserId,
							createdAt: now,
							updatedAt: now,
							enabled: true,
						},
					},
				}),
			);

			const firstResult = yield* Effect.tryPromise(() =>
				client.mutation(api.api.messages.updateSolution, {
					messageId: question.id,
					solutionId: answer.id,
					apiKey: rawApiKey,
				}),
			);

			expect(firstResult).not.toBeNull();
			expect(firstResult?.channel.id).toBe(forum.id.toString());
			expect(firstResult?.thread.id).toBe(thread.id.toString());
			expect(firstResult?.questionSolver.id).toBe(answerAuthor.id.toString());
			expect(firstResult?.markAsSolver.id).toBe(apiCaller.id.toString());
			expect(firstResult?.accountId).toBe(answerAuthor.id.toString());

			const storedAnswer = yield* database.private.messages.getMessageById(
				{ id: answer.id },
				{ subscribe: false },
			);
			expect(storedAnswer?.questionId).toBe(question.id);

			const secondResult = yield* Effect.tryPromise(() =>
				client.mutation(api.api.messages.updateSolution, {
					messageId: question.id,
					solutionId: answer.id,
					apiKey: rawApiKey,
				}),
			);

			expect(secondResult).toBeNull();
		}).pipe(Effect.provide(DatabaseTestLayer)),
	);
});
