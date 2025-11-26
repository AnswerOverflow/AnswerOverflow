import { components } from "../_generated/api";
import type { ActionCtx, MutationCtx, QueryCtx } from "../client";
import { authComponent } from "../shared/betterAuth";
import {
	findUserServerSettingsById,
	getServerByDiscordId,
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

export async function requireAuth(
	ctx: QueryCtx | MutationCtx | ActionCtx,
): Promise<{ accountId: bigint; accessToken: string }> {
	const account = await getDiscordAccountWithToken(ctx);
	if (!account) {
		throw new Error("Not authenticated");
	}
	return account;
}
