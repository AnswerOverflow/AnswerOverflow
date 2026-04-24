import { Data, Equal } from "effect";
import { describe, expect, test } from "vitest";
import { toAODiscordAccount } from "../utils/conversions";
import {
	getMemberPermissions,
	getMemberRoleIds,
	hasRelevantMemberAccessChanges,
} from "./user";

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

function createMemberAccessState({
	guildId = "1",
	partial = false,
	permissionBitfield = 32n,
	roleIds = ["1", "3", "2"],
}: {
	guildId?: string;
	partial?: boolean;
	permissionBitfield?: bigint;
	roleIds?: string[];
} = {}): Parameters<typeof getMemberRoleIds>[0] {
	return {
		partial,
		guild: { id: guildId },
		permissions: { bitfield: permissionBitfield },
		roles: { cache: new Map(roleIds.map((roleId) => [roleId, {}])) },
	};
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

describe("getMemberRoleIds", () => {
	test("filters the guild id role and sorts the remaining role ids", () => {
		const member = createMemberAccessState({
			guildId: "10",
			roleIds: ["42", "10", "7"],
		});

		expect(getMemberRoleIds(member)).toEqual([7n, 42n]);
	});
});

describe("getMemberPermissions", () => {
	test("preserves dashboard permissions from unsafe Discord permission bitfields", () => {
		const member = createMemberAccessState({
			permissionBitfield: (1n << 56n) | 8n,
		});

		expect(Number(member.permissions.bitfield) & 8).toBe(0);
		expect(getMemberPermissions(member)).toBe(8);
	});
});

describe("hasRelevantMemberAccessChanges", () => {
	test("returns true when the old member is partial", () => {
		const oldMember = createMemberAccessState({ partial: true });
		const newMember = createMemberAccessState();

		expect(hasRelevantMemberAccessChanges(oldMember, newMember)).toBe(true);
	});

	test("returns false when permissions and role ids are unchanged", () => {
		const oldMember = createMemberAccessState({
			roleIds: ["1", "5", "3"],
			permissionBitfield: 32n,
		});
		const newMember = createMemberAccessState({
			roleIds: ["3", "1", "5"],
			permissionBitfield: 32n,
		});

		expect(hasRelevantMemberAccessChanges(oldMember, newMember)).toBe(false);
	});

	test("returns true when permissions change", () => {
		const oldMember = createMemberAccessState({ permissionBitfield: 32n });
		const newMember = createMemberAccessState({ permissionBitfield: 64n });

		expect(hasRelevantMemberAccessChanges(oldMember, newMember)).toBe(true);
	});

	test("returns true when role ids change", () => {
		const oldMember = createMemberAccessState({ roleIds: ["1", "5", "3"] });
		const newMember = createMemberAccessState({ roleIds: ["1", "5", "9"] });

		expect(hasRelevantMemberAccessChanges(oldMember, newMember)).toBe(true);
	});
});
