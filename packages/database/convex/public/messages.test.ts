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
	createTextChannelThreadWithReplies,
	createTextChannelWithMessages,
	enableChannelIndexing,
	makeMessagesPublic,
} from "../../src/test";

describe("getMessages", () => {
	describe("forum channel thread", () => {
		it.scoped("should return messages after the specified message id", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const fixture = yield* createForumThreadWithReplies();

				const rootMessage = yield* fixture.addRootMessage();
				const reply1 = yield* fixture.addMessage({ content: "First reply" });
				const reply2 = yield* fixture.addMessage({ content: "Second reply" });

				const result = yield* database.public.messages.getMessages(
					{
						channelId: fixture.thread.id,
						after: rootMessage.id,
						paginationOpts: { numItems: 10, cursor: null },
					},
					{ subscribe: false },
				);

				expect(result.page).toHaveLength(2);
				expect(result.isDone).toBe(true);

				const messageIds = result.page.map((m) => m.message.id);
				expect(messageIds).not.toContain(rootMessage.id);
				expect(messageIds).toContain(reply1.id);
				expect(messageIds).toContain(reply2.id);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped(
			"should return empty page when no messages after the specified id",
			() =>
				Effect.gen(function* () {
					const database = yield* Database;
					const fixture = yield* createForumThreadWithReplies();

					const rootMessage = yield* fixture.addRootMessage();

					const result = yield* database.public.messages.getMessages(
						{
							channelId: fixture.thread.id,
							after: rootMessage.id,
							paginationOpts: { numItems: 10, cursor: null },
						},
						{ subscribe: false },
					);

					expect(result.page).toHaveLength(0);
					expect(result.isDone).toBe(true);
				}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should paginate results correctly", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const fixture = yield* createForumThreadWithReplies();

				const rootMessage = yield* fixture.addRootMessage();
				yield* fixture.addMessage();
				yield* fixture.addMessage();
				yield* fixture.addMessage();

				const page1 = yield* database.public.messages.getMessages(
					{
						channelId: fixture.thread.id,
						after: rootMessage.id,
						paginationOpts: { numItems: 2, cursor: null },
					},
					{ subscribe: false },
				);

				expect(page1.page).toHaveLength(2);
				expect(page1.isDone).toBe(false);

				const page2 = yield* database.public.messages.getMessages(
					{
						channelId: fixture.thread.id,
						after: rootMessage.id,
						paginationOpts: { numItems: 2, cursor: page1.continueCursor },
					},
					{ subscribe: false },
				);

				expect(page2.page).toHaveLength(1);
				expect(page2.isDone).toBe(true);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should return enriched message data with author info", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const fixture = yield* createForumThreadWithReplies();

				const rootMessage = yield* fixture.addRootMessage();
				yield* fixture.addMessage({ content: "Test content" });

				const result = yield* database.public.messages.getMessages(
					{
						channelId: fixture.thread.id,
						after: rootMessage.id,
						paginationOpts: { numItems: 10, cursor: null },
					},
					{ subscribe: false },
				);

				expect(result.page[0]?.author).not.toBeNull();
				expect(result.page[0]?.author?.id).toBe(fixture.author.id);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});

	describe("text channel thread", () => {
		it.scoped("should return messages after the specified message id", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const fixture = yield* createTextChannelThreadWithReplies();

				const rootMessage = yield* fixture.addRootMessage();
				const reply1 = yield* fixture.addMessage({ content: "First reply" });
				const reply2 = yield* fixture.addMessage({ content: "Second reply" });

				const result = yield* database.public.messages.getMessages(
					{
						channelId: fixture.thread.id,
						after: rootMessage.id,
						paginationOpts: { numItems: 10, cursor: null },
					},
					{ subscribe: false },
				);

				expect(result.page).toHaveLength(2);
				expect(result.isDone).toBe(true);

				const messageIds = result.page.map((m) => m.message.id);
				expect(messageIds).not.toContain(rootMessage.id);
				expect(messageIds).toContain(reply1.id);
				expect(messageIds).toContain(reply2.id);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped(
			"should return empty page when no messages after the specified id",
			() =>
				Effect.gen(function* () {
					const database = yield* Database;
					const fixture = yield* createTextChannelThreadWithReplies();

					const rootMessage = yield* fixture.addRootMessage();

					const result = yield* database.public.messages.getMessages(
						{
							channelId: fixture.thread.id,
							after: rootMessage.id,
							paginationOpts: { numItems: 10, cursor: null },
						},
						{ subscribe: false },
					);

					expect(result.page).toHaveLength(0);
					expect(result.isDone).toBe(true);
				}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should paginate results correctly", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const fixture = yield* createTextChannelThreadWithReplies();

				const rootMessage = yield* fixture.addRootMessage();
				yield* fixture.addMessage();
				yield* fixture.addMessage();
				yield* fixture.addMessage();

				const page1 = yield* database.public.messages.getMessages(
					{
						channelId: fixture.thread.id,
						after: rootMessage.id,
						paginationOpts: { numItems: 2, cursor: null },
					},
					{ subscribe: false },
				);

				expect(page1.page).toHaveLength(2);
				expect(page1.isDone).toBe(false);

				const page2 = yield* database.public.messages.getMessages(
					{
						channelId: fixture.thread.id,
						after: rootMessage.id,
						paginationOpts: { numItems: 2, cursor: page1.continueCursor },
					},
					{ subscribe: false },
				);

				expect(page2.page).toHaveLength(1);
				expect(page2.isDone).toBe(true);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should return enriched message data with author info", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const fixture = yield* createTextChannelThreadWithReplies();

				const rootMessage = yield* fixture.addRootMessage();
				yield* fixture.addMessage({ content: "Test content" });

				const result = yield* database.public.messages.getMessages(
					{
						channelId: fixture.thread.id,
						after: rootMessage.id,
						paginationOpts: { numItems: 10, cursor: null },
					},
					{ subscribe: false },
				);

				expect(result.page[0]?.author).not.toBeNull();
				expect(result.page[0]?.author?.id).toBe(fixture.author.id);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});

	describe("regular text channel", () => {
		it.scoped("should return messages after the specified message id", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const fixture = yield* createTextChannelWithMessages();

				const msg1 = yield* fixture.addMessage({ content: "First message" });
				const msg2 = yield* fixture.addMessage({ content: "Second message" });
				const msg3 = yield* fixture.addMessage({ content: "Third message" });

				const result = yield* database.public.messages.getMessages(
					{
						channelId: fixture.channel.id,
						after: msg1.id,
						paginationOpts: { numItems: 10, cursor: null },
					},
					{ subscribe: false },
				);

				expect(result.page).toHaveLength(2);
				expect(result.isDone).toBe(true);

				const messageIds = result.page.map((m) => m.message.id);
				expect(messageIds).not.toContain(msg1.id);
				expect(messageIds).toContain(msg2.id);
				expect(messageIds).toContain(msg3.id);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped(
			"should return empty page when no messages after the specified id",
			() =>
				Effect.gen(function* () {
					const database = yield* Database;
					const fixture = yield* createTextChannelWithMessages();

					const msg1 = yield* fixture.addMessage({ content: "Only message" });

					const result = yield* database.public.messages.getMessages(
						{
							channelId: fixture.channel.id,
							after: msg1.id,
							paginationOpts: { numItems: 10, cursor: null },
						},
						{ subscribe: false },
					);

					expect(result.page).toHaveLength(0);
					expect(result.isDone).toBe(true);
				}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should paginate results correctly", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const fixture = yield* createTextChannelWithMessages();

				const firstMsg = yield* fixture.addMessage();
				yield* fixture.addMessage();
				yield* fixture.addMessage();
				yield* fixture.addMessage();

				const page1 = yield* database.public.messages.getMessages(
					{
						channelId: fixture.channel.id,
						after: firstMsg.id,
						paginationOpts: { numItems: 2, cursor: null },
					},
					{ subscribe: false },
				);

				expect(page1.page).toHaveLength(2);
				expect(page1.isDone).toBe(false);

				const page2 = yield* database.public.messages.getMessages(
					{
						channelId: fixture.channel.id,
						after: firstMsg.id,
						paginationOpts: { numItems: 2, cursor: page1.continueCursor },
					},
					{ subscribe: false },
				);

				expect(page2.page).toHaveLength(1);
				expect(page2.isDone).toBe(true);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should return enriched message data with author info", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const fixture = yield* createTextChannelWithMessages();

				const firstMsg = yield* fixture.addMessage({ content: "First" });
				yield* fixture.addMessage({ content: "Test content" });

				const result = yield* database.public.messages.getMessages(
					{
						channelId: fixture.channel.id,
						after: firstMsg.id,
						paginationOpts: { numItems: 10, cursor: null },
					},
					{ subscribe: false },
				);

				expect(result.page[0]?.author).not.toBeNull();
				expect(result.page[0]?.author?.id).toBe(fixture.author.id);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});

	describe("ordering", () => {
		it.scoped(
			"should order messages by bigint id ascending, not by insertion order",
			() =>
				Effect.gen(function* () {
					const database = yield* Database;
					const server = yield* createServer();
					const channel = yield* createChannel(server.discordId, { type: 0 });
					const author = yield* createAuthor();

					yield* enableChannelIndexing(channel.id);
					yield* makeMessagesPublic(server.discordId);

					const base = {
						authorId: author.id,
						serverId: server.discordId,
						channelId: channel.id,
					};

					const id1 = 1000000000000000100n;
					const id2 = 1000000000000000200n;
					const id3 = 1000000000000000300n;

					yield* createMessage(base, { id: id3, content: "Third by id" });
					yield* createMessage(base, { id: id1, content: "First by id" });
					yield* createMessage(base, { id: id2, content: "Second by id" });

					const result = yield* database.public.messages.getMessages(
						{
							channelId: channel.id,
							after: 0n,
							paginationOpts: { numItems: 10, cursor: null },
						},
						{ subscribe: false },
					);

					expect(result.page).toHaveLength(3);
					expect(result.page[0]?.message.id).toBe(id1);
					expect(result.page[1]?.message.id).toBe(id2);
					expect(result.page[2]?.message.id).toBe(id3);
				}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped(
			"should correctly filter messages after a specific id regardless of insertion order",
			() =>
				Effect.gen(function* () {
					const database = yield* Database;
					const server = yield* createServer();
					const channel = yield* createChannel(server.discordId, { type: 0 });
					const author = yield* createAuthor();

					yield* enableChannelIndexing(channel.id);
					yield* makeMessagesPublic(server.discordId);

					const base = {
						authorId: author.id,
						serverId: server.discordId,
						channelId: channel.id,
					};

					const id1 = 1000000000000000100n;
					const id2 = 1000000000000000200n;
					const id3 = 1000000000000000300n;
					const id4 = 1000000000000000400n;

					yield* createMessage(base, { id: id4 });
					yield* createMessage(base, { id: id1 });
					yield* createMessage(base, { id: id3 });
					yield* createMessage(base, { id: id2 });

					const result = yield* database.public.messages.getMessages(
						{
							channelId: channel.id,
							after: id2,
							paginationOpts: { numItems: 10, cursor: null },
						},
						{ subscribe: false },
					);

					expect(result.page).toHaveLength(2);
					expect(result.page[0]?.message.id).toBe(id3);
					expect(result.page[1]?.message.id).toBe(id4);
				}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should handle messages with very close bigint ids", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const server = yield* createServer();
				const channel = yield* createChannel(server.discordId, { type: 0 });
				const author = yield* createAuthor();

				yield* enableChannelIndexing(channel.id);
				yield* makeMessagesPublic(server.discordId);

				const base = {
					authorId: author.id,
					serverId: server.discordId,
					channelId: channel.id,
				};

				const baseId = 1000000000000000000n;
				yield* createMessage(base, { id: baseId + 3n });
				yield* createMessage(base, { id: baseId + 1n });
				yield* createMessage(base, { id: baseId + 2n });

				const result = yield* database.public.messages.getMessages(
					{
						channelId: channel.id,
						after: baseId,
						paginationOpts: { numItems: 10, cursor: null },
					},
					{ subscribe: false },
				);

				expect(result.page).toHaveLength(3);
				expect(result.page[0]?.message.id).toBe(baseId + 1n);
				expect(result.page[1]?.message.id).toBe(baseId + 2n);
				expect(result.page[2]?.message.id).toBe(baseId + 3n);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped(
			"should maintain order across pagination with reverse insertion",
			() =>
				Effect.gen(function* () {
					const database = yield* Database;
					const server = yield* createServer();
					const channel = yield* createChannel(server.discordId, { type: 0 });
					const author = yield* createAuthor();

					yield* enableChannelIndexing(channel.id);
					yield* makeMessagesPublic(server.discordId);

					const base = {
						authorId: author.id,
						serverId: server.discordId,
						channelId: channel.id,
					};

					const ids = [
						1000000000000000500n,
						1000000000000000400n,
						1000000000000000300n,
						1000000000000000200n,
						1000000000000000100n,
					];

					for (const id of ids) {
						yield* createMessage(base, { id });
					}

					const page1 = yield* database.public.messages.getMessages(
						{
							channelId: channel.id,
							after: 0n,
							paginationOpts: { numItems: 2, cursor: null },
						},
						{ subscribe: false },
					);

					expect(page1.page).toHaveLength(2);
					expect(page1.page[0]?.message.id).toBe(1000000000000000100n);
					expect(page1.page[1]?.message.id).toBe(1000000000000000200n);
					expect(page1.isDone).toBe(false);

					const page2 = yield* database.public.messages.getMessages(
						{
							channelId: channel.id,
							after: 0n,
							paginationOpts: { numItems: 2, cursor: page1.continueCursor },
						},
						{ subscribe: false },
					);

					expect(page2.page).toHaveLength(2);
					expect(page2.page[0]?.message.id).toBe(1000000000000000300n);
					expect(page2.page[1]?.message.id).toBe(1000000000000000400n);
				}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});

	describe("multi-author", () => {
		it.scoped("should return messages from multiple authors", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const server = yield* createServer();
				const channel = yield* createChannel(server.discordId, { type: 0 });
				const author1 = yield* createAuthor();
				const author2 = yield* createAuthor();

				yield* enableChannelIndexing(channel.id);
				yield* makeMessagesPublic(server.discordId);

				const baseId = 1000000000000000000n;

				yield* createMessage(
					{
						authorId: author1.id,
						serverId: server.discordId,
						channelId: channel.id,
					},
					{ id: baseId + 1n },
				);
				yield* createMessage(
					{
						authorId: author2.id,
						serverId: server.discordId,
						channelId: channel.id,
					},
					{ id: baseId + 2n },
				);
				yield* createMessage(
					{
						authorId: author1.id,
						serverId: server.discordId,
						channelId: channel.id,
					},
					{ id: baseId + 3n },
				);

				const result = yield* database.public.messages.getMessages(
					{
						channelId: channel.id,
						after: baseId,
						paginationOpts: { numItems: 10, cursor: null },
					},
					{ subscribe: false },
				);

				expect(result.page).toHaveLength(3);
				expect(result.page[0]?.author?.id).toBe(author1.id);
				expect(result.page[1]?.author?.id).toBe(author2.id);
				expect(result.page[2]?.author?.id).toBe(author1.id);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});
});

describe("privacy filtering", () => {
	it.scoped(
		"should filter out messages when server is private and no considerAllMessagesPublicEnabled",
		() =>
			Effect.gen(function* () {
				const database = yield* Database;
				const server = yield* createServer();
				const channel = yield* createChannel(server.discordId, { type: 0 });
				const author = yield* createAuthor();

				yield* enableChannelIndexing(channel.id);

				const baseId = 1000000000000000000n;

				yield* createMessage(
					{
						authorId: author.id,
						serverId: server.discordId,
						channelId: channel.id,
					},
					{ id: baseId + 1n },
				);

				const result = yield* database.public.messages.getMessages(
					{
						channelId: channel.id,
						after: baseId,
						paginationOpts: { numItems: 10, cursor: null },
					},
					{ subscribe: false },
				);

				expect(result.page).toHaveLength(0);
			}).pipe(Effect.provide(DatabaseTestLayer)),
	);

	it.scoped(
		"should show messages when server has considerAllMessagesPublicEnabled",
		() =>
			Effect.gen(function* () {
				const database = yield* Database;
				const server = yield* createServer();
				const channel = yield* createChannel(server.discordId, { type: 0 });
				const author = yield* createAuthor();

				yield* enableChannelIndexing(channel.id);
				yield* makeMessagesPublic(server.discordId);

				const baseId = 1000000000000000000n;

				yield* createMessage(
					{
						authorId: author.id,
						serverId: server.discordId,
						channelId: channel.id,
					},
					{ id: baseId + 1n },
				);

				const result = yield* database.public.messages.getMessages(
					{
						channelId: channel.id,
						after: baseId,
						paginationOpts: { numItems: 10, cursor: null },
					},
					{ subscribe: false },
				);

				expect(result.page).toHaveLength(1);
			}).pipe(Effect.provide(DatabaseTestLayer)),
	);

	it.scoped(
		"should show messages when author has canPubliclyDisplayMessages consent",
		() =>
			Effect.gen(function* () {
				const database = yield* Database;
				const server = yield* createServer();
				const channel = yield* createChannel(server.discordId, { type: 0 });
				const author = yield* createAuthor();

				yield* enableChannelIndexing(channel.id);

				yield* database.private.user_server_settings.upsertUserServerSettings({
					settings: {
						userId: author.id,
						serverId: server.discordId,
						permissions: 0,
						canPubliclyDisplayMessages: true,
						messageIndexingDisabled: false,
						apiCallsUsed: 0,
					},
				});

				const baseId = 1000000000000000000n;

				yield* createMessage(
					{
						authorId: author.id,
						serverId: server.discordId,
						channelId: channel.id,
					},
					{ id: baseId + 1n },
				);

				const result = yield* database.public.messages.getMessages(
					{
						channelId: channel.id,
						after: baseId,
						paginationOpts: { numItems: 10, cursor: null },
					},
					{ subscribe: false },
				);

				expect(result.page).toHaveLength(1);
			}).pipe(Effect.provide(DatabaseTestLayer)),
	);

	it.scoped(
		"should filter messages when author has messageIndexingDisabled",
		() =>
			Effect.gen(function* () {
				const database = yield* Database;
				const server = yield* createServer();
				const channel = yield* createChannel(server.discordId, { type: 0 });
				const author = yield* createAuthor();

				yield* enableChannelIndexing(channel.id);
				yield* makeMessagesPublic(server.discordId);

				yield* database.private.user_server_settings.upsertUserServerSettings({
					settings: {
						userId: author.id,
						serverId: server.discordId,
						permissions: 0,
						canPubliclyDisplayMessages: false,
						messageIndexingDisabled: true,
						apiCallsUsed: 0,
					},
				});

				const baseId = 1000000000000000000n;

				yield* createMessage(
					{
						authorId: author.id,
						serverId: server.discordId,
						channelId: channel.id,
					},
					{ id: baseId + 1n },
				);

				const result = yield* database.public.messages.getMessages(
					{
						channelId: channel.id,
						after: baseId,
						paginationOpts: { numItems: 10, cursor: null },
					},
					{ subscribe: false },
				);

				expect(result.page).toHaveLength(1);
			}).pipe(Effect.provide(DatabaseTestLayer)),
	);

	it.scoped(
		"should show messages from multiple authors with mixed privacy settings",
		() =>
			Effect.gen(function* () {
				const database = yield* Database;
				const server = yield* createServer();
				const channel = yield* createChannel(server.discordId, { type: 0 });
				const publicAuthor = yield* createAuthor();
				const privateAuthor = yield* createAuthor();

				yield* enableChannelIndexing(channel.id);

				yield* database.private.user_server_settings.upsertUserServerSettings({
					settings: {
						userId: publicAuthor.id,
						serverId: server.discordId,
						permissions: 0,
						canPubliclyDisplayMessages: true,
						messageIndexingDisabled: false,
						apiCallsUsed: 0,
					},
				});

				const baseId = 1000000000000000000n;

				yield* createMessage(
					{
						authorId: publicAuthor.id,
						serverId: server.discordId,
						channelId: channel.id,
					},
					{ id: baseId + 1n },
				);
				yield* createMessage(
					{
						authorId: privateAuthor.id,
						serverId: server.discordId,
						channelId: channel.id,
					},
					{ id: baseId + 2n },
				);
				yield* createMessage(
					{
						authorId: publicAuthor.id,
						serverId: server.discordId,
						channelId: channel.id,
					},
					{ id: baseId + 3n },
				);

				const result = yield* database.public.messages.getMessages(
					{
						channelId: channel.id,
						after: baseId,
						paginationOpts: { numItems: 10, cursor: null },
					},
					{ subscribe: false },
				);

				expect(result.page).toHaveLength(2);
				const authorIds = result.page.map((p) => p.author?.id);
				expect(authorIds).toContain(publicAuthor.id);
				expect(authorIds).not.toContain(privateAuthor.id);
			}).pipe(Effect.provide(DatabaseTestLayer)),
	);
});

describe("getMessagePageHeaderData", () => {
	it.scoped("should return null for non-existent message", () =>
		Effect.gen(function* () {
			const database = yield* Database;

			const result = yield* database.public.messages.getMessagePageHeaderData(
				{ messageId: 999999999999999999n },
				{ subscribe: false },
			);

			expect(result).toBeNull();
		}).pipe(Effect.provide(DatabaseTestLayer)),
	);

	it.scoped("should return null when indexing is disabled", () =>
		Effect.gen(function* () {
			const database = yield* Database;
			const server = yield* createServer();
			const forum = yield* createChannel(server.discordId, { type: 15 });
			const thread = yield* createChannel(server.discordId, {
				type: 11,
				parentId: forum.id,
			});
			const author = yield* createAuthor();

			yield* makeMessagesPublic(server.discordId);

			yield* createMessage(
				{
					authorId: author.id,
					serverId: server.discordId,
					channelId: thread.id,
				},
				{ id: thread.id, parentChannelId: forum.id },
			);

			const result = yield* database.public.messages.getMessagePageHeaderData(
				{ messageId: thread.id },
				{ subscribe: false },
			);

			expect(result).toBeNull();
		}).pipe(Effect.provide(DatabaseTestLayer)),
	);
});
