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

describe("public/discord_accounts", () => {
	describe("getUserPageHeaderData", () => {
		it.scoped("should return null for non-existent user", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const nonExistentId = BigInt(999999999999);

				const result =
					yield* database.public.discord_accounts.getUserPageHeaderData({
						userId: nonExistentId,
					});

				expect(result).toBeNull();
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped(
			"should return user data when messages are public via server setting",
			() =>
				Effect.gen(function* () {
					const database = yield* Database;
					const server = yield* createServer();
					const author = yield* createAuthor({
						name: "PublicUser",
						avatar: "avatar123",
					});

					yield* makeMessagesPublic(server.discordId);

					yield* database.private.user_server_settings.upsertUserServerSettings(
						{
							settings: {
								userId: author.id,
								serverId: server.discordId,
								permissions: 0,
								canPubliclyDisplayMessages: false,
								messageIndexingDisabled: false,
								apiCallsUsed: 0,
							},
						},
					);

					const result =
						yield* database.public.discord_accounts.getUserPageHeaderData({
							userId: author.id,
						});

					expect(result).not.toBeNull();
					expect(result?.user.name).toBe("PublicUser");
				}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped(
			"should return user data when user opted in to public display",
			() =>
				Effect.gen(function* () {
					const database = yield* Database;
					const server = yield* createServer();
					const author = yield* createAuthor({ name: "OptedInUser" });

					yield* database.private.user_server_settings.upsertUserServerSettings(
						{
							settings: {
								userId: author.id,
								serverId: server.discordId,
								permissions: 0,
								canPubliclyDisplayMessages: true,
								messageIndexingDisabled: false,
								apiCallsUsed: 0,
							},
						},
					);

					const result =
						yield* database.public.discord_accounts.getUserPageHeaderData({
							userId: author.id,
						});

					expect(result).not.toBeNull();
					expect(result?.user.name).toBe("OptedInUser");
				}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should return null for private user", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const server = yield* createServer();
				const author = yield* createAuthor({ name: "PrivateUser" });

				yield* database.private.server_preferences.upsertServerPreferences({
					serverId: server.discordId,
					plan: "FREE",
					considerAllMessagesPublicEnabled: false,
				});

				yield* database.private.user_server_settings.upsertUserServerSettings({
					settings: {
						userId: author.id,
						serverId: server.discordId,
						permissions: 0,
						canPubliclyDisplayMessages: false,
						messageIndexingDisabled: false,
						apiCallsUsed: 0,
					},
				});

				const result =
					yield* database.public.discord_accounts.getUserPageHeaderData({
						userId: author.id,
					});

				expect(result).toBeNull();
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should return null when server has anonymization enabled", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const server = yield* createServer();
				const author = yield* createAuthor({ name: "AnonymizedUser" });

				yield* database.private.server_preferences.upsertServerPreferences({
					serverId: server.discordId,
					plan: "FREE",
					considerAllMessagesPublicEnabled: true,
					anonymizeMessagesEnabled: true,
				});

				yield* database.private.user_server_settings.upsertUserServerSettings({
					settings: {
						userId: author.id,
						serverId: server.discordId,
						permissions: 0,
						canPubliclyDisplayMessages: false,
						messageIndexingDisabled: false,
						apiCallsUsed: 0,
					},
				});

				const result =
					yield* database.public.discord_accounts.getUserPageHeaderData({
						userId: author.id,
					});

				expect(result).toBeNull();
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});

	describe("getUserPosts", () => {
		it.scoped("should return posts for a user", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const fixture = yield* createForumThreadWithReplies();
				yield* fixture.addRootMessage();

				const result = yield* database.public.discord_accounts.getUserPosts({
					userId: fixture.author.id,
					paginationOpts: { numItems: 10, cursor: null },
				});

				expect(result.page.length).toBeGreaterThanOrEqual(1);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should return empty for user with no posts", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const author = yield* createAuthor();

				const result = yield* database.public.discord_accounts.getUserPosts({
					userId: author.id,
					paginationOpts: { numItems: 10, cursor: null },
				});

				expect(result.page).toEqual([]);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should not link anonymized posts from a real user profile", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const publicFixture = yield* createForumThreadWithReplies();
				yield* publicFixture.addRootMessage();

				const anonymousServer = yield* createServer();
				const anonymousForum = yield* createChannel(anonymousServer.discordId, {
					type: 15,
				});
				const anonymousThread = yield* createChannel(
					anonymousServer.discordId,
					{ type: 11, parentId: anonymousForum.id },
				);
				yield* enableChannelIndexing(anonymousForum.id);
				yield* database.private.server_preferences.upsertServerPreferences({
					serverId: anonymousServer.discordId,
					plan: "FREE",
					considerAllMessagesPublicEnabled: true,
					anonymizeMessagesEnabled: true,
				});
				yield* createMessage(
					{
						authorId: publicFixture.author.id,
						serverId: anonymousServer.discordId,
						channelId: anonymousThread.id,
					},
					{
						id: anonymousThread.id,
						parentChannelId: anonymousForum.id,
					},
				);

				const result = yield* database.public.discord_accounts.getUserPosts({
					userId: publicFixture.author.id,
					paginationOpts: { numItems: 10, cursor: null },
				});

				expect(result.page).toHaveLength(1);
				expect(result.page[0]?.server.discordId).toBe(
					publicFixture.server.discordId,
				);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should keep a cursor when an anonymized page is empty", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const identifiedFixture = yield* createForumThreadWithReplies();
				yield* identifiedFixture.addRootMessage();

				const anonymousServer = yield* createServer();
				const anonymousForum = yield* createChannel(anonymousServer.discordId, {
					type: 15,
				});
				yield* enableChannelIndexing(anonymousForum.id);
				yield* database.private.server_preferences.upsertServerPreferences({
					serverId: anonymousServer.discordId,
					plan: "FREE",
					considerAllMessagesPublicEnabled: true,
					anonymizeMessagesEnabled: true,
				});

				for (let count = 0; count < 2; count += 1) {
					const thread = yield* createChannel(anonymousServer.discordId, {
						type: 11,
						parentId: anonymousForum.id,
					});
					yield* createMessage(
						{
							authorId: identifiedFixture.author.id,
							serverId: anonymousServer.discordId,
							channelId: thread.id,
						},
						{
							id: thread.id,
							parentChannelId: anonymousForum.id,
						},
					);
				}

				const firstPage = yield* database.public.discord_accounts.getUserPosts({
					userId: identifiedFixture.author.id,
					paginationOpts: { numItems: 2, cursor: null },
				});

				expect(firstPage.page).toEqual([]);
				expect(firstPage.isDone).toBe(false);

				const secondPage = yield* database.public.discord_accounts.getUserPosts(
					{
						userId: identifiedFixture.author.id,
						paginationOpts: {
							numItems: 2,
							cursor: firstPage.continueCursor,
						},
					},
				);

				expect(secondPage.page).toHaveLength(1);
				expect(secondPage.page[0]?.server.discordId).toBe(
					identifiedFixture.server.discordId,
				);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});
});
