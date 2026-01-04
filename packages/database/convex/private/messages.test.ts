import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { Database } from "../../src/database";
import { DatabaseTestLayer } from "../../src/database-test";
import {
	createAuthor,
	createChannel,
	createForumThreadWithReplies,
	createMessage,
	createServer,
	enableChannelIndexing,
	makeMessagesPublic,
} from "../../src/test";

describe("messages", () => {
	describe("upsertMessage", () => {
		it.scoped("should create a new message", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const server = yield* createServer();
				const channel = yield* createChannel(server.discordId);
				const author = yield* createAuthor();
				const messageId = BigInt(Date.now());

				yield* database.private.messages.upsertMessage({
					message: {
						id: messageId,
						authorId: author.id,
						serverId: server.discordId,
						channelId: channel.id,
						content: "Hello world",
					},
					ignoreChecks: true,
				});

				const message = yield* database.private.messages.getMessageById(
					{ id: messageId },
					{ subscribe: false },
				);
				expect(message).not.toBeNull();
				expect(message?.content).toBe("Hello world");
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should update an existing message", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const fixture = yield* createForumThreadWithReplies();
				const message = yield* fixture.addMessage({ content: "Original" });

				yield* database.private.messages.upsertMessage({
					message: {
						...message,
						content: "Updated",
					},
					ignoreChecks: true,
				});

				const updated = yield* database.private.messages.getMessageById(
					{ id: message.id },
					{ subscribe: false },
				);
				expect(updated?.content).toBe("Updated");
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});

	describe("upsertManyMessages", () => {
		it.scoped("should create multiple messages", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const server = yield* createServer();
				const channel = yield* createChannel(server.discordId);
				const author = yield* createAuthor();

				const messages = [
					{
						message: {
							id: BigInt(Date.now()),
							authorId: author.id,
							serverId: server.discordId,
							channelId: channel.id,
							content: "Message 1",
						},
					},
					{
						message: {
							id: BigInt(Date.now() + 1),
							authorId: author.id,
							serverId: server.discordId,
							channelId: channel.id,
							content: "Message 2",
						},
					},
				];

				const result = yield* database.private.messages.upsertManyMessages({
					messages,
					ignoreChecks: true,
				});

				expect(result.created.length).toBe(2);
				expect(result.ignored.length).toBe(0);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should return empty for empty input", () =>
			Effect.gen(function* () {
				const database = yield* Database;

				const result = yield* database.private.messages.upsertManyMessages({
					messages: [],
					ignoreChecks: true,
				});

				expect(result.created).toEqual([]);
				expect(result.ignored).toEqual([]);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});

	describe("getMessageById", () => {
		it.scoped("should return null for non-existent message", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const nonExistentId = BigInt(999999999999);

				const result = yield* database.private.messages.getMessageById(
					{ id: nonExistentId },
					{ subscribe: false },
				);

				expect(result).toBeNull();
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should return existing message", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const fixture = yield* createForumThreadWithReplies();
				const message = yield* fixture.addMessage({ content: "Find me" });

				const result = yield* database.private.messages.getMessageById(
					{ id: message.id },
					{ subscribe: false },
				);

				expect(result).not.toBeNull();
				expect(result?.content).toBe("Find me");
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});

	describe("deleteMessage", () => {
		it.scoped("should delete a message", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const fixture = yield* createForumThreadWithReplies();
				const message = yield* fixture.addMessage({ content: "Delete me" });

				yield* database.private.messages.deleteMessage({ id: message.id });

				const deleted = yield* database.private.messages.getMessageById(
					{ id: message.id },
					{ subscribe: false },
				);
				expect(deleted).toBeNull();
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});

	describe("deleteManyMessages", () => {
		it.scoped("should delete multiple messages", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const fixture = yield* createForumThreadWithReplies();
				const msg1 = yield* fixture.addMessage({ content: "Delete 1" });
				const msg2 = yield* fixture.addMessage({ content: "Delete 2" });

				yield* database.private.messages.deleteManyMessages({
					ids: [msg1.id, msg2.id],
				});

				const deleted1 = yield* database.private.messages.getMessageById(
					{ id: msg1.id },
					{ subscribe: false },
				);
				const deleted2 = yield* database.private.messages.getMessageById(
					{ id: msg2.id },
					{ subscribe: false },
				);
				expect(deleted1).toBeNull();
				expect(deleted2).toBeNull();
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});

	describe("markMessageAsSolution", () => {
		it.scoped("should mark a message as solution", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const fixture = yield* createForumThreadWithReplies();
				const question = yield* fixture.addRootMessage();
				const answer = yield* fixture.addMessage({
					content: "This is the answer",
				});

				yield* database.private.messages.markMessageAsSolution({
					solutionMessageId: answer.id,
					questionMessageId: question.id,
				});

				const updated = yield* database.private.messages.getMessageById(
					{ id: answer.id },
					{ subscribe: false },
				);
				expect(updated?.questionId).toBe(question.id);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});

	describe("getTopQuestionSolversByServerId", () => {
		it.scoped("should return top solvers", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const server = yield* createServer();
				const channel = yield* createChannel(server.discordId, { type: 15 });
				const author1 = yield* createAuthor({ name: "Solver1" });
				const author2 = yield* createAuthor({ name: "Solver2" });

				yield* enableChannelIndexing(channel.id);
				yield* makeMessagesPublic(server.discordId);

				const question1Id = BigInt(Date.now());
				const question2Id = BigInt(Date.now() + 1);

				yield* createMessage(
					{
						authorId: author1.id,
						serverId: server.discordId,
						channelId: channel.id,
					},
					{ id: question1Id, content: "Question 1" },
				);

				yield* createMessage(
					{
						authorId: author1.id,
						serverId: server.discordId,
						channelId: channel.id,
					},
					{
						id: BigInt(Date.now() + 10),
						content: "Answer 1",
						questionId: question1Id,
					},
				);

				yield* createMessage(
					{
						authorId: author1.id,
						serverId: server.discordId,
						channelId: channel.id,
					},
					{
						id: BigInt(Date.now() + 11),
						content: "Answer 2",
						questionId: question2Id,
					},
				);

				yield* createMessage(
					{
						authorId: author2.id,
						serverId: server.discordId,
						channelId: channel.id,
					},
					{
						id: BigInt(Date.now() + 12),
						content: "Answer 3",
						questionId: question1Id,
					},
				);

				const topSolvers =
					yield* database.private.messages.getTopQuestionSolversByServerId(
						{ serverId: server.discordId, limit: 10 },
						{ subscribe: false },
					);

				expect(topSolvers.length).toBeGreaterThanOrEqual(1);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});
});
