import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { Database } from "../../src/database";
import { DatabaseTestLayer } from "../../src/database-test";
import { createAuthor, createForumThreadWithReplies } from "../../src/test";

describe("discord_accounts", () => {
	describe("upsertDiscordAccount", () => {
		it.scoped("should create a new account", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const accountId = BigInt(Date.now());

				const result =
					yield* database.private.discord_accounts.upsertDiscordAccount({
						account: {
							id: accountId,
							name: "TestUser",
							avatar: "abc123",
						},
					});

				expect(result.id).toBe(accountId);
				expect(result.name).toBe("TestUser");
				expect(result.avatar).toBe("abc123");
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should update an existing account", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const author = yield* createAuthor({ name: "Original" });

				const result =
					yield* database.private.discord_accounts.upsertDiscordAccount({
						account: {
							id: author.id,
							name: "Updated",
							avatar: "newavatar",
						},
					});

				expect(result.name).toBe("Updated");
				expect(result.avatar).toBe("newavatar");
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});

	describe("findManyDiscordAccountsByIds", () => {
		it.scoped("should return matching accounts", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const author1 = yield* createAuthor({ name: "User1" });
				const author2 = yield* createAuthor({ name: "User2" });

				const accounts =
					yield* database.private.discord_accounts.findManyDiscordAccountsByIds(
						{ ids: [author1.id, author2.id] },
					);

				expect(accounts.length).toBe(2);
				expect(accounts.map((a) => a.name)).toContain("User1");
				expect(accounts.map((a) => a.name)).toContain("User2");
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should filter out non-existent accounts", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const author = yield* createAuthor({ name: "RealUser" });
				const fakeId = BigInt(999999999999);

				const accounts =
					yield* database.private.discord_accounts.findManyDiscordAccountsByIds(
						{ ids: [author.id, fakeId] },
					);

				expect(accounts.length).toBe(1);
				expect(accounts[0]?.name).toBe("RealUser");
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should return empty for empty input", () =>
			Effect.gen(function* () {
				const database = yield* Database;

				const accounts =
					yield* database.private.discord_accounts.findManyDiscordAccountsByIds(
						{ ids: [] },
					);

				expect(accounts).toEqual([]);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});

	describe("upsertManyDiscordAccounts", () => {
		it.scoped("should create multiple accounts", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const accounts = [
					{ id: BigInt(Date.now()), name: "BatchUser1" },
					{ id: BigInt(Date.now() + 1), name: "BatchUser2" },
				];

				const result =
					yield* database.private.discord_accounts.upsertManyDiscordAccounts({
						accounts,
					});

				expect(result.length).toBe(2);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should return empty for empty input", () =>
			Effect.gen(function* () {
				const database = yield* Database;

				const result =
					yield* database.private.discord_accounts.upsertManyDiscordAccounts({
						accounts: [],
					});

				expect(result).toEqual([]);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});

	describe("deleteDiscordAccount", () => {
		it.scoped("should delete account and add to ignored list", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const author = yield* createAuthor({ name: "ToDelete" });

				yield* database.private.discord_accounts.deleteDiscordAccount({
					id: author.id,
				});

				const accounts =
					yield* database.private.discord_accounts.findManyDiscordAccountsByIds(
						{ ids: [author.id] },
					);
				expect(accounts.length).toBe(0);

				const ignored =
					yield* database.private.ignored_discord_accounts.findIgnoredDiscordAccountById(
						{ id: author.id },
					);
				expect(ignored).not.toBeNull();
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should delete messages from deleted account", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const fixture = yield* createForumThreadWithReplies();
				const message = yield* fixture.addMessage({
					content: "Will be deleted",
				});

				yield* database.private.discord_accounts.deleteDiscordAccount({
					id: fixture.author.id,
				});

				const deletedMessage = yield* database.private.messages.getMessageById({
					id: message.id,
				});
				expect(deletedMessage).toBeNull();
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});

	describe("deleteDiscordAccountBatch", () => {
		it.scoped("should finish small accounts in one call", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const fixture = yield* createForumThreadWithReplies();
				const message = yield* fixture.addMessage({
					content: "Will be deleted",
				});

				yield* database.private.user_server_settings.upsertUserServerSettings({
					settings: {
						userId: fixture.author.id,
						serverId: fixture.server.discordId,
						permissions: 32,
						canPubliclyDisplayMessages: true,
						messageIndexingDisabled: false,
						apiCallsUsed: 0,
					},
				});

				const result =
					yield* database.private.discord_accounts.deleteDiscordAccountBatch({
						id: fixture.author.id,
					});

				expect(result.done).toBe(true);
				expect(result.deletedMessages).toBeGreaterThan(0);
				expect(result.continueCursor).toBeNull();

				const accounts =
					yield* database.private.discord_accounts.findManyDiscordAccountsByIds(
						{ ids: [fixture.author.id] },
					);
				expect(accounts.length).toBe(0);

				const deletedMessage = yield* database.private.messages.getMessageById({
					id: message.id,
				});
				expect(deletedMessage).toBeNull();

				const ignored =
					yield* database.private.ignored_discord_accounts.findIgnoredDiscordAccountById(
						{ id: fixture.author.id },
					);
				expect(ignored).not.toBeNull();

				const settings =
					yield* database.private.user_server_settings.findUserServerSettingsById(
						{
							userId: fixture.author.id,
							serverId: fixture.server.discordId,
						},
					);
				expect(settings).toBeNull();
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped(
			"should page message deletes and only finish when none remain",
			() =>
				Effect.gen(function* () {
					const database = yield* Database;
					const fixture = yield* createForumThreadWithReplies();
					const first = yield* fixture.addMessage({ content: "first" });
					const second = yield* fixture.addMessage({ content: "second" });
					const third = yield* fixture.addMessage({ content: "third" });

					const page1 =
						yield* database.private.discord_accounts.deleteDiscordAccountBatch({
							id: fixture.author.id,
							limit: 2,
						});

					expect(page1.done).toBe(false);
					expect(page1.deletedMessages).toBe(2);
					expect(page1.continueCursor).toEqual(expect.any(String));

					const page2 =
						yield* database.private.discord_accounts.deleteDiscordAccountBatch({
							id: fixture.author.id,
							cursor: page1.continueCursor,
							limit: 2,
						});

					expect(page2.done).toBe(true);
					expect(page2.deletedMessages).toBe(1);
					expect(page2.continueCursor).toBeNull();

					const remainingMessages = yield* Effect.all([
						database.private.messages.getMessageById({ id: first.id }),
						database.private.messages.getMessageById({ id: second.id }),
						database.private.messages.getMessageById({ id: third.id }),
					]);
					expect(remainingMessages.every((message) => message === null)).toBe(
						true,
					);

					const accounts =
						yield* database.private.discord_accounts.findManyDiscordAccountsByIds(
							{ ids: [fixture.author.id] },
						);
					expect(accounts.length).toBe(0);

					const ignored =
						yield* database.private.ignored_discord_accounts.findIgnoredDiscordAccountById(
							{ id: fixture.author.id },
						);
					expect(ignored).not.toBeNull();
				}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should finalize when the account has no messages", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const author = yield* createAuthor({ name: "NoMessages" });

				const result =
					yield* database.private.discord_accounts.deleteDiscordAccountBatch({
						id: author.id,
					});

				expect(result).toEqual({
					done: true,
					deletedMessages: 0,
					continueCursor: null,
				});

				const accounts =
					yield* database.private.discord_accounts.findManyDiscordAccountsByIds(
						{ ids: [author.id] },
					);
				expect(accounts.length).toBe(0);

				const ignored =
					yield* database.private.ignored_discord_accounts.findIgnoredDiscordAccountById(
						{ id: author.id },
					);
				expect(ignored).not.toBeNull();
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});

	describe("findDiscordAccountsByName", () => {
		it.scoped("should return only accounts with the exact name", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const match1 = yield* createAuthor({ name: "SharedName" });
				const match2 = yield* createAuthor({ name: "SharedName" });
				yield* createAuthor({ name: "OtherName" });

				const accounts =
					yield* database.private.discord_accounts.findDiscordAccountsByName({
						name: "SharedName",
					});

				expect(accounts.length).toBe(2);
				expect(accounts.map((a) => a.id)).toContain(match1.id);
				expect(accounts.map((a) => a.id)).toContain(match2.id);
				expect(accounts.every((a) => a.name === "SharedName")).toBe(true);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should respect the limit", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				yield* createAuthor({ name: "LimitedName" });
				yield* createAuthor({ name: "LimitedName" });
				yield* createAuthor({ name: "LimitedName" });

				const accounts =
					yield* database.private.discord_accounts.findDiscordAccountsByName({
						name: "LimitedName",
						limit: 2,
					});

				expect(accounts.length).toBe(2);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should return empty array when no accounts match", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				yield* createAuthor({ name: "SomeUser" });

				const accounts =
					yield* database.private.discord_accounts.findDiscordAccountsByName({
						name: "NoSuchUser",
					});

				expect(accounts).toEqual([]);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should return only id and name fields", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const author = yield* createAuthor({
					name: "FieldsUser",
					avatar: "avatar123",
				});

				const accounts =
					yield* database.private.discord_accounts.findDiscordAccountsByName({
						name: "FieldsUser",
					});

				expect(accounts.length).toBe(1);
				expect(accounts[0]).toEqual({ id: author.id, name: "FieldsUser" });
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});

	describe("getUserPageHeaderData", () => {
		it.scoped("should return user data", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const author = yield* createAuthor({
					name: "HeaderUser",
					avatar: "avatar123",
				});

				const result =
					yield* database.private.discord_accounts.getUserPageHeaderData({
						userId: author.id,
					});

				expect(result).not.toBeNull();
				expect(result?.user.name).toBe("HeaderUser");
				expect(result?.user.avatar).toBe("avatar123");
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should return null for non-existent user", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const nonExistentId = BigInt(999999999999);

				const result =
					yield* database.private.discord_accounts.getUserPageHeaderData({
						userId: nonExistentId,
					});

				expect(result).toBeNull();
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});
});
