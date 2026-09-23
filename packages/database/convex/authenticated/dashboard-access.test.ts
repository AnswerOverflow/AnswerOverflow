import { describe, expect, it } from "vitest";
import { planDashboardAccessSync } from "./dashboard-access";

describe("planDashboardAccessSync", () => {
	it("syncs verified manage-server access when member roles are unavailable", () => {
		expect(
			planDashboardAccessSync({
				existingSettings: null,
				permissions: 40,
				hasManageAccess: true,
				memberRoleIds: null,
				dashboardRoleIds: [10n],
			}),
		).toEqual({
			status: "synced",
			roleIds: [],
			hasManageAccess: true,
			hasRoleAccess: false,
		});
	});

	it("preserves known roles while refreshing manage-server permissions", () => {
		expect(
			planDashboardAccessSync({
				existingSettings: { permissions: 32, roleIds: [20n, 10n] },
				permissions: 40,
				hasManageAccess: true,
				memberRoleIds: null,
				dashboardRoleIds: [10n],
			}),
		).toEqual({
			status: "synced",
			roleIds: [10n, 20n],
			hasManageAccess: true,
			hasRoleAccess: false,
		});
	});

	it("does not grant role-only access without a verified guild member", () => {
		expect(
			planDashboardAccessSync({
				existingSettings: { permissions: 32, roleIds: [10n] },
				permissions: 32,
				hasManageAccess: false,
				memberRoleIds: null,
				dashboardRoleIds: [10n],
			}),
		).toEqual({
			status: "member_not_found",
			roleIds: [10n],
			hasManageAccess: false,
			hasRoleAccess: false,
		});
	});
});
