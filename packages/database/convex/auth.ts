import type { MutationCtx, QueryCtx } from "./_generated/server";
import type {
	AuthorizedUser,
	CanEditServer,
	IsAdminOrOwner,
	IsAuthenticated,
} from "./permissions";
import {
	findUserServerSettingsById,
	getServerByDiscordId,
} from "./shared";

/**
 * Get the authenticated user's Discord account ID from their BetterAuth identity
 * Returns null if not authenticated or no Discord account linked
 */
export async function getDiscordAccountIdFromAuth(
	ctx: QueryCtx | MutationCtx,
): Promise<string | null> {
	const identity = await ctx.auth.getUserIdentity();
	if (!identity) {
		return null;
	}

	// BetterAuth stores OAuth provider accounts in identity.providerData
	// Look for Discord provider
	const providerData = identity.providerData;
	if (!providerData || !Array.isArray(providerData)) {
		return null;
	}

	const discordProvider = providerData.find((provider) => {
		if (typeof provider !== "object" || provider === null) {
			return false;
		}
		const providerObj = provider as Record<string, unknown>;
		return providerObj.provider === "discord";
	});

	if (
		!discordProvider ||
		typeof discordProvider !== "object" ||
		discordProvider === null
	) {
		return null;
	}

	const providerUserId = (discordProvider as Record<string, unknown>)
		.providerUserId;

	if (!providerUserId || typeof providerUserId !== "string") {
		return null;
	}

	return providerUserId;
}

/**
 * Check if the authenticated user is a super user
 * Super users bypass permission checks
 */
export function isSuperUser(discordAccountId: string | null): boolean {
	// TODO: Move to env var
	const SUPER_USER_IDS = ["523949187663134754"]; // Rhys's Discord ID
	return discordAccountId !== null && SUPER_USER_IDS.includes(discordAccountId);
}

/**
 * Get user server settings for a specific server by Discord server ID
 * Used to check permissions
 */
export async function getUserServerSettingsForServerByDiscordId(
	ctx: QueryCtx | MutationCtx,
	userId: string,
	discordServerId: string,
) {
	// First, get the Convex server ID from Discord server ID
	const server = await getServerByDiscordId(ctx, discordServerId);

	if (!server) {
		return null;
	}

	// Then get user server settings using Convex server ID
	const settings = await findUserServerSettingsById(ctx, userId, server._id);

	return settings;
}

/**
 * Check if user has permission to edit a server
 * Requires Administrator or ManageGuild permission, or being the server owner
 * Returns a branded type that proves the permission check was performed.
 * @param discordServerId - Discord server ID (snowflake string)
 * @returns AuthorizedUser<CanEditServer> - Branded type proving permission was checked
 */
export async function assertCanEditServer(
	ctx: QueryCtx | MutationCtx,
	discordServerId: string,
	discordAccountId: string | null,
): Promise<AuthorizedUser<CanEditServer>> {
	if (!discordAccountId) {
		throw new Error("Not authenticated");
	}

	if (isSuperUser(discordAccountId)) {
		// Super users bypass permission checks but still return branded type
		// We need to get settings for the branded type, but skip the check
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

	// Get user server settings to check permissions
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

	// Check if user has Administrator or ManageGuild permission
	// Discord permission bitfield: Administrator = 0x8, ManageGuild = 0x20
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

	// Return branded type proving permission was checked
	return {
		discordAccountId,
		userServerSettings: settings,
	} as unknown as AuthorizedUser<CanEditServer>;
}

/**
 * Check if user is the owner or admin of a server
 * Returns a branded type that proves the permission check was performed.
 * @param discordServerId - Discord server ID (snowflake string)
 * @returns AuthorizedUser<IsAdminOrOwner> - Branded type proving permission was checked
 */
export async function assertIsAdminOrOwnerOfServer(
	ctx: QueryCtx | MutationCtx,
	discordServerId: string,
	discordAccountId: string | null,
): Promise<AuthorizedUser<IsAdminOrOwner>> {
	if (!discordAccountId) {
		throw new Error("Not authenticated");
	}

	if (isSuperUser(discordAccountId)) {
		// Super users bypass permission checks but still return branded type
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

	// Return branded type proving permission was checked
	return {
		discordAccountId,
		userServerSettings: settings,
	} as unknown as AuthorizedUser<IsAdminOrOwner>;
}

/**
 * Check if the authenticated user matches the target user ID
 * Returns a branded type that proves the user check was performed.
 * @returns AuthorizedUser<IsAuthenticated> - Branded type proving user was verified
 */
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

	// Return branded type proving user was verified
	return {
		discordAccountId,
		userServerSettings: null,
	} as AuthorizedUser<IsAuthenticated>;
}

/**
 * Require authentication - throws if user is not authenticated
 * Returns a branded type that proves authentication was checked.
 * @returns AuthorizedUser<IsAuthenticated> - Branded type proving authentication
 */
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

	// Return branded type proving authentication was checked
	return {
		discordAccountId,
		userServerSettings: null,
	} as AuthorizedUser<IsAuthenticated>;
}
