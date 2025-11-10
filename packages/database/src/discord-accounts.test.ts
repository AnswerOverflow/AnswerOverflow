// Tests for discord account functions

import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import type { DiscordAccount, IgnoredDiscordAccount } from "../convex/schema";
import { Database } from "./database";
import { DatabaseTestLayer } from "./database-test";

const createTestDiscordAccount = (
	id: string,
	name: string,
	overrides?: Partial<DiscordAccount>,
): DiscordAccount => ({
	id,
	name,
	avatar: undefined,
	...overrides,
});

it.scoped("getDiscordAccountById returns account", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		const account = createTestDiscordAccount("user123", "Test User");

		yield* database.discordAccounts.createDiscordAccount(account);

		const liveData =
			yield* database.discordAccounts.getDiscordAccountById("user123");

		expect(liveData?.data?.id).toBe("user123");
		expect(liveData?.data?.name).toBe("Test User");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("getDiscordAccountById returns null for non-existent account", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		const liveData =
			yield* database.discordAccounts.getDiscordAccountById("nonexistent");

		expect(liveData?.data).toBeNull();
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("createDiscordAccount creates a new account", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		const account = createTestDiscordAccount("user123", "Test User");

		yield* database.discordAccounts.createDiscordAccount(account);

		const liveData =
			yield* database.discordAccounts.getDiscordAccountById("user123");

		expect(liveData?.data?.id).toBe("user123");
		expect(liveData?.data?.name).toBe("Test User");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("createDiscordAccount returns default account if ignored", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		// First, ignore the account
		yield* database.ignoredDiscordAccounts.upsertIgnoredDiscordAccount(
			"user123",
		);

		// Try to create account
		const account = createTestDiscordAccount("user123", "Test User");
		const result =
			yield* database.discordAccounts.createDiscordAccount(account);

		// Should return default account (no avatar)
		expect(result.id).toBe("user123");
		expect(result.name).toBe("Test User");
		expect(result.avatar).toBeUndefined();

		// Account should not exist in database
		const liveData =
			yield* database.discordAccounts.getDiscordAccountById("user123");
		expect(liveData?.data).toBeNull();
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("updateDiscordAccount updates an existing account", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		const account = createTestDiscordAccount("user123", "Test User");
		yield* database.discordAccounts.createDiscordAccount(account);

		const updated = createTestDiscordAccount("user123", "Updated Name", {
			avatar: "https://example.com/avatar.png",
		});

		yield* database.discordAccounts.updateDiscordAccount(updated);

		const liveData =
			yield* database.discordAccounts.getDiscordAccountById("user123");

		expect(liveData?.data?.name).toBe("Updated Name");
		expect(liveData?.data?.avatar).toBe("https://example.com/avatar.png");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("upsertDiscordAccount creates or updates account", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		// First upsert (create)
		const account1 = createTestDiscordAccount("user123", "Test User");
		yield* database.discordAccounts.upsertDiscordAccount(account1);

		const liveData1 =
			yield* database.discordAccounts.getDiscordAccountById("user123");
		expect(liveData1?.data?.name).toBe("Test User");

		// Second upsert (update)
		const account2 = createTestDiscordAccount("user123", "Updated Name");
		yield* database.discordAccounts.upsertDiscordAccount(account2);

		const liveData2 =
			yield* database.discordAccounts.getDiscordAccountById("user123");
		expect(liveData2?.data?.name).toBe("Updated Name");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("findManyDiscordAccountsById returns multiple accounts", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		const accounts = [
			createTestDiscordAccount("user1", "User 1"),
			createTestDiscordAccount("user2", "User 2"),
			createTestDiscordAccount("user3", "User 3"),
		];

		yield* database.discordAccounts.createManyDiscordAccounts(accounts);

		const liveData =
			yield* database.discordAccounts.findManyDiscordAccountsById([
				"user1",
				"user2",
				"user3",
			]);

		expect(liveData?.data?.length).toBe(3);
		const ids = liveData?.data?.map((a) => a.id) ?? [];
		expect(ids).toContain("user1");
		expect(ids).toContain("user2");
		expect(ids).toContain("user3");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("deleteDiscordAccount deletes account and adds to ignored", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		const account = createTestDiscordAccount("user123", "Test User");
		yield* database.discordAccounts.createDiscordAccount(account);

		// Verify account exists
		const beforeDelete =
			yield* database.discordAccounts.getDiscordAccountById("user123");
		expect(beforeDelete?.data?.id).toBe("user123");

		// Delete account
		yield* database.discordAccounts.deleteDiscordAccount("user123");

		// Verify account is deleted
		const afterDelete =
			yield* database.discordAccounts.getDiscordAccountById("user123");
		expect(afterDelete?.data).toBeNull();

		// Verify account is in ignored list
		const ignored =
			yield* database.ignoredDiscordAccounts.findIgnoredDiscordAccountById(
				"user123",
			);
		expect(ignored?.data?.id).toBe("user123");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("findIgnoredDiscordAccountById returns ignored account", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.ignoredDiscordAccounts.upsertIgnoredDiscordAccount(
			"user123",
		);

		const liveData =
			yield* database.ignoredDiscordAccounts.findIgnoredDiscordAccountById(
				"user123",
			);

		expect(liveData?.data?.id).toBe("user123");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped(
	"findIgnoredDiscordAccountById returns null for non-ignored account",
	() =>
		Effect.gen(function* () {
			const database = yield* Database;

			const liveData =
				yield* database.ignoredDiscordAccounts.findIgnoredDiscordAccountById(
					"user123",
				);

			expect(liveData?.data).toBeNull();
		}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("deleteIgnoredDiscordAccount removes ignored account", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.ignoredDiscordAccounts.upsertIgnoredDiscordAccount(
			"user123",
		);

		// Verify ignored
		const beforeDelete =
			yield* database.ignoredDiscordAccounts.findIgnoredDiscordAccountById(
				"user123",
			);
		expect(beforeDelete?.data?.id).toBe("user123");

		// Delete ignored account
		yield* database.ignoredDiscordAccounts.deleteIgnoredDiscordAccount(
			"user123",
		);

		// Verify deleted
		const afterDelete =
			yield* database.ignoredDiscordAccounts.findIgnoredDiscordAccountById(
				"user123",
			);
		expect(afterDelete?.data).toBeNull();
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped(
	"findManyIgnoredDiscordAccountsById returns multiple ignored accounts",
	() =>
		Effect.gen(function* () {
			const database = yield* Database;

			yield* database.ignoredDiscordAccounts.upsertIgnoredDiscordAccount(
				"user1",
			);
			yield* database.ignoredDiscordAccounts.upsertIgnoredDiscordAccount(
				"user2",
			);
			yield* database.ignoredDiscordAccounts.upsertIgnoredDiscordAccount(
				"user3",
			);

			const liveData =
				yield* database.ignoredDiscordAccounts.findManyIgnoredDiscordAccountsById(
					["user1", "user2", "user3"],
				);

			expect(liveData?.data?.length).toBe(3);
			const ids = liveData?.data?.map((a) => a.id) ?? [];
			expect(ids).toContain("user1");
			expect(ids).toContain("user2");
			expect(ids).toContain("user3");
		}).pipe(Effect.provide(DatabaseTestLayer)),
);
