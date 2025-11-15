// Tests for discord account functions

import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import type { DiscordAccount } from "../convex/schema";
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

		yield* database.discord_accounts.createDiscordAccount({ account });

		const liveData = yield* database.discord_accounts.getDiscordAccountById({
			id: "user123",
		});

		expect(liveData?.id).toBe("user123");
		expect(liveData?.name).toBe("Test User");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("getDiscordAccountById returns null for non-existent account", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		const liveData = yield* database.discord_accounts.getDiscordAccountById({
			id: "nonexistent",
		});

		expect(liveData).toBeNull();
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("createDiscordAccount creates a new account", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		const account = createTestDiscordAccount("user123", "Test User");

		yield* database.discord_accounts.createDiscordAccount({ account });

		const liveData = yield* database.discord_accounts.getDiscordAccountById({
			id: "user123",
		});

		expect(liveData?.id).toBe("user123");
		expect(liveData?.name).toBe("Test User");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("createDiscordAccount returns default account if ignored", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		// First, ignore the account
		yield* database.ignored_discord_accounts.upsertIgnoredDiscordAccount({
			id: "user123",
		});

		// Try to create account
		const account = createTestDiscordAccount("user123", "Test User");
		const result = yield* database.discord_accounts.createDiscordAccount({
			account,
		});

		// Should return default account (no avatar)
		expect(result.id).toBe("user123");
		expect(result.name).toBe("Test User");
		expect(result.avatar).toBeUndefined();

		// Account should not exist in database
		const liveData = yield* database.discord_accounts.getDiscordAccountById({
			id: "user123",
		});
		expect(liveData).toBeNull();
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("updateDiscordAccount updates an existing account", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		const account = createTestDiscordAccount("user123", "Test User");
		yield* database.discord_accounts.createDiscordAccount({ account });

		const updated = createTestDiscordAccount("user123", "Updated Name", {
			avatar: "https://example.com/avatar.png",
		});

		yield* database.discord_accounts.updateDiscordAccount({ account: updated });

		const liveData = yield* database.discord_accounts.getDiscordAccountById({
			id: "user123",
		});

		expect(liveData?.name).toBe("Updated Name");
		expect(liveData?.avatar).toBe("https://example.com/avatar.png");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("upsertDiscordAccount creates or updates account", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		// First upsert (create)
		const account1 = createTestDiscordAccount("user123", "Test User");
		yield* database.discord_accounts.upsertDiscordAccount({
			account: account1,
		});

		const liveData1 = yield* database.discord_accounts.getDiscordAccountById({
			id: "user123",
		});
		expect(liveData1?.name).toBe("Test User");

		// Second upsert (update)
		const account2 = createTestDiscordAccount("user123", "Updated Name");
		yield* database.discord_accounts.upsertDiscordAccount({
			account: account2,
		});

		const liveData2 = yield* database.discord_accounts.getDiscordAccountById({
			id: "user123",
		});
		expect(liveData2?.name).toBe("Updated Name");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("get multiple accounts by individual calls", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		const accounts = [
			createTestDiscordAccount("user1", "User 1"),
			createTestDiscordAccount("user2", "User 2"),
			createTestDiscordAccount("user3", "User 3"),
		];

		yield* database.discord_accounts.createManyDiscordAccounts({ accounts });

		const user1 = yield* database.discord_accounts.getDiscordAccountById({
			id: "user1",
		});
		const user2 = yield* database.discord_accounts.getDiscordAccountById({
			id: "user2",
		});
		const user3 = yield* database.discord_accounts.getDiscordAccountById({
			id: "user3",
		});

		expect(user1?.id).toBe("user1");
		expect(user1?.name).toBe("User 1");
		expect(user2?.id).toBe("user2");
		expect(user2?.name).toBe("User 2");
		expect(user3?.id).toBe("user3");
		expect(user3?.name).toBe("User 3");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("deleteDiscordAccount deletes account and adds to ignored", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		const account = createTestDiscordAccount("user123", "Test User");
		yield* database.discord_accounts.createDiscordAccount({ account });

		// Verify account exists
		const beforeDelete = yield* database.discord_accounts.getDiscordAccountById(
			{ id: "user123" },
		);
		expect(beforeDelete?.id).toBe("user123");

		// Delete account
		yield* database.discord_accounts.deleteDiscordAccount({ id: "user123" });

		// Verify account is deleted
		const afterDelete = yield* database.discord_accounts.getDiscordAccountById({
			id: "user123",
		});
		expect(afterDelete).toBeNull();

		// Verify account is in ignored list
		const ignored =
			yield* database.ignored_discord_accounts.findIgnoredDiscordAccountById({
				id: "user123",
			});
		expect(ignored?.id).toBe("user123");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("findIgnoredDiscordAccountById returns ignored account", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.ignored_discord_accounts.upsertIgnoredDiscordAccount({
			id: "user123",
		});

		const liveData =
			yield* database.ignored_discord_accounts.findIgnoredDiscordAccountById({
				id: "user123",
			});

		expect(liveData?.id).toBe("user123");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped(
	"findIgnoredDiscordAccountById returns null for non-ignored account",
	() =>
		Effect.gen(function* () {
			const database = yield* Database;

			const liveData =
				yield* database.ignored_discord_accounts.findIgnoredDiscordAccountById({
					id: "user123",
				});

			expect(liveData).toBeNull();
		}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("deleteIgnoredDiscordAccount removes ignored account", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.ignored_discord_accounts.upsertIgnoredDiscordAccount({
			id: "user123",
		});

		// Verify ignored
		const beforeDelete =
			yield* database.ignored_discord_accounts.findIgnoredDiscordAccountById({
				id: "user123",
			});
		expect(beforeDelete?.id).toBe("user123");

		// Delete ignored account
		yield* database.ignored_discord_accounts.deleteIgnoredDiscordAccount({
			id: "user123",
		});

		// Verify deleted
		const afterDelete =
			yield* database.ignored_discord_accounts.findIgnoredDiscordAccountById({
				id: "user123",
			});
		expect(afterDelete).toBeNull();
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped(
	"findManyIgnoredDiscordAccountsById returns multiple ignored accounts",
	() =>
		Effect.gen(function* () {
			const database = yield* Database;

			yield* database.ignored_discord_accounts.upsertIgnoredDiscordAccount({
				id: "user1",
			});
			yield* database.ignored_discord_accounts.upsertIgnoredDiscordAccount({
				id: "user2",
			});
			yield* database.ignored_discord_accounts.upsertIgnoredDiscordAccount({
				id: "user3",
			});

			const liveData =
				yield* database.ignored_discord_accounts.findManyIgnoredDiscordAccountsById(
					{ ids: ["user1", "user2", "user3"] },
				);

			expect(liveData?.length).toBe(3);
			const ids = liveData?.map((a: any) => a.id) ?? [];
			expect(ids).toContain("user1");
			expect(ids).toContain("user2");
			expect(ids).toContain("user3");
		}).pipe(Effect.provide(DatabaseTestLayer)),
);
