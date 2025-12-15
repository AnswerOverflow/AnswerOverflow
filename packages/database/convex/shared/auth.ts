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

export type DiscordAccountToken = {
	accountId: bigint;
	accessToken: string | null;
	refreshToken: string | null;
	accessTokenExpiresAt: number | null;
};

export type TokenStatus = "valid" | "expired" | "no_expiry_info";

const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000;

export function getTokenStatus(expiresAt: number | null): TokenStatus {
	if (expiresAt === null) {
		return "no_expiry_info";
	}
	const now = Date.now();
	if (expiresAt - TOKEN_EXPIRY_BUFFER_MS <= now) {
		return "expired";
	}
	return "valid";
}

export async function getDiscordAccountWithToken(
	ctx: QueryCtx | MutationCtx | ActionCtx,
): Promise<DiscordAccountToken | null> {
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
		typeof accountResult.accountId !== "string"
	) {
		return null;
	}

	const accessToken =
		"accessToken" in accountResult &&
		typeof accountResult.accessToken === "string"
			? accountResult.accessToken
			: null;

	const refreshToken =
		"refreshToken" in accountResult &&
		typeof accountResult.refreshToken === "string"
			? accountResult.refreshToken
			: null;

	const accessTokenExpiresAt =
		"accessTokenExpiresAt" in accountResult &&
		typeof accountResult.accessTokenExpiresAt === "number"
			? accountResult.accessTokenExpiresAt
			: null;

	return {
		accountId: BigInt(accountResult.accountId),
		accessToken,
		refreshToken,
		accessTokenExpiresAt,
	};
}
