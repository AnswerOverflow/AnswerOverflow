import { hasDashboardRoleAccess } from "../shared/guildManagerPermissions";

type ExistingDashboardAccess = {
	permissions: number;
	roleIds?: readonly bigint[];
};

export type DashboardAccessSyncDecision =
	| {
			status: "member_not_found";
			roleIds: bigint[];
			hasManageAccess: false;
			hasRoleAccess: false;
	  }
	| {
			status: "unchanged" | "synced";
			roleIds: bigint[];
			hasManageAccess: boolean;
			hasRoleAccess: boolean;
	  };

function normalizeRoleIds(roleIds: readonly bigint[]): bigint[] {
	return [...new Set(roleIds)].sort((left, right) => {
		if (left === right) {
			return 0;
		}
		return left < right ? -1 : 1;
	});
}

function haveSameRoleIds(
	left: readonly bigint[] | undefined,
	right: readonly bigint[] | undefined,
): boolean {
	const normalizedLeft = normalizeRoleIds(left ?? []);
	const normalizedRight = normalizeRoleIds(right ?? []);

	if (normalizedLeft.length !== normalizedRight.length) {
		return false;
	}

	return normalizedLeft.every(
		(roleId, index) => roleId === normalizedRight[index],
	);
}

export function planDashboardAccessSync(args: {
	existingSettings: ExistingDashboardAccess | null;
	permissions: number;
	hasManageAccess: boolean;
	memberRoleIds: readonly bigint[] | null;
	dashboardRoleIds: readonly bigint[] | undefined;
}): DashboardAccessSyncDecision {
	if (!args.memberRoleIds && !args.hasManageAccess) {
		return {
			status: "member_not_found",
			roleIds: args.existingSettings?.roleIds
				? [...args.existingSettings.roleIds]
				: [],
			hasManageAccess: false,
			hasRoleAccess: false,
		};
	}

	const roleIds = normalizeRoleIds(
		args.memberRoleIds ?? args.existingSettings?.roleIds ?? [],
	);
	const hasRoleAccess = args.memberRoleIds
		? hasDashboardRoleAccess(roleIds, args.dashboardRoleIds)
		: false;
	const settingsAreCurrent =
		args.existingSettings?.permissions === args.permissions &&
		haveSameRoleIds(args.existingSettings.roleIds, roleIds);

	return {
		status: settingsAreCurrent ? "unchanged" : "synced",
		roleIds,
		hasManageAccess: args.hasManageAccess,
		hasRoleAccess,
	};
}
