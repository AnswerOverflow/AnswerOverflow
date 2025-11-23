import { expect, it } from "@effect/vitest";
import {
	generateSnowflakeArray,
	generateSnowflakeString,
} from "@packages/test-utils/snowflakes";
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

		const userId = generateSnowflakeString();
		const account = createTestDiscordAccount(userId, "Test User");

		yield* database.discord_accounts.createDiscordAccount({ account });

		const liveData = yield* database.discord_accounts.getDiscordAccountById({
			id: userId,
		});

		expect(liveData?.id).toBe(userId);
		expect(liveData?.name).toBe("Test User");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("getDiscordAccountById returns null for non-existent account", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		const nonexistentId = generateSnowflakeString();
		const liveData = yield* database.discord_accounts.getDiscordAccountById({
			id: nonexistentId,
		});

		expect(liveData).toBeNull();
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("createDiscordAccount creates a new account", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		const userId = generateSnowflakeString();
		const account = createTestDiscordAccount(userId, "Test User");

		yield* database.discord_accounts.createDiscordAccount({ account });

		const liveData = yield* database.discord_accounts.getDiscordAccountById({
			id: userId,
		});

		expect(liveData?.id).toBe(userId);
		expect(liveData?.name).toBe("Test User");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("createDiscordAccount returns default account if ignored", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		const userId = generateSnowflakeString();
		yield* database.ignored_discord_accounts.upsertIgnoredDiscordAccount({
			id: userId,
		});

		const account = createTestDiscordAccount(userId, "Test User");
		const result = yield* database.discord_accounts.createDiscordAccount({
			account,
		});

		expect(result.id).toBe(userId);
		expect(result.name).toBe("Test User");
		expect(result.avatar).toBeUndefined();

		const liveData = yield* database.discord_accounts.getDiscordAccountById({
			id: userId,
		});
		expect(liveData).toBeNull();
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("updateDiscordAccount updates an existing account", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		const userId = generateSnowflakeString();
		const account = createTestDiscordAccount(userId, "Test User");
		yield* database.discord_accounts.createDiscordAccount({ account });

		const updated = createTestDiscordAccount(userId, "Updated Name", {
			avatar: "https://example.com/avatar.png",
		});

		yield* database.discord_accounts.updateDiscordAccount({ account: updated });

		const liveData = yield* database.discord_accounts.getDiscordAccountById({
			id: userId,
		});

		expect(liveData?.name).toBe("Updated Name");
		expect(liveData?.avatar).toBe("https://example.com/avatar.png");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("upsertDiscordAccount creates or updates account", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		const userId = generateSnowflakeString();
		const account1 = createTestDiscordAccount(userId, "Test User");
		yield* database.discord_accounts.upsertDiscordAccount({
			account: account1,
		});

		const liveData1 = yield* database.discord_accounts.getDiscordAccountById({
			id: userId,
		});
		expect(liveData1?.name).toBe("Test User");

		const account2 = createTestDiscordAccount(userId, "Updated Name");
		yield* database.discord_accounts.upsertDiscordAccount({
			account: account2,
		});

		const liveData2 = yield* database.discord_accounts.getDiscordAccountById({
			id: userId,
		});
		expect(liveData2?.name).toBe("Updated Name");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("get multiple accounts by individual calls", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		const [userId1, userId2, userId3] = generateSnowflakeArray(3);
		const accounts = [
			createTestDiscordAccount(userId1, "User 1"),
			createTestDiscordAccount(userId2, "User 2"),
			createTestDiscordAccount(userId3, "User 3"),
		];

		yield* database.discord_accounts.createManyDiscordAccounts({ accounts });

		const user1 = yield* database.discord_accounts.getDiscordAccountById({
			id: userId1,
		});
		const user2 = yield* database.discord_accounts.getDiscordAccountById({
			id: userId2,
		});
		const user3 = yield* database.discord_accounts.getDiscordAccountById({
			id: userId3,
		});

		expect(user1?.id).toBe(userId1);
		expect(user1?.name).toBe("User 1");
		expect(user2?.id).toBe(userId2);
		expect(user2?.name).toBe("User 2");
		expect(user3?.id).toBe(userId3);
		expect(user3?.name).toBe("User 3");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("deleteDiscordAccount deletes account and adds to ignored", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		const userId = generateSnowflakeString();
		const account = createTestDiscordAccount(userId, "Test User");
		yield* database.discord_accounts.createDiscordAccount({ account });

		const beforeDelete = yield* database.discord_accounts.getDiscordAccountById(
			{ id: userId },
		);
		expect(beforeDelete?.id).toBe(userId);

		yield* database.discord_accounts.deleteDiscordAccount({ id: userId });

		const afterDelete = yield* database.discord_accounts.getDiscordAccountById({
			id: userId,
		});
		expect(afterDelete).toBeNull();

		const ignored =
			yield* database.ignored_discord_accounts.findIgnoredDiscordAccountById({
				id: userId,
			});
		expect(ignored?.id).toBe(userId);
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("findIgnoredDiscordAccountById returns ignored account", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		const userId = generateSnowflakeString();
		yield* database.ignored_discord_accounts.upsertIgnoredDiscordAccount({
			id: userId,
		});

		const liveData =
			yield* database.ignored_discord_accounts.findIgnoredDiscordAccountById({
				id: userId,
			});

		expect(liveData?.id).toBe(userId);
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped(
	"findIgnoredDiscordAccountById returns null for non-ignored account",
	() =>
		Effect.gen(function* () {
			const database = yield* Database;

			const userId = generateSnowflakeString();
			const liveData =
				yield* database.ignored_discord_accounts.findIgnoredDiscordAccountById({
					id: userId,
				});

			expect(liveData).toBeNull();
		}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("deleteIgnoredDiscordAccount removes ignored account", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		const userId = generateSnowflakeString();
		yield* database.ignored_discord_accounts.upsertIgnoredDiscordAccount({
			id: userId,
		});

		const beforeDelete =
			yield* database.ignored_discord_accounts.findIgnoredDiscordAccountById({
				id: userId,
			});
		expect(beforeDelete?.id).toBe(userId);

		yield* database.ignored_discord_accounts.deleteIgnoredDiscordAccount({
			id: userId,
		});

		const afterDelete =
			yield* database.ignored_discord_accounts.findIgnoredDiscordAccountById({
				id: userId,
			});
		expect(afterDelete).toBeNull();
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped(
	"findManyIgnoredDiscordAccountsById returns multiple ignored accounts",
	() =>
		Effect.gen(function* () {
			const database = yield* Database;

			const [userId1, userId2, userId3] = generateSnowflakeArray(3);
			yield* database.ignored_discord_accounts.upsertIgnoredDiscordAccount({
				id: userId1,
			});
			yield* database.ignored_discord_accounts.upsertIgnoredDiscordAccount({
				id: userId2,
			});
			yield* database.ignored_discord_accounts.upsertIgnoredDiscordAccount({
				id: userId3,
			});

			const liveData =
				yield* database.ignored_discord_accounts.findManyIgnoredDiscordAccountsById(
					{ ids: [userId1, userId2, userId3] },
				);

			expect(liveData?.length).toBe(3);
			const ids = liveData?.map((a) => a.id) ?? [];
			expect(ids).toContain(userId1);
			expect(ids).toContain(userId2);
			expect(ids).toContain(userId3);
		}).pipe(Effect.provide(DatabaseTestLayer)),
);
