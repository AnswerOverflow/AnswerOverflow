import type { MutationCtx, QueryCtx } from "../client";
import { getUserServerSettingsForServerByDiscordId, isSuperUser } from "./auth";

const ADMINISTRATOR = 0x8;
const MANAGE_GUILD = 0x20;

export type GuildManagerPermissionResult =
	| { hasPermission: true }
	| { hasPermission: false; errorMessage: string };

export async function checkGuildManagerPermissions(
	ctx: QueryCtx | MutationCtx,
	discordAccountId: bigint,
	serverId: bigint,
): Promise<GuildManagerPermissionResult> {
	if (isSuperUser(discordAccountId)) {
		return {
			hasPermission: true,
		};
	}
	const userServerSettings = await getUserServerSettingsForServerByDiscordId(
		ctx,
		discordAccountId,
		serverId,
	);

	if (!userServerSettings) {
		return {
			hasPermission: false,
			errorMessage: "You are not a member of the server",
		};
	}

	const hasAdminOrManageGuild =
		(userServerSettings.permissions & ADMINISTRATOR) === ADMINISTRATOR ||
		(userServerSettings.permissions & MANAGE_GUILD) === MANAGE_GUILD;

	if (hasAdminOrManageGuild) {
		return {
			hasPermission: true,
		};
	}

	return {
		hasPermission: false,
		errorMessage: "Insufficient permissions",
	};
}

export function assertGuildManagerPermission(
	result: GuildManagerPermissionResult,
): asserts result is { hasPermission: true } {
	if (!result.hasPermission) {
		throw new Error(result.errorMessage);
	}
}
