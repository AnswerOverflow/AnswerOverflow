import { z } from "zod";
import { components } from "../_generated/api";
import type { ActionCtx, MutationCtx, QueryCtx } from "../client";
import { authComponent } from "../shared/betterAuth";
import {
	findUserServerSettingsById,
	getServerByDiscordId,
} from "../shared/shared";

const discordAccountSchema = z.object({
	accountId: z.string(),
	providerId: z.literal("discord"),
	userId: z.string(),
	accessToken: z.string().nullish(),
	refreshToken: z.string().nullish(),
	accessTokenExpiresAt: z.number().nullish(),
});

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

	const parsed = discordAccountSchema.safeParse(accountResult);
	if (!parsed.success) {
		return null;
	}

	return BigInt(parsed.data.accountId);
}

export function isSuperUser(discordAccountId: bigint | null): boolean {
	const SUPER_USER_IDS = [BigInt("523949187663134754")];
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

	const parsed = discordAccountSchema.safeParse(accountResult);
	if (!parsed.success) {
		return null;
	}

	return {
		accountId: BigInt(parsed.data.accountId),
		accessToken: parsed.data.accessToken ?? null,
		refreshToken: parsed.data.refreshToken ?? null,
		accessTokenExpiresAt: parsed.data.accessTokenExpiresAt ?? null,
	};
}
