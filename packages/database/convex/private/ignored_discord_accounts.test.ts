import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { Database } from "../../src/database";
import { DatabaseTestLayer } from "../../src/database-test";
import { createAuthor } from "../../src/test";

describe("ignored_discord_accounts", () => {
	describe("findIgnoredDiscordAccountById", () => {
		it.scoped("should return null for non-ignored account", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const author = yield* createAuthor();

				const result =
					yield* database.private.ignored_discord_accounts.findIgnoredDiscordAccountById(
						{ id: author.id },
						{ subscribe: false },
					);

				expect(result).toBeNull();
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should return ignored account after deletion", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const author = yield* createAuthor();

				yield* database.private.discord_accounts.deleteDiscordAccount({
					id: author.id,
				});

				const result =
					yield* database.private.ignored_discord_accounts.findIgnoredDiscordAccountById(
						{ id: author.id },
						{ subscribe: false },
					);

				expect(result).not.toBeNull();
				expect(result?.id).toBe(author.id);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});

	describe("deleteIgnoredDiscordAccount", () => {
		it.scoped("should remove account from ignored list", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const author = yield* createAuthor();

				yield* database.private.discord_accounts.deleteDiscordAccount({
					id: author.id,
				});

				yield* database.private.ignored_discord_accounts.deleteIgnoredDiscordAccount(
					{ id: author.id },
				);

				const newAccount =
					yield* database.private.discord_accounts.upsertDiscordAccount({
						account: {
							id: author.id,
							name: "RecreatedUser",
						},
					});
				expect(newAccount.name).toBe("RecreatedUser");

				const accounts =
					yield* database.private.discord_accounts.findManyDiscordAccountsByIds(
						{ ids: [author.id] },
						{ subscribe: false },
					);
				expect(accounts.length).toBe(1);
				expect(accounts[0]?.name).toBe("RecreatedUser");
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should succeed for non-existent ignored account", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const nonExistentId = BigInt(999999999999);

				const result =
					yield* database.private.ignored_discord_accounts.deleteIgnoredDiscordAccount(
						{ id: nonExistentId },
					);

				expect(result).toBe(true);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});

	describe("interaction with discord_accounts", () => {
		it.scoped("should prevent creating account when in ignored list", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const accountId = BigInt(Date.now());

				yield* database.private.discord_accounts.upsertDiscordAccount({
					account: {
						id: accountId,
						name: "OriginalUser",
					},
				});

				yield* database.private.discord_accounts.deleteDiscordAccount({
					id: accountId,
				});

				const result =
					yield* database.private.discord_accounts.upsertDiscordAccount({
						account: {
							id: accountId,
							name: "NewUser",
							avatar: "newavatar",
						},
					});

				expect(result.name).toBe("NewUser");
				expect(result.avatar).toBeUndefined();

				const accounts =
					yield* database.private.discord_accounts.findManyDiscordAccountsByIds(
						{ ids: [accountId] },
						{ subscribe: false },
					);
				expect(accounts.length).toBe(0);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});
});
