import { createConvexOtelLayer } from "@packages/observability/convex-effect-otel";
import { Effect, type Tracer } from "effect";
import { components } from "../_generated/api";
import type { ActionCtx, MutationCtx, QueryCtx } from "../client";
import { authComponent } from "../shared/betterAuth";
import type {
	AuthorizedUser,
	CanEditServer,
	IsAdminOrOwner,
	IsAuthenticated,
} from "../shared/permissions";
import {
	findUserServerSettingsById,
	getServerByDiscordId,
} from "../shared/shared";

export async function getDiscordAccountIdFromAuth(
	ctx: QueryCtx | MutationCtx | ActionCtx,
): Promise<string | null> {
	const user = await authComponent.getAuthUser(ctx);

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

	return accountId;
}

export function isSuperUser(discordAccountId: string | null): boolean {
	const SUPER_USER_IDS = ["523949187663134754"]; // Rhys's Discord ID
	return discordAccountId !== null && SUPER_USER_IDS.includes(discordAccountId);
}

export async function getUserServerSettingsForServerByDiscordId(
	ctx: QueryCtx | MutationCtx,
	userId: string,
	discordServerId: string,
) {
	const server = await getServerByDiscordId(ctx, discordServerId);

	if (!server) {
		return null;
	}

	const settings = await findUserServerSettingsById(ctx, userId, server._id);

	return settings;
}

export async function assertCanEditServer(
	ctx: QueryCtx | MutationCtx,
	discordServerId: string,
	discordAccountId: string | null,
): Promise<AuthorizedUser<CanEditServer>> {
	if (!discordAccountId) {
		throw new Error("No discord id");
	}

	if (isSuperUser(discordAccountId)) {
		const settings = await getUserServerSettingsForServerByDiscordId(
			ctx,
			discordAccountId,
			discordServerId,
		);
		return {
			discordAccountId,
			userServerSettings: settings,
		} as unknown as AuthorizedUser<CanEditServer>;
	}

	const settings = await getUserServerSettingsForServerByDiscordId(
		ctx,
		discordAccountId,
		discordServerId,
	);

	if (!settings) {
		throw new Error(
			"You are not a member of the server you are trying to edit",
		);
	}

	const ADMINISTRATOR = 0x8;
	const MANAGE_GUILD = 0x20;

	const hasAdminOrManageGuild =
		(settings.permissions & ADMINISTRATOR) === ADMINISTRATOR ||
		(settings.permissions & MANAGE_GUILD) === MANAGE_GUILD;

	if (!hasAdminOrManageGuild) {
		throw new Error(
			"You are missing the required permissions to edit this server",
		);
	}

	return {
		discordAccountId,
		userServerSettings: settings,
	} as unknown as AuthorizedUser<CanEditServer>;
}

export async function assertIsAdminOrOwnerOfServer(
	ctx: QueryCtx | MutationCtx,
	discordServerId: string,
	discordAccountId: string | null,
): Promise<AuthorizedUser<IsAdminOrOwner>> {
	if (!discordAccountId) {
		throw new Error("Not authenticated");
	}

	if (isSuperUser(discordAccountId)) {
		const settings = await getUserServerSettingsForServerByDiscordId(
			ctx,
			discordAccountId,
			discordServerId,
		);
		return {
			discordAccountId,
			userServerSettings: settings,
		} as unknown as AuthorizedUser<IsAdminOrOwner>;
	}

	const settings = await getUserServerSettingsForServerByDiscordId(
		ctx,
		discordAccountId,
		discordServerId,
	);

	if (!settings) {
		throw new Error("You are not a member of this server");
	}

	const ADMINISTRATOR = 0x8;
	const hasAdmin = (settings.permissions & ADMINISTRATOR) === ADMINISTRATOR;

	if (!hasAdmin) {
		throw new Error("Only administrators or the server owner can do this");
	}

	return {
		discordAccountId,
		userServerSettings: settings,
	} as unknown as AuthorizedUser<IsAdminOrOwner>;
}

export function assertIsUser(
	discordAccountId: string | null,
	targetUserId: string,
): AuthorizedUser<IsAuthenticated> {
	if (!discordAccountId) {
		throw new Error("Not authenticated");
	}

	if (isSuperUser(discordAccountId)) {
		return {
			discordAccountId,
			userServerSettings: null,
		} as unknown as AuthorizedUser<IsAuthenticated>;
	}

	if (discordAccountId !== targetUserId) {
		throw new Error("You are not authorized to do this");
	}

	return {
		discordAccountId,
		userServerSettings: null,
	} as AuthorizedUser<IsAuthenticated>;
}

export async function requireAuth(
	ctx: QueryCtx | MutationCtx,
): Promise<AuthorizedUser<IsAuthenticated>> {
	const identity = await ctx.auth.getUserIdentity();
	if (!identity) {
		throw new Error("Not authenticated");
	}

	const discordAccountId = await getDiscordAccountIdFromAuth(ctx);
	if (!discordAccountId) {
		throw new Error("Discord account not linked");
	}

	return {
		discordAccountId,
		userServerSettings: null,
	} as AuthorizedUser<IsAuthenticated>;
}

export async function getDiscordAccountWithToken(
	ctx: QueryCtx | MutationCtx | ActionCtx,
	parentSpan?: Tracer.AnySpan,
): Promise<{ accountId: string; accessToken: string } | null> {
	const user = await authComponent.getAuthUser(ctx);
	if (!user) {
		return null;
	}

	const accountResult = await Effect.gen(function* () {
		return yield* Effect.withSpan(
			"auth.getDiscordAccountWithToken.findAccount",
			{
				...(parentSpan ? { parent: parentSpan } : {}),
			},
		)(
			Effect.gen(function* () {
				yield* Effect.annotateCurrentSpan({
					"auth.user.id": user._id,
					"auth.provider": "discord",
				});
				return yield* Effect.tryPromise({
					try: () =>
						ctx.runQuery(components.betterAuth.adapter.findOne, {
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
						}),
					catch: (error) => new Error(String(error)),
				});
			}),
		);
	}).pipe(Effect.provide(createConvexOtelLayer("database")), Effect.runPromise);

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
		accountId: accountResult.accountId,
		accessToken: accountResult.accessToken,
	};
}
