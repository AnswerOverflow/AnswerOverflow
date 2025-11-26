import { api, components } from "../_generated/api";
import type { ActionCtx, MutationCtx, QueryCtx } from "../client";
import { authComponent } from "../shared/betterAuth";
import {
	DISCORD_PERMISSIONS,
	findUserServerSettingsById,
	getServerByDiscordId,
	hasPermission,
} from "../shared/shared";

export async function getDiscordAccountIdFromAuth(
	ctx: QueryCtx | MutationCtx | ActionCtx,
): Promise<bigint | null> {
	const user = await authComponent.safeGetAuthUser(ctx);

	if (!user) {
		return null;
	}

	const accountResult = await ctx.runQuery(
		components.betterAuth.adapter.findOne,
		{
			model: "account",
			where: [
				{
					field: "userId",
					operator: "eq",
					value: user._id,
				},
				{
					field: "providerId",
					operator: "eq",
					value: "discord",
				},
			],
		},
	);

	if (
		!accountResult ||
		typeof accountResult !== "object" ||
		!("accountId" in accountResult) ||
		!("providerId" in accountResult)
	) {
		return null;
	}

	const accountId = accountResult.accountId;
	const providerId = accountResult.providerId;

	if (providerId !== "discord") {
		return null;
	}

	if (typeof accountId !== "string") {
		return null;
	}

	return BigInt(accountId);
}

export function isSuperUser(discordAccountId: bigint | null): boolean {
	const SUPER_USER_IDS = [BigInt("523949187663134754")]; // Rhys's Discord ID
	return discordAccountId !== null && SUPER_USER_IDS.includes(discordAccountId);
}

export async function getUserServerSettingsForServerByDiscordId(
	ctx: QueryCtx | MutationCtx,
	userId: bigint,
	discordServerId: bigint,
) {
	const server = await getServerByDiscordId(ctx, discordServerId);

	if (!server) {
		return null;
	}

	const settings = await findUserServerSettingsById(
		ctx,
		userId,
		server.discordId,
	);

	return settings;
}

export async function getDiscordAccountWithToken(
	ctx: QueryCtx | MutationCtx | ActionCtx,
): Promise<{ accountId: bigint; accessToken: string } | null> {
	const user = await authComponent.getAuthUser(ctx);
	if (!user) {
		return null;
	}

	const accountResult = await ctx.runQuery(
		components.betterAuth.adapter.findOne,
		{
			model: "account",
			where: [
				{
					field: "userId",
					operator: "eq",
					value: user._id,
				},
				{
					field: "providerId",
					operator: "eq",
					value: "discord",
				},
			],
		},
	);

	if (
		!accountResult ||
		typeof accountResult !== "object" ||
		!("accountId" in accountResult) ||
		typeof accountResult.accountId !== "string" ||
		!("accessToken" in accountResult) ||
		typeof accountResult.accessToken !== "string" ||
		!accountResult.accessToken
	) {
		return null;
	}

	return {
		accountId: BigInt(accountResult.accountId),
		accessToken: accountResult.accessToken,
	};
}

function getBackendAccessToken(): string {
	const token = process.env.BACKEND_ACCESS_TOKEN;
	return token ?? "";
}

export async function requireAuth(
	ctx: QueryCtx | MutationCtx | ActionCtx,
): Promise<{ accountId: bigint; accessToken: string }> {
	const account = await getDiscordAccountWithToken(ctx);
	if (!account) {
		throw new Error("Not authenticated");
	}
	return account;
}

export async function requireAuthWithManageGuild(
	ctx: ActionCtx,
	serverId: bigint,
): Promise<{ accountId: bigint; accessToken: string }> {
	const account = await requireAuth(ctx);
	const backendAccessToken = getBackendAccessToken();

	const settings = await ctx.runQuery(
		api.private.user_server_settings.findUserServerSettingsById,
		{
			backendAccessToken,
			userId: account.accountId,
			serverId,
		},
	);

	if (!settings) {
		throw new Error("You are not a member of this server");
	}

	const hasAdminOrManageGuild =
		hasPermission(settings.permissions, DISCORD_PERMISSIONS.Administrator) ||
		hasPermission(settings.permissions, DISCORD_PERMISSIONS.ManageGuild);

	if (!hasAdminOrManageGuild) {
		throw new Error(
			"You need Manage Guild or Administrator permission to perform this action",
		);
	}

	return account;
}
