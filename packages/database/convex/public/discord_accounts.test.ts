import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { Database } from "../../src/database";
import { DatabaseTestLayer } from "../../src/database-test";
import {
	createAuthor,
	createForumThreadWithReplies,
	createServer,
	makeMessagesPublic,
} from "../../src/test";

describe("public/discord_accounts", () => {
	describe("getUserPageHeaderData", () => {
		it.scoped("should return null for non-existent user", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const nonExistentId = BigInt(999999999999);

				const result =
					yield* database.public.discord_accounts.getUserPageHeaderData(
						{ userId: nonExistentId },
						{ subscribe: false },
					);

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
						yield* database.public.discord_accounts.getUserPageHeaderData(
							{ userId: author.id },
							{ subscribe: false },
						);

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
						yield* database.public.discord_accounts.getUserPageHeaderData(
							{ userId: author.id },
							{ subscribe: false },
						);

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
					yield* database.public.discord_accounts.getUserPageHeaderData(
						{ userId: author.id },
						{ subscribe: false },
					);

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
					yield* database.public.discord_accounts.getUserPageHeaderData(
						{ userId: author.id },
						{ subscribe: false },
					);

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

				const result = yield* database.public.discord_accounts.getUserPosts(
					{
						userId: fixture.author.id,
						paginationOpts: { numItems: 10, cursor: null },
					},
					{ subscribe: false },
				);

				expect(result.page.length).toBeGreaterThanOrEqual(1);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should return empty for user with no posts", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const author = yield* createAuthor();

				const result = yield* database.public.discord_accounts.getUserPosts(
					{
						userId: author.id,
						paginationOpts: { numItems: 10, cursor: null },
					},
					{ subscribe: false },
				);

				expect(result.page).toEqual([]);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});
});
