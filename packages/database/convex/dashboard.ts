"use node";

import {
	FetchHttpClient,
	HttpClient,
	HttpClientRequest,
} from "@effect/platform";
import { make } from "@packages/discord-api/generated";
import { Effect } from "effect";
import { api, components } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { authenticatedAction } from "./client";
import { authComponent } from "./shared/betterAuth";

import {
	DISCORD_PERMISSIONS,
	getHighestRoleFromPermissions,
	hasPermission,
	sortServersByBotAndRole,
} from "./shared/shared";

const discordApi = (token: string) =>
	Effect.gen(function* () {
		const httpClient = yield* HttpClient.HttpClient;
		return make(httpClient, {
			transformClient(client) {
				return Effect.succeed(
					client.pipe(
						HttpClient.mapRequest((req) =>
							HttpClientRequest.prependUrl(
								HttpClientRequest.setHeader(
									req,
									"Authorization",
									`Bearer ${token}`,
								),
								"https://discord.com/api/v10",
							),
						),
					),
				);
			},
		});
	}).pipe(Effect.provide(FetchHttpClient.layer));

type ServerWithMetadata = {
	discordId: string;
	name: string;
	icon: string | null;
	owner: boolean;
	permissions: string;
	highestRole: "Manage Guild" | "Administrator" | "Owner";
	hasBot: boolean;
	aoServerId: Id<"servers"> | undefined;
};

export const getUserServers = authenticatedAction({
	args: {},
	handler: async (ctx, args): Promise<ServerWithMetadata[]> => {
		const { discordAccountId } = args;

		// Get user from auth to get userId for querying accounts
		const user = await authComponent.getAuthUser(ctx);
		if (!user || typeof user !== "object" || user === null) {
			throw new Error("Invalid user object");
		}

		const userEmail =
			"email" in user && typeof user.email === "string" ? user.email : null;

		if (!userEmail) {
			throw new Error("User email not found");
		}

		const betterAuthUser = await ctx.runQuery(
			components.betterAuth.adapter.findOne,
			{
				model: "user",
				where: [
					{
						field: "email",
						operator: "eq",
						value: userEmail,
					},
				],
			},
		);

		if (!betterAuthUser || typeof betterAuthUser !== "object") {
			throw new Error("User not found in database");
		}

		// Convex documents use _id as the ID field
		const sessionUserId =
			"_id" in betterAuthUser && typeof betterAuthUser._id === "string"
				? betterAuthUser._id
				: null;

		if (!sessionUserId) {
			throw new Error("User ID not found");
		}

		// Get Discord OAuth account from BetterAuth database
		// Use the BetterAuth component's internal API to get accounts
		const accountsResult = await ctx.runQuery(
			components.betterAuth.adapter.findMany,
			{
				model: "account",
				where: [
					{
						field: "userId",
						operator: "eq",
						value: sessionUserId,
					},
				],
				paginationOpts: {
					cursor: null,
					numItems: 100,
				},
			},
		);

		// Handle paginated result - check if it's an array or has a page property
		type AccountResult = {
			providerId: string;
			accessToken: string | null;
			userId: string;
			accountId?: string; // Discord user ID (provider account ID)
		};

		const accounts: AccountResult[] = Array.isArray(accountsResult)
			? accountsResult
			: "page" in accountsResult && Array.isArray(accountsResult.page)
				? accountsResult.page
				: [];

		const discordAccount = accounts.find(
			(account) => account.providerId === "discord",
		);

		if (!discordAccount) {
			throw new Error("Discord account not linked");
		}

		// Verify the accountId matches what we got from the wrapper
		if (
			!("accountId" in discordAccount) ||
			typeof discordAccount.accountId !== "string" ||
			discordAccount.accountId !== discordAccountId
		) {
			throw new Error("Discord account ID mismatch");
		}

		// Get Discord OAuth token from BetterAuth
		// BetterAuth stores OAuth tokens in the account
		if (!("accessToken" in discordAccount)) {
			throw new Error("Discord account missing access token");
		}
		const token = discordAccount.accessToken;
		if (!token) {
			throw new Error("Discord token not found");
		}

		const client = await Effect.runPromise(discordApi(token));
		const cachedGuildsEffect = await client.listMyGuilds();
		const discordGuilds = await Effect.runPromise(cachedGuildsEffect);

		// Filter to servers user can manage (ManageGuild, Administrator, or Owner)
		const manageableServers = discordGuilds.filter((guild) => {
			const permissions = BigInt(guild.permissions);
			return (
				guild.owner ||
				hasPermission(permissions, DISCORD_PERMISSIONS.ManageGuild) ||
				hasPermission(permissions, DISCORD_PERMISSIONS.Administrator)
			);
		});

		// Match with Answer Overflow servers
		const serverDiscordIds = manageableServers.map((g) => g.id);
		const aoServers = await Promise.all(
			serverDiscordIds.map((discordId) =>
				ctx.runQuery(api.public.servers.publicGetServerByDiscordId, {
					discordId,
				}),
			),
		);

		// Sync user server settings with permissions from Discord API
		// This ensures the reactive query has data to work with
		const backendAccessToken = process.env.BACKEND_ACCESS_TOKEN;
		if (!backendAccessToken) {
			throw new Error("BACKEND_ACCESS_TOKEN not configured");
		}

		await Promise.all(
			manageableServers.map(async (guild, idx) => {
				const aoServer = aoServers[idx];
				if (!aoServer) return; // Skip if server doesn't exist in AO

				// Convert permissions string to number (Discord API returns permissions as string)
				const permissionsNumber = Number(guild.permissions);

				// Get existing user server settings
				const existingSettings = await ctx.runQuery(
					api.publicInternal.user_server_settings.findUserServerSettingsById,
					{
						backendAccessToken,
						userId: discordAccountId,
						serverId: aoServer._id,
					},
				);

				// Prepare settings - preserve existing values or use defaults
				const settings = {
					serverId: aoServer._id,
					userId: discordAccountId,
					permissions: permissionsNumber, // Sync permissions from Discord API
					canPubliclyDisplayMessages:
						existingSettings?.canPubliclyDisplayMessages ?? false,
					messageIndexingDisabled:
						existingSettings?.messageIndexingDisabled ?? false,
					apiKey: existingSettings?.apiKey,
					apiCallsUsed: existingSettings?.apiCallsUsed ?? 0,
				};

				// Upsert user server settings with synced permissions
				// Use publicInternalMutation which requires backendAccessToken
				await ctx.runMutation(
					api.publicInternal.user_server_settings.upsertUserServerSettings,
					{ backendAccessToken, settings },
				);
			}),
		);

		// Combine Discord guild data with AO server data
		const serversWithMetadata: ServerWithMetadata[] = manageableServers.map(
			(guild, idx) => {
				const aoServer = aoServers[idx];
				const permissions = BigInt(guild.permissions);

				const highestRole = getHighestRoleFromPermissions(
					permissions,
					guild.owner,
				);

				return {
					discordId: guild.id,
					name: guild.name,
					icon: guild.icon ?? null,
					owner: guild.owner,
					permissions: guild.permissions,
					highestRole,
					hasBot:
						aoServer !== null &&
						aoServer !== undefined &&
						(aoServer.kickedTime === null || aoServer.kickedTime === undefined),
					aoServerId: aoServer?._id,
				};
			},
		);

		// Sort: has bot + owner/admin/manage, then no bot + owner/admin/manage
		return sortServersByBotAndRole(serversWithMetadata);
	},
});
