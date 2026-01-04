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
						{ subscribe: false },
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
						{ subscribe: false },
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
						{ subscribe: false },
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
						{ subscribe: false },
					);
				expect(accounts.length).toBe(0);

				const ignored =
					yield* database.private.ignored_discord_accounts.findIgnoredDiscordAccountById(
						{ id: author.id },
						{ subscribe: false },
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

				const deletedMessage = yield* database.private.messages.getMessageById(
					{ id: message.id },
					{ subscribe: false },
				);
				expect(deletedMessage).toBeNull();
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
					yield* database.private.discord_accounts.getUserPageHeaderData(
						{ userId: author.id },
						{ subscribe: false },
					);

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
					yield* database.private.discord_accounts.getUserPageHeaderData(
						{ userId: nonExistentId },
						{ subscribe: false },
					);

				expect(result).toBeNull();
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});
});
