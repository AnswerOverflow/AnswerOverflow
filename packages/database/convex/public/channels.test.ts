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
	createTextChannelWithMessages,
	enableChannelIndexing,
	makeMessagesPublic,
} from "../../src/test";

describe("public/channels", () => {
	describe("getChannelPageThreads", () => {
		it.scoped("should return threads for a forum channel", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const fixture = yield* createForumThreadWithReplies();
				yield* fixture.addRootMessage();

				const result = yield* database.public.channels.getChannelPageThreads(
					{
						channelDiscordId: fixture.forum.id,
						paginationOpts: { numItems: 10, cursor: null },
					},
					{ subscribe: false },
				);

				expect(result.page.length).toBeGreaterThanOrEqual(1);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should paginate threads", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const server = yield* createServer();
				const forum = yield* createChannel(server.discordId, { type: 15 });
				yield* enableChannelIndexing(forum.id);
				yield* makeMessagesPublic(server.discordId);

				yield* createChannel(server.discordId, {
					type: 11,
					parentId: forum.id,
				});
				yield* createChannel(server.discordId, {
					type: 11,
					parentId: forum.id,
				});
				yield* createChannel(server.discordId, {
					type: 11,
					parentId: forum.id,
				});

				const page1 = yield* database.public.channels.getChannelPageThreads(
					{
						channelDiscordId: forum.id,
						paginationOpts: { numItems: 2, cursor: null },
					},
					{ subscribe: false },
				);

				expect(page1.page.length).toBe(2);
				expect(page1.isDone).toBe(false);

				const page2 = yield* database.public.channels.getChannelPageThreads(
					{
						channelDiscordId: forum.id,
						paginationOpts: { numItems: 2, cursor: page1.continueCursor },
					},
					{ subscribe: false },
				);

				expect(page2.page.length).toBeGreaterThanOrEqual(1);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should return empty for channel with no threads", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const server = yield* createServer();
				const forum = yield* createChannel(server.discordId, { type: 15 });

				const result = yield* database.public.channels.getChannelPageThreads(
					{
						channelDiscordId: forum.id,
						paginationOpts: { numItems: 10, cursor: null },
					},
					{ subscribe: false },
				);

				expect(result.page).toEqual([]);
				expect(result.isDone).toBe(true);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped(
			"should return threads in descending order by id regardless of insertion order",
			() =>
				Effect.gen(function* () {
					const database = yield* Database;
					const server = yield* createServer();
					const forum = yield* createChannel(server.discordId, { type: 15 });
					yield* enableChannelIndexing(forum.id);
					yield* makeMessagesPublic(server.discordId);

					const thread1 = yield* createChannel(server.discordId, {
						id: 1000000000000000100n,
						type: 11,
						parentId: forum.id,
					});
					const thread2 = yield* createChannel(server.discordId, {
						id: 1000000000000000300n,
						type: 11,
						parentId: forum.id,
					});
					const thread3 = yield* createChannel(server.discordId, {
						id: 1000000000000000200n,
						type: 11,
						parentId: forum.id,
					});

					const result = yield* database.public.channels.getChannelPageThreads(
						{
							channelDiscordId: forum.id,
							paginationOpts: { numItems: 10, cursor: null },
						},
						{ subscribe: false },
					);

					expect(result.page).toHaveLength(3);
					expect(result.page[0]?.thread.id).toBe(thread2.id);
					expect(result.page[1]?.thread.id).toBe(thread3.id);
					expect(result.page[2]?.thread.id).toBe(thread1.id);
				}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped(
			"should maintain descending order across pagination with reverse insertion",
			() =>
				Effect.gen(function* () {
					const database = yield* Database;
					const server = yield* createServer();
					const forum = yield* createChannel(server.discordId, { type: 15 });
					yield* enableChannelIndexing(forum.id);
					yield* makeMessagesPublic(server.discordId);

					yield* createChannel(server.discordId, {
						id: 1000000000000000100n,
						type: 11,
						parentId: forum.id,
					});
					yield* createChannel(server.discordId, {
						id: 1000000000000000200n,
						type: 11,
						parentId: forum.id,
					});
					yield* createChannel(server.discordId, {
						id: 1000000000000000300n,
						type: 11,
						parentId: forum.id,
					});
					yield* createChannel(server.discordId, {
						id: 1000000000000000400n,
						type: 11,
						parentId: forum.id,
					});

					const page1 = yield* database.public.channels.getChannelPageThreads(
						{
							channelDiscordId: forum.id,
							paginationOpts: { numItems: 2, cursor: null },
						},
						{ subscribe: false },
					);

					expect(page1.page).toHaveLength(2);
					expect(page1.page[0]?.thread.id).toBe(1000000000000000400n);
					expect(page1.page[1]?.thread.id).toBe(1000000000000000300n);

					const page2 = yield* database.public.channels.getChannelPageThreads(
						{
							channelDiscordId: forum.id,
							paginationOpts: { numItems: 2, cursor: page1.continueCursor },
						},
						{ subscribe: false },
					);

					expect(page2.page).toHaveLength(2);
					expect(page2.page[0]?.thread.id).toBe(1000000000000000200n);
					expect(page2.page[1]?.thread.id).toBe(1000000000000000100n);
				}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});

	describe("getChannelPageMessages", () => {
		it.scoped("should return messages for a channel", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const fixture = yield* createTextChannelWithMessages();
				yield* fixture.addMessage({ content: "First message" });
				yield* fixture.addMessage({ content: "Second message" });

				const result = yield* database.public.channels.getChannelPageMessages(
					{
						channelDiscordId: fixture.channel.id,
						paginationOpts: { numItems: 10, cursor: null },
					},
					{ subscribe: false },
				);

				expect(result.page.length).toBe(2);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should paginate messages", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const fixture = yield* createTextChannelWithMessages();
				yield* fixture.addMessage();
				yield* fixture.addMessage();
				yield* fixture.addMessage();

				const page1 = yield* database.public.channels.getChannelPageMessages(
					{
						channelDiscordId: fixture.channel.id,
						paginationOpts: { numItems: 2, cursor: null },
					},
					{ subscribe: false },
				);

				expect(page1.page.length).toBe(2);
				expect(page1.isDone).toBe(false);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped(
			"should return messages in descending order by id regardless of insertion order",
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

					const msg1 = yield* createMessage(base, {
						id: 1000000000000000100n,
						parentChannelId: undefined,
					});
					const msg2 = yield* createMessage(base, {
						id: 1000000000000000300n,
						parentChannelId: undefined,
					});
					const msg3 = yield* createMessage(base, {
						id: 1000000000000000200n,
						parentChannelId: undefined,
					});

					const result = yield* database.public.channels.getChannelPageMessages(
						{
							channelDiscordId: channel.id,
							paginationOpts: { numItems: 10, cursor: null },
						},
						{ subscribe: false },
					);

					expect(result.page).toHaveLength(3);
					const ids = result.page
						.map((p) => p.message?.message.id)
						.filter((id): id is bigint => id !== undefined);
					expect(ids).toEqual([msg2.id, msg3.id, msg1.id]);
				}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped(
			"should maintain descending order across pagination with reverse insertion",
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

					yield* createMessage(base, {
						id: 1000000000000000100n,
						parentChannelId: undefined,
					});
					yield* createMessage(base, {
						id: 1000000000000000200n,
						parentChannelId: undefined,
					});
					yield* createMessage(base, {
						id: 1000000000000000300n,
						parentChannelId: undefined,
					});
					yield* createMessage(base, {
						id: 1000000000000000400n,
						parentChannelId: undefined,
					});

					const page1 = yield* database.public.channels.getChannelPageMessages(
						{
							channelDiscordId: channel.id,
							paginationOpts: { numItems: 2, cursor: null },
						},
						{ subscribe: false },
					);

					expect(page1.page).toHaveLength(2);
					const ids1 = page1.page
						.map((p) => p.message?.message.id)
						.filter((id): id is bigint => id !== undefined);
					expect(ids1).toEqual([1000000000000000400n, 1000000000000000300n]);

					const page2 = yield* database.public.channels.getChannelPageMessages(
						{
							channelDiscordId: channel.id,
							paginationOpts: { numItems: 2, cursor: page1.continueCursor },
						},
						{ subscribe: false },
					);

					expect(page2.page).toHaveLength(2);
					const ids2 = page2.page
						.map((p) => p.message?.message.id)
						.filter((id): id is bigint => id !== undefined);
					expect(ids2).toEqual([1000000000000000200n, 1000000000000000100n]);
				}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});

	describe("getServerPageThreads", () => {
		it.scoped("should return empty for non-existent server", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const nonExistentId = BigInt(999999999999);

				const result = yield* database.public.channels.getServerPageThreads(
					{
						serverDiscordId: nonExistentId,
						paginationOpts: { numItems: 10, cursor: null },
					},
					{ subscribe: false },
				);

				expect(result.page).toEqual([]);
				expect(result.isDone).toBe(true);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should return threads from indexed channels only", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const server = yield* createServer();
				const indexedForum = yield* createChannel(server.discordId, {
					type: 15,
				});
				const nonIndexedForum = yield* createChannel(server.discordId, {
					type: 15,
				});
				yield* enableChannelIndexing(indexedForum.id);
				yield* makeMessagesPublic(server.discordId);

				const indexedThread = yield* createChannel(server.discordId, {
					type: 11,
					parentId: indexedForum.id,
				});
				yield* createChannel(server.discordId, {
					type: 11,
					parentId: nonIndexedForum.id,
				});

				const result = yield* database.public.channels.getServerPageThreads(
					{
						serverDiscordId: server.discordId,
						paginationOpts: { numItems: 10, cursor: null },
					},
					{ subscribe: false },
				);

				expect(result.page).toHaveLength(1);
				expect(result.page[0]?.thread.id).toBe(indexedThread.id);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should include channel info for each thread", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const server = yield* createServer();
				const forum = yield* createChannel(server.discordId, {
					name: "help-forum",
					type: 15,
				});
				yield* enableChannelIndexing(forum.id);
				yield* makeMessagesPublic(server.discordId);

				yield* createChannel(server.discordId, {
					type: 11,
					parentId: forum.id,
				});

				const result = yield* database.public.channels.getServerPageThreads(
					{
						serverDiscordId: server.discordId,
						paginationOpts: { numItems: 10, cursor: null },
					},
					{ subscribe: false },
				);

				expect(result.page).toHaveLength(1);
				expect(result.page[0]?.channel).not.toBeNull();
				expect(result.page[0]?.channel?.name).toBe("help-forum");
				expect(result.page[0]?.channel?.type).toBe(15);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should return threads with their start messages", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const fixture = yield* createForumThreadWithReplies();
				yield* fixture.addRootMessage();

				const result = yield* database.public.channels.getServerPageThreads(
					{
						serverDiscordId: fixture.server.discordId,
						paginationOpts: { numItems: 10, cursor: null },
					},
					{ subscribe: false },
				);

				expect(result.page).toHaveLength(1);
				expect(result.page[0]?.message).not.toBeNull();
				expect(result.page[0]?.message?.message.id).toBe(fixture.thread.id);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should paginate threads correctly", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const server = yield* createServer();
				const forum = yield* createChannel(server.discordId, { type: 15 });
				yield* enableChannelIndexing(forum.id);
				yield* makeMessagesPublic(server.discordId);

				yield* createChannel(server.discordId, {
					type: 11,
					parentId: forum.id,
				});
				yield* createChannel(server.discordId, {
					type: 11,
					parentId: forum.id,
				});
				yield* createChannel(server.discordId, {
					type: 11,
					parentId: forum.id,
				});

				const page1 = yield* database.public.channels.getServerPageThreads(
					{
						serverDiscordId: server.discordId,
						paginationOpts: { numItems: 2, cursor: null },
					},
					{ subscribe: false },
				);

				expect(page1.page.length).toBeLessThanOrEqual(2);
				expect(page1.isDone).toBe(false);

				const page2 = yield* database.public.channels.getServerPageThreads(
					{
						serverDiscordId: server.discordId,
						paginationOpts: { numItems: 2, cursor: page1.continueCursor },
					},
					{ subscribe: false },
				);

				expect(page2.page.length).toBeGreaterThanOrEqual(1);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped(
			"should return threads in descending order by creation time",
			() =>
				Effect.gen(function* () {
					const database = yield* Database;
					const server = yield* createServer();
					const forum = yield* createChannel(server.discordId, { type: 15 });
					yield* enableChannelIndexing(forum.id);
					yield* makeMessagesPublic(server.discordId);

					const thread1 = yield* createChannel(server.discordId, {
						id: 1000000000000000100n,
						type: 11,
						parentId: forum.id,
					});
					const thread2 = yield* createChannel(server.discordId, {
						id: 1000000000000000300n,
						type: 11,
						parentId: forum.id,
					});
					const thread3 = yield* createChannel(server.discordId, {
						id: 1000000000000000200n,
						type: 11,
						parentId: forum.id,
					});

					const result = yield* database.public.channels.getServerPageThreads(
						{
							serverDiscordId: server.discordId,
							paginationOpts: { numItems: 10, cursor: null },
						},
						{ subscribe: false },
					);

					expect(result.page).toHaveLength(3);
					expect(result.page[0]?.thread.id).toBe(thread3.id);
					expect(result.page[1]?.thread.id).toBe(thread2.id);
					expect(result.page[2]?.thread.id).toBe(thread1.id);
				}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should return threads from multiple indexed channels", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const server = yield* createServer();
				const forum1 = yield* createChannel(server.discordId, { type: 15 });
				const forum2 = yield* createChannel(server.discordId, { type: 15 });
				yield* enableChannelIndexing(forum1.id);
				yield* enableChannelIndexing(forum2.id);
				yield* makeMessagesPublic(server.discordId);

				yield* createChannel(server.discordId, {
					type: 11,
					parentId: forum1.id,
				});
				yield* createChannel(server.discordId, {
					type: 11,
					parentId: forum2.id,
				});

				const result = yield* database.public.channels.getServerPageThreads(
					{
						serverDiscordId: server.discordId,
						paginationOpts: { numItems: 10, cursor: null },
					},
					{ subscribe: false },
				);

				expect(result.page).toHaveLength(2);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped(
			"should return null message when thread has no start message",
			() =>
				Effect.gen(function* () {
					const database = yield* Database;
					const server = yield* createServer();
					const forum = yield* createChannel(server.discordId, { type: 15 });
					yield* enableChannelIndexing(forum.id);
					yield* makeMessagesPublic(server.discordId);

					yield* createChannel(server.discordId, {
						type: 11,
						parentId: forum.id,
					});

					const result = yield* database.public.channels.getServerPageThreads(
						{
							serverDiscordId: server.discordId,
							paginationOpts: { numItems: 10, cursor: null },
						},
						{ subscribe: false },
					);

					expect(result.page).toHaveLength(1);
					expect(result.page[0]?.message).toBeNull();
				}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});

	describe("getCommunityPageHeaderData", () => {
		it.scoped("should return null for non-existent server", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const nonExistentId = BigInt(999999999999);

				const result =
					yield* database.public.channels.getCommunityPageHeaderData(
						{ serverDiscordId: nonExistentId },
						{ subscribe: false },
					);

				expect(result).toBeNull();
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should return header data without selected channel", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const server = yield* createServer({ name: "Community Server" });
				const channel = yield* createChannel(server.discordId, { type: 0 });
				yield* enableChannelIndexing(channel.id);

				const result =
					yield* database.public.channels.getCommunityPageHeaderData(
						{ serverDiscordId: server.discordId },
						{ subscribe: false },
					);

				expect(result).not.toBeNull();
				expect(result?.server.name).toBe("Community Server");
				expect(result?.selectedChannel).toBeNull();
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should return header data with selected channel", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const server = yield* createServer({ name: "With Selected" });
				const channel = yield* createChannel(server.discordId, {
					name: "selected-channel",
					type: 0,
				});
				yield* enableChannelIndexing(channel.id);

				const result =
					yield* database.public.channels.getCommunityPageHeaderData(
						{
							serverDiscordId: server.discordId,
							channelDiscordId: channel.id,
						},
						{ subscribe: false },
					);

				expect(result).not.toBeNull();
				expect(result?.selectedChannel).not.toBeNull();
				expect(result?.selectedChannel?.name).toBe("selected-channel");
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should return null for channel from different server", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const server1 = yield* createServer();
				const server2 = yield* createServer();
				const channel1 = yield* createChannel(server1.discordId);
				yield* enableChannelIndexing(channel1.id);
				const channel2 = yield* createChannel(server2.discordId);

				const result =
					yield* database.public.channels.getCommunityPageHeaderData(
						{
							serverDiscordId: server1.discordId,
							channelDiscordId: channel2.id,
						},
						{ subscribe: false },
					);

				expect(result).toBeNull();
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});
});
