import { refreshAccessToken } from "better-auth/oauth2";
import { v } from "convex/values";
import { components, internal } from "../_generated/api";
import { internalAction, internalMutation } from "../client";
import { getDiscordAccountWithToken, getTokenStatus } from "../shared/auth";

export class DiscordTokenError extends Error {
	constructor(
		message: string,
		public readonly code:
			| "TOKEN_EXPIRED"
			| "REFRESH_FAILED"
			| "NO_REFRESH_TOKEN"
			| "REAUTH_REQUIRED",
	) {
		super(message);
		this.name = "DiscordTokenError";
	}
}

const DISCORD_TOKEN_ENDPOINT = "https://discord.com/api/oauth2/token";

async function refreshDiscordToken(refreshToken: string) {
	const clientId = process.env.DISCORD_CLIENT_ID;
	const clientSecret = process.env.DISCORD_CLIENT_SECRET;

	if (!clientId || !clientSecret) {
		throw new DiscordTokenError(
			"Discord OAuth credentials not configured",
			"REFRESH_FAILED",
		);
	}

	try {
		const tokens = await refreshAccessToken({
			refreshToken,
			options: {
				clientId,
				clientSecret,
			},
			tokenEndpoint: DISCORD_TOKEN_ENDPOINT,
		});

		if (!tokens.accessToken) {
			throw new DiscordTokenError(
				"No access token returned from refresh",
				"REFRESH_FAILED",
			);
		}

		return tokens;
	} catch (error) {
		if (error instanceof DiscordTokenError) {
			throw error;
		}

		const errorMessage = error instanceof Error ? error.message : String(error);

		if (
			errorMessage.includes("invalid_grant") ||
			errorMessage.includes("401") ||
			errorMessage.includes("400")
		) {
			throw new DiscordTokenError(
				"Refresh token is invalid or expired. Please re-authenticate.",
				"REAUTH_REQUIRED",
			);
		}

		throw new DiscordTokenError(
			`Failed to refresh Discord token: ${errorMessage}`,
			"REFRESH_FAILED",
		);
	}
}

export const updateAccountTokens = internalMutation({
	args: {
		accountId: v.string(),
		accessToken: v.string(),
		refreshToken: v.string(),
		accessTokenExpiresAt: v.number(),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		await ctx.runMutation(components.betterAuth.adapter.updateOne, {
			input: {
				model: "account",
				where: [
					{
						field: "accountId",
						operator: "eq",
						value: args.accountId,
					},
				],
				update: {
					accessToken: args.accessToken,
					refreshToken: args.refreshToken,
					accessTokenExpiresAt: args.accessTokenExpiresAt,
					updatedAt: Date.now(),
				},
			},
		});

		return null;
	},
});

export const refreshAndGetValidToken = internalAction({
	args: {},
	returns: v.union(
		v.object({
			success: v.literal(true),
			accountId: v.int64(),
			accessToken: v.string(),
		}),
		v.object({
			success: v.literal(false),
			error: v.string(),
			code: v.union(
				v.literal("TOKEN_EXPIRED"),
				v.literal("REFRESH_FAILED"),
				v.literal("NO_REFRESH_TOKEN"),
				v.literal("REAUTH_REQUIRED"),
				v.literal("NOT_AUTHENTICATED"),
			),
		}),
	),
	handler: async (ctx) => {
		const account = await getDiscordAccountWithToken(ctx);

		if (!account) {
			return {
				success: false as const,
				error: "Not authenticated",
				code: "NOT_AUTHENTICATED" as const,
			};
		}

		const tokenStatus = getTokenStatus(account.accessTokenExpiresAt);

		if (tokenStatus === "valid") {
			return {
				success: true as const,
				accountId: account.accountId,
				accessToken: account.accessToken,
			};
		}

		if (tokenStatus === "no_expiry_info") {
			return {
				success: true as const,
				accountId: account.accountId,
				accessToken: account.accessToken,
			};
		}

		if (!account.refreshToken) {
			return {
				success: false as const,
				error:
					"Token expired and no refresh token available. Please re-authenticate.",
				code: "NO_REFRESH_TOKEN" as const,
			};
		}

		try {
			const tokens = await refreshDiscordToken(account.refreshToken);

			if (!tokens.accessToken) {
				return {
					success: false as const,
					error: "No access token returned from refresh",
					code: "REFRESH_FAILED" as const,
				};
			}

			const accessTokenExpiresAt = tokens.accessTokenExpiresAt
				? tokens.accessTokenExpiresAt.getTime()
				: Date.now() + 7 * 24 * 60 * 60 * 1000;

			await ctx.runMutation(
				internal.authenticated.discord_token.updateAccountTokens,
				{
					accountId: account.accountId.toString(),
					accessToken: tokens.accessToken,
					refreshToken: tokens.refreshToken ?? account.refreshToken,
					accessTokenExpiresAt,
				},
			);

			return {
				success: true as const,
				accountId: account.accountId,
				accessToken: tokens.accessToken,
			};
		} catch (error) {
			if (error instanceof DiscordTokenError) {
				return {
					success: false as const,
					error: error.message,
					code: error.code,
				};
			}

			console.error("Unexpected error refreshing Discord token:", error);
			return {
				success: false as const,
				error: "An unexpected error occurred while refreshing the token",
				code: "REFRESH_FAILED" as const,
			};
		}
	},
});

export async function getValidDiscordToken(
	ctx: Parameters<typeof getDiscordAccountWithToken>[0],
): Promise<{
	accountId: bigint;
	accessToken: string;
	needsRefresh: boolean;
	refreshToken: string | null;
	accessTokenExpiresAt: number | null;
} | null> {
	const account = await getDiscordAccountWithToken(ctx);

	if (!account) {
		return null;
	}

	const tokenStatus = getTokenStatus(account.accessTokenExpiresAt);

	return {
		accountId: account.accountId,
		accessToken: account.accessToken,
		needsRefresh: tokenStatus === "expired",
		refreshToken: account.refreshToken,
		accessTokenExpiresAt: account.accessTokenExpiresAt,
	};
}
