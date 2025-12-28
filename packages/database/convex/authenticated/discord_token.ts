"use node";

import { refreshAccessToken } from "better-auth/oauth2";
import { Data, Effect, Schema } from "effect";
import { components, internal } from "../_generated/api";
import { ConfectMutationCtx } from "../client/confectAuthenticated";
import { internalMutation, internalAction, ConfectActionCtx } from "../confect";
import { getDiscordAccountWithToken, getTokenStatus } from "../shared/auth";

export class DiscordTokenError extends Data.TaggedError("DiscordTokenError")<{
	readonly message: string;
	readonly code: "REFRESH_FAILED" | "NO_REFRESH_TOKEN" | "REAUTH_REQUIRED";
}> {}

const DISCORD_TOKEN_ENDPOINT = "https://discord.com/api/oauth2/token";

const refreshDiscordToken = (
	refreshToken: string,
): Effect.Effect<
	{ accessToken: string; refreshToken?: string; accessTokenExpiresAt?: Date },
	DiscordTokenError
> =>
	Effect.gen(function* () {
		const clientId = process.env.DISCORD_CLIENT_ID;
		const clientSecret = process.env.DISCORD_CLIENT_SECRET;

		if (!clientId || !clientSecret) {
			return yield* Effect.fail(
				new DiscordTokenError({
					message: "Discord OAuth credentials not configured",
					code: "REFRESH_FAILED",
				}),
			);
		}

		const result = yield* Effect.tryPromise({
			try: () =>
				refreshAccessToken({
					refreshToken,
					options: {
						clientId,
						clientSecret,
					},
					tokenEndpoint: DISCORD_TOKEN_ENDPOINT,
				}),
			catch: (error) => {
				const errorMessage =
					error instanceof Error ? error.message : String(error);

				if (
					errorMessage.includes("invalid_grant") ||
					errorMessage.includes("401") ||
					errorMessage.includes("400")
				) {
					return new DiscordTokenError({
						message:
							"Refresh token is invalid or expired. Please re-authenticate.",
						code: "REAUTH_REQUIRED",
					});
				}

				return new DiscordTokenError({
					message: `Failed to refresh Discord token: ${errorMessage}`,
					code: "REFRESH_FAILED",
				});
			},
		});

		if (!result.accessToken) {
			return yield* Effect.fail(
				new DiscordTokenError({
					message: "No access token returned from refresh",
					code: "REFRESH_FAILED",
				}),
			);
		}

		return {
			accessToken: result.accessToken,
			refreshToken: result.refreshToken,
			accessTokenExpiresAt: result.accessTokenExpiresAt,
		};
	});

export const updateAccountTokens = internalMutation({
	args: Schema.Struct({
		accountId: Schema.String,
		accessToken: Schema.String,
		refreshToken: Schema.String,
		accessTokenExpiresAt: Schema.Number,
	}),
	returns: Schema.Null,
	handler: ({ accountId, accessToken, refreshToken, accessTokenExpiresAt }) =>
		Effect.gen(function* () {
			const { ctx } = yield* ConfectMutationCtx;

			yield* Effect.promise(() =>
				ctx.runMutation(components.betterAuth.adapter.updateOne, {
					input: {
						model: "account",
						where: [
							{
								field: "accountId",
								operator: "eq",
								value: accountId,
							},
						],
						update: {
							accessToken,
							refreshToken,
							accessTokenExpiresAt,
							updatedAt: Date.now(),
						},
					},
				}),
			);

			return null;
		}),
});

type RefreshSuccess = {
	readonly success: true;
	readonly accountId: bigint;
	readonly accessToken: string;
};

type RefreshFailure = {
	readonly success: false;
	readonly error: string;
	readonly code:
		| "NOT_AUTHENTICATED"
		| "NO_REFRESH_TOKEN"
		| "REFRESH_FAILED"
		| "REAUTH_REQUIRED";
};

type RefreshResult = RefreshSuccess | RefreshFailure;

const RefreshSuccessSchema = Schema.Struct({
	success: Schema.Literal(true),
	accountId: Schema.BigIntFromSelf,
	accessToken: Schema.String,
});

const RefreshFailureSchema = Schema.Struct({
	success: Schema.Literal(false),
	error: Schema.String,
	code: Schema.Union(
		Schema.Literal("NOT_AUTHENTICATED"),
		Schema.Literal("NO_REFRESH_TOKEN"),
		Schema.Literal("REFRESH_FAILED"),
		Schema.Literal("REAUTH_REQUIRED"),
	),
});

const RefreshResultSchema = Schema.Union(
	RefreshSuccessSchema,
	RefreshFailureSchema,
);

export const refreshAndGetValidToken = internalAction({
	args: Schema.Struct({}),
	returns: RefreshResultSchema,
	handler: (): Effect.Effect<RefreshResult, never, ConfectActionCtx> =>
		Effect.gen(function* () {
			const { ctx } = yield* ConfectActionCtx;

			const account = yield* Effect.promise(() =>
				getDiscordAccountWithToken(ctx),
			);

			if (!account) {
				return {
					success: false as const,
					error: "Not authenticated",
					code: "NOT_AUTHENTICATED" as const,
				};
			}

			const tokenStatus = getTokenStatus(account.accessTokenExpiresAt);
			const needsRefresh = tokenStatus === "expired" || !account.accessToken;

			if (!needsRefresh && account.accessToken) {
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

			const tokensResult = yield* refreshDiscordToken(
				account.refreshToken,
			).pipe(Effect.either);

			if (tokensResult._tag === "Left") {
				const error = tokensResult.left;
				return {
					success: false as const,
					error: error.message,
					code: error.code,
				};
			}

			const tokens = tokensResult.right;

			const accessToken = tokens.accessToken;
			const newRefreshToken = tokens.refreshToken ?? account.refreshToken ?? "";

			const accessTokenExpiresAt = tokens.accessTokenExpiresAt
				? tokens.accessTokenExpiresAt.getTime()
				: Date.now() + 7 * 24 * 60 * 60 * 1000;

			yield* Effect.promise(() =>
				ctx.runMutation(
					internal.authenticated.discord_token.updateAccountTokens,
					{
						accountId: account.accountId.toString(),
						accessToken,
						refreshToken: newRefreshToken,
						accessTokenExpiresAt,
					},
				),
			);

			return {
				success: true as const,
				accountId: account.accountId,
				accessToken,
			};
		}),
});
