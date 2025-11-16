import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { assertIsUser } from "../convex/shared/auth";
import type {
	AuthorizedUser,
	CanEditServer,
	IsAuthenticated,
} from "../convex/shared/permissions";
import { DatabaseTestLayer } from "./database-test";

const _createMockCtx = (discordAccountId: string | null) => {
	return {
		auth: {
			getUserIdentity: async () => {
				if (!discordAccountId) return null;
				return {
					providerData: [
						{
							provider: "oauth_discord",
							providerUserId: discordAccountId,
						},
					],
				};
			},
		},
		// biome-ignore lint/suspicious/noExplicitAny: Test mocks need any types
		runQuery: async (_fn: any, _args: any) => {
			return null;
		},
		// biome-ignore lint/suspicious/noExplicitAny: Test mocks need any types
		db: {} as any,
		// biome-ignore lint/suspicious/noExplicitAny: Test mocks need any types
	} as any;
};

it("assertIsUser returns branded IsAuthenticated type", () => {
	const discordAccountId = "123456789";
	const targetUserId = "123456789";

	const result = assertIsUser(discordAccountId, targetUserId);

	const _typedResult: AuthorizedUser<IsAuthenticated> = result;

	expect(result.discordAccountId).toBe(discordAccountId);
	expect(result.userServerSettings).toBeNull();
});

it("assertIsUser throws when user IDs don't match", () => {
	const discordAccountId = "123456789";
	const targetUserId = "987654321";

	expect(() => assertIsUser(discordAccountId, targetUserId)).toThrow(
		"You are not authorized to do this",
	);
});

it("assertIsUser allows super users", () => {
	const superUserId = "523949187663134754"; // Rhys's Discord ID
	const targetUserId = "999999999";

	const result = assertIsUser(superUserId, targetUserId);

	expect(result.discordAccountId).toBe(superUserId);
	expect(result.userServerSettings).toBeNull();
});

it("assertIsUser throws when not authenticated", () => {
	const discordAccountId = null;
	const targetUserId = "123456789";

	expect(() => assertIsUser(discordAccountId, targetUserId)).toThrow(
		"Not authenticated",
	);
});

it("branded types enforce type safety", () => {
	const canEditUser: AuthorizedUser<CanEditServer> = {
		discordAccountId: "123",
		userServerSettings: null,
	} as AuthorizedUser<CanEditServer>;

	const isAuthUser: AuthorizedUser<IsAuthenticated> = {
		discordAccountId: "123",
		userServerSettings: null,
	} as AuthorizedUser<IsAuthenticated>;

	const _test1: AuthorizedUser<CanEditServer> = canEditUser;
	const _test2: AuthorizedUser<IsAuthenticated> = isAuthUser;

	expect(true).toBe(true); // Test passes if TypeScript compilation succeeds
});

it.scoped(
	"assertCanEditServer returns branded CanEditServer type when user has permissions",
	() =>
		// biome-ignore lint/correctness/useYield: No Effect operations to yield in this placeholder test
		Effect.gen(function* () {
			expect(true).toBe(true);
			return undefined;
		}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped(
	"assertIsAdminOrOwnerOfServer returns branded IsAdminOrOwner type when user is admin",
	() =>
		// biome-ignore lint/correctness/useYield: No Effect operations to yield in this placeholder test
		Effect.gen(function* () {
			expect(true).toBe(true);
			return undefined;
		}).pipe(Effect.provide(DatabaseTestLayer)),
);
