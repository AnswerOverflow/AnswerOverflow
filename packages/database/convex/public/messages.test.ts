import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { Database } from "../../src/database";
import { DatabaseTestLayer } from "../../src/database-test";
import {
	createForumThreadWithReplies,
	createTextChannelThreadWithReplies,
	createTextChannelWithMessages,
} from "../../src/test";

describe("getMessagePageReplies", () => {
	describe("forum channel thread", () => {
		it.scoped("should return thread replies excluding the root message", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const fixture = yield* createForumThreadWithReplies();

				yield* fixture.addRootMessage();
				const reply1 = yield* fixture.addMessage({ content: "First reply" });
				const reply2 = yield* fixture.addMessage({ content: "Second reply" });

				const result = yield* database.public.messages.getMessagePageReplies(
					{
						channelId: fixture.forum.id,
						threadId: fixture.thread.id,
						paginationOpts: { numItems: 10, cursor: null },
					},
					{ subscribe: false },
				);

				expect(result.page).toHaveLength(2);
				expect(result.isDone).toBe(true);

				const messageIds = result.page.map((m) => m.message.id);
				expect(messageIds).not.toContain(fixture.thread.id);
				expect(messageIds).toContain(reply1.id);
				expect(messageIds).toContain(reply2.id);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should return empty page when only root message exists", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const fixture = yield* createForumThreadWithReplies();

				yield* fixture.addRootMessage();

				const result = yield* database.public.messages.getMessagePageReplies(
					{
						channelId: fixture.forum.id,
						threadId: fixture.thread.id,
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

				yield* fixture.addRootMessage();
				yield* fixture.addMessage();
				yield* fixture.addMessage();
				yield* fixture.addMessage();

				const page1 = yield* database.public.messages.getMessagePageReplies(
					{
						channelId: fixture.forum.id,
						threadId: fixture.thread.id,
						paginationOpts: { numItems: 2, cursor: null },
					},
					{ subscribe: false },
				);

				expect(page1.page).toHaveLength(2);
				expect(page1.isDone).toBe(false);

				const page2 = yield* database.public.messages.getMessagePageReplies(
					{
						channelId: fixture.forum.id,
						threadId: fixture.thread.id,
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

				yield* fixture.addRootMessage();
				yield* fixture.addMessage({ content: "Test content" });

				const result = yield* database.public.messages.getMessagePageReplies(
					{
						channelId: fixture.forum.id,
						threadId: fixture.thread.id,
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
		it.scoped("should return thread replies excluding the root message", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const fixture = yield* createTextChannelThreadWithReplies();

				yield* fixture.addRootMessage();
				const reply1 = yield* fixture.addMessage({ content: "First reply" });
				const reply2 = yield* fixture.addMessage({ content: "Second reply" });

				const result = yield* database.public.messages.getMessagePageReplies(
					{
						channelId: fixture.textChannel.id,
						threadId: fixture.thread.id,
						paginationOpts: { numItems: 10, cursor: null },
					},
					{ subscribe: false },
				);

				expect(result.page).toHaveLength(2);
				expect(result.isDone).toBe(true);

				const messageIds = result.page.map((m) => m.message.id);
				expect(messageIds).not.toContain(fixture.thread.id);
				expect(messageIds).toContain(reply1.id);
				expect(messageIds).toContain(reply2.id);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should return empty page when only root message exists", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const fixture = yield* createTextChannelThreadWithReplies();

				yield* fixture.addRootMessage();

				const result = yield* database.public.messages.getMessagePageReplies(
					{
						channelId: fixture.textChannel.id,
						threadId: fixture.thread.id,
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

				yield* fixture.addRootMessage();
				yield* fixture.addMessage();
				yield* fixture.addMessage();
				yield* fixture.addMessage();

				const page1 = yield* database.public.messages.getMessagePageReplies(
					{
						channelId: fixture.textChannel.id,
						threadId: fixture.thread.id,
						paginationOpts: { numItems: 2, cursor: null },
					},
					{ subscribe: false },
				);

				expect(page1.page).toHaveLength(2);
				expect(page1.isDone).toBe(false);

				const page2 = yield* database.public.messages.getMessagePageReplies(
					{
						channelId: fixture.textChannel.id,
						threadId: fixture.thread.id,
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

				yield* fixture.addRootMessage();
				yield* fixture.addMessage({ content: "Test content" });

				const result = yield* database.public.messages.getMessagePageReplies(
					{
						channelId: fixture.textChannel.id,
						threadId: fixture.thread.id,
						paginationOpts: { numItems: 10, cursor: null },
					},
					{ subscribe: false },
				);

				expect(result.page[0]?.author).not.toBeNull();
				expect(result.page[0]?.author?.id).toBe(fixture.author.id);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});

	describe("regular text channel (non-thread)", () => {
		it.scoped("should return messages from the channel", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const fixture = yield* createTextChannelWithMessages();

				const msg1 = yield* fixture.addMessage({ content: "First message" });
				const msg2 = yield* fixture.addMessage({ content: "Second message" });

				const result = yield* database.public.messages.getMessagePageReplies(
					{
						channelId: fixture.channel.id,
						paginationOpts: { numItems: 10, cursor: null },
					},
					{ subscribe: false },
				);

				expect(result.page).toHaveLength(2);
				expect(result.isDone).toBe(true);

				const messageIds = result.page.map((m) => m.message.id);
				expect(messageIds).toContain(msg1.id);
				expect(messageIds).toContain(msg2.id);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should return empty page when no messages exist", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const fixture = yield* createTextChannelWithMessages();

				const result = yield* database.public.messages.getMessagePageReplies(
					{
						channelId: fixture.channel.id,
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

				yield* fixture.addMessage();
				yield* fixture.addMessage();
				yield* fixture.addMessage();

				const page1 = yield* database.public.messages.getMessagePageReplies(
					{
						channelId: fixture.channel.id,
						paginationOpts: { numItems: 2, cursor: null },
					},
					{ subscribe: false },
				);

				expect(page1.page).toHaveLength(2);
				expect(page1.isDone).toBe(false);

				const page2 = yield* database.public.messages.getMessagePageReplies(
					{
						channelId: fixture.channel.id,
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

				yield* fixture.addMessage({ content: "Test content" });

				const result = yield* database.public.messages.getMessagePageReplies(
					{
						channelId: fixture.channel.id,
						paginationOpts: { numItems: 10, cursor: null },
					},
					{ subscribe: false },
				);

				expect(result.page[0]?.author).not.toBeNull();
				expect(result.page[0]?.author?.id).toBe(fixture.author.id);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});
});
