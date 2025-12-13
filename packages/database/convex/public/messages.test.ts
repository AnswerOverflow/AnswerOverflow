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

	describe("pagination with filtering", () => {
		const CHANNEL_TYPE = {
			GuildText: 0,
			PublicThread: 11,
		} as const;

		it.scoped(
			"should fetch more results when initial page has filtered items",
			() =>
				Effect.gen(function* () {
					const database = yield* Database;
					const server = yield* createServer();
					const channel = yield* createChannel(server.discordId, {
						type: CHANNEL_TYPE.GuildText,
					});

					const publicAuthor = yield* createAuthor();
					const privateAuthor = yield* createAuthor();

					yield* enableChannelIndexing(channel.id);

					yield* database.private.user_server_settings.upsertUserServerSettings(
						{
							settings: {
								userId: publicAuthor.id,
								serverId: server.discordId,
								permissions: 0,
								canPubliclyDisplayMessages: true,
								messageIndexingDisabled: false,
								apiCallsUsed: 0,
							},
						},
					);

					const base = {
						serverId: server.discordId,
						channelId: channel.id,
					};
					let nextId = channel.id + 1n;

					const firstMsg = yield* createMessage(
						{ ...base, authorId: publicAuthor.id },
						{ id: nextId++ },
					);
					yield* createMessage(
						{ ...base, authorId: privateAuthor.id },
						{ id: nextId++ },
					);
					yield* createMessage(
						{ ...base, authorId: privateAuthor.id },
						{ id: nextId++ },
					);
					const publicMsg = yield* createMessage(
						{ ...base, authorId: publicAuthor.id },
						{ id: nextId++ },
					);

					const result = yield* database.public.messages.getMessages(
						{
							channelId: channel.id,
							after: firstMsg.id,
							paginationOpts: { numItems: 2, cursor: null },
						},
						{ subscribe: false },
					);

					expect(result.page).toHaveLength(1);
					expect(result.page[0]?.message.id).toBe(publicMsg.id);
					expect(result.isDone).toBe(true);
				}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped(
			"should return requested count when enough public messages exist after filtering",
			() =>
				Effect.gen(function* () {
					const database = yield* Database;
					const server = yield* createServer();
					const channel = yield* createChannel(server.discordId, {
						type: CHANNEL_TYPE.GuildText,
					});

					const publicAuthor = yield* createAuthor();
					const privateAuthor = yield* createAuthor();

					yield* enableChannelIndexing(channel.id);

					yield* database.private.user_server_settings.upsertUserServerSettings(
						{
							settings: {
								userId: publicAuthor.id,
								serverId: server.discordId,
								permissions: 0,
								canPubliclyDisplayMessages: true,
								messageIndexingDisabled: false,
								apiCallsUsed: 0,
							},
						},
					);

					const base = {
						serverId: server.discordId,
						channelId: channel.id,
					};
					let nextId = channel.id + 1n;

					const firstMsg = yield* createMessage(
						{ ...base, authorId: publicAuthor.id },
						{ id: nextId++ },
					);
					yield* createMessage(
						{ ...base, authorId: privateAuthor.id },
						{ id: nextId++ },
					);
					const public1 = yield* createMessage(
						{ ...base, authorId: publicAuthor.id },
						{ id: nextId++ },
					);
					yield* createMessage(
						{ ...base, authorId: privateAuthor.id },
						{ id: nextId++ },
					);
					const public2 = yield* createMessage(
						{ ...base, authorId: publicAuthor.id },
						{ id: nextId++ },
					);
					yield* createMessage(
						{ ...base, authorId: privateAuthor.id },
						{ id: nextId++ },
					);
					const public3 = yield* createMessage(
						{ ...base, authorId: publicAuthor.id },
						{ id: nextId++ },
					);

					const result = yield* database.public.messages.getMessages(
						{
							channelId: channel.id,
							after: firstMsg.id,
							paginationOpts: { numItems: 3, cursor: null },
						},
						{ subscribe: false },
					);

					expect(result.page.length).toBeGreaterThanOrEqual(3);
					const messageIds = result.page.map((m) => m.message.id);
					expect(messageIds).toContain(public1.id);
					expect(messageIds).toContain(public2.id);
					expect(messageIds).toContain(public3.id);
				}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped(
			"should return empty page when all messages are filtered out",
			() =>
				Effect.gen(function* () {
					const database = yield* Database;
					const server = yield* createServer();
					const channel = yield* createChannel(server.discordId, {
						type: CHANNEL_TYPE.GuildText,
					});

					const privateAuthor = yield* createAuthor();

					yield* enableChannelIndexing(channel.id);

					const base = {
						serverId: server.discordId,
						channelId: channel.id,
						authorId: privateAuthor.id,
					};
					let nextId = channel.id + 1n;

					const firstMsg = yield* createMessage(base, { id: nextId++ });
					yield* createMessage(base, { id: nextId++ });
					yield* createMessage(base, { id: nextId++ });

					const result = yield* database.public.messages.getMessages(
						{
							channelId: channel.id,
							after: firstMsg.id,
							paginationOpts: { numItems: 10, cursor: null },
						},
						{ subscribe: false },
					);

					expect(result.page).toHaveLength(0);
					expect(result.isDone).toBe(true);
				}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped(
			"should handle mixed public/private messages across pagination boundaries",
			() =>
				Effect.gen(function* () {
					const database = yield* Database;
					const server = yield* createServer();
					const channel = yield* createChannel(server.discordId, {
						type: CHANNEL_TYPE.GuildText,
					});

					const publicAuthor = yield* createAuthor();
					const privateAuthor = yield* createAuthor();

					yield* enableChannelIndexing(channel.id);

					yield* database.private.user_server_settings.upsertUserServerSettings(
						{
							settings: {
								userId: publicAuthor.id,
								serverId: server.discordId,
								permissions: 0,
								canPubliclyDisplayMessages: true,
								messageIndexingDisabled: false,
								apiCallsUsed: 0,
							},
						},
					);

					const base = {
						serverId: server.discordId,
						channelId: channel.id,
					};
					let nextId = channel.id + 1n;

					const firstMsg = yield* createMessage(
						{ ...base, authorId: publicAuthor.id },
						{ id: nextId++ },
					);

					for (let i = 0; i < 5; i++) {
						yield* createMessage(
							{ ...base, authorId: privateAuthor.id },
							{ id: nextId++ },
						);
					}

					const publicMsg = yield* createMessage(
						{ ...base, authorId: publicAuthor.id },
						{ id: nextId++ },
					);

					const result = yield* database.public.messages.getMessages(
						{
							channelId: channel.id,
							after: firstMsg.id,
							paginationOpts: { numItems: 2, cursor: null },
						},
						{ subscribe: false },
					);

					expect(result.page).toHaveLength(1);
					expect(result.page[0]?.message.id).toBe(publicMsg.id);
				}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});
});
