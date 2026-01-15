import { Data, Equal } from "effect";
import { describe, expect, test } from "vitest";
import { toAODiscordAccount } from "../utils/conversions";

function hasRelevantChanges(
	oldUser: {
		partial?: boolean;
		id: string;
		displayName?: string;
		username: string;
		avatar: string | null;
	},
	newUser: {
		id: string;
		displayName?: string;
		username: string;
		avatar: string | null;
	},
): boolean {
	if (oldUser.partial) return true;
	const oldAccount = Data.struct(
		toAODiscordAccount(oldUser as Parameters<typeof toAODiscordAccount>[0]),
	);
	const newAccount = Data.struct(
		toAODiscordAccount(newUser as Parameters<typeof toAODiscordAccount>[0]),
	);
	return !Equal.equals(oldAccount, newAccount);
}

describe("hasRelevantChanges", () => {
	const baseUser = {
		id: "123456789",
		displayName: "Test User",
		username: "testuser",
		avatar: "abc123",
	};

	test("returns true for partial old user", () => {
		const oldUser = { ...baseUser, partial: true as const };
		const newUser = { ...baseUser };
		expect(hasRelevantChanges(oldUser, newUser)).toBe(true);
	});

	test("returns false when nothing changed", () => {
		const oldUser = { ...baseUser };
		const newUser = { ...baseUser };
		expect(hasRelevantChanges(oldUser, newUser)).toBe(false);
	});

	test("returns true when displayName changed", () => {
		const oldUser = { ...baseUser };
		const newUser = { ...baseUser, displayName: "New Name" };
		expect(hasRelevantChanges(oldUser, newUser)).toBe(true);
	});

	test("returns true when username changed (fallback for name)", () => {
		const oldUser = { ...baseUser, displayName: undefined };
		const newUser = {
			...baseUser,
			displayName: undefined,
			username: "newusername",
		};
		expect(hasRelevantChanges(oldUser, newUser)).toBe(true);
	});

	test("returns true when avatar changed", () => {
		const oldUser = { ...baseUser };
		const newUser = { ...baseUser, avatar: "newavatar456" };
		expect(hasRelevantChanges(oldUser, newUser)).toBe(true);
	});

	test("returns true when avatar removed", () => {
		const oldUser = { ...baseUser };
		const newUser = { ...baseUser, avatar: null };
		expect(hasRelevantChanges(oldUser, newUser)).toBe(true);
	});

	test("returns true when avatar added", () => {
		const oldUser = { ...baseUser, avatar: null };
		const newUser = { ...baseUser, avatar: "newavatar" };
		expect(hasRelevantChanges(oldUser, newUser)).toBe(true);
	});

	test("returns false when irrelevant fields change (simulated)", () => {
		const oldUser = { ...baseUser };
		const newUser = { ...baseUser };
		expect(hasRelevantChanges(oldUser, newUser)).toBe(false);
	});
});
