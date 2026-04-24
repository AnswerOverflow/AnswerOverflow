import { describe, expect, test } from "vitest";
import {
	DISCORD_PERMISSIONS,
	getDashboardPermissionMask,
	hasPermission,
} from "./permissionsShared";

describe("getDashboardPermissionMask", () => {
	test("preserves dashboard permissions from unsafe Discord permission strings", () => {
		const permissions = (1n << 56n) | BigInt(DISCORD_PERMISSIONS.Administrator);

		expect(Number(permissions) & DISCORD_PERMISSIONS.Administrator).toBe(0);
		expect(getDashboardPermissionMask(permissions.toString())).toBe(
			DISCORD_PERMISSIONS.Administrator,
		);
	});

	test("keeps only dashboard-relevant permissions", () => {
		const unrelatedPermission = 1n << 56n;
		const permissions =
			unrelatedPermission |
			BigInt(DISCORD_PERMISSIONS.Administrator) |
			BigInt(DISCORD_PERMISSIONS.ManageGuild);

		expect(getDashboardPermissionMask(permissions)).toBe(
			DISCORD_PERMISSIONS.Administrator | DISCORD_PERMISSIONS.ManageGuild,
		);
	});
});

describe("hasPermission", () => {
	test("supports bigint permission checks", () => {
		const permissions = (1n << 56n) | BigInt(DISCORD_PERMISSIONS.Administrator);

		expect(hasPermission(permissions, DISCORD_PERMISSIONS.Administrator)).toBe(
			true,
		);
	});
});
