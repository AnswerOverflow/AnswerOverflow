export const DISCORD_PERMISSIONS = {
	Administrator: 0x8,
	ManageGuild: 0x20,
} as const;

export function hasPermission(
	permissions: number | bigint,
	permission: number | bigint,
): boolean {
	if (typeof permissions === "bigint" || typeof permission === "bigint") {
		const permsBigInt = BigInt(permissions);
		const permBigInt = BigInt(permission);
		return (permsBigInt & permBigInt) === permBigInt;
	}
	return (permissions & permission) === permission;
}

export function getHighestRoleFromPermissions(
	permissions: number | bigint,
	isOwner: boolean = false,
): "Owner" | "Administrator" | "Manage Guild" {
	if (isOwner) {
		return "Owner";
	}
	if (hasPermission(permissions, DISCORD_PERMISSIONS.Administrator)) {
		return "Administrator";
	}
	return "Manage Guild";
}
