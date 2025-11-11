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
import { action } from "./_generated/server";
import { authComponent } from "./betterAuth";
import { getOrSetCache } from "./cache";

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

// Permission flags
const PERMISSIONS = {
	Administrator: 0x8n,
	ManageGuild: 0x20n,
} as const;

function hasPermission(permissions: bigint, permission: bigint): boolean {
	return (permissions & permission) === permission;
}

export const getUserServers = action({
	args: {},
	handler: async (ctx): Promise<ServerWithMetadata[]> => {
		const startTime = performance.now();
		console.log("[getUserServers] Starting getUserServers");

		// Check if user is authenticated
		// Note: getAuthUser doesn't require crypto.subtle, unlike getSession
		const authStartTime = performance.now();
		const user = await authComponent.getAuthUser(ctx);
		const authEndTime = performance.now();
		console.log(
			`[getUserServers] getAuthUser took ${(authEndTime - authStartTime).toFixed(2)}ms`,
		);
		if (!user) {
			throw new Error("Not authenticated");
		}

		// getAuthUser returns user object but without id field
		// Query user table by email to get the userId
		// This avoids needing crypto.subtle which isn't available in actions
		if (typeof user !== "object" || user === null) {
			throw new Error("Invalid user object");
		}

		const userEmail =
			"email" in user && typeof user.email === "string" ? user.email : null;

		if (!userEmail) {
			throw new Error("User email not found");
		}

		const findUserStartTime = performance.now();
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
		const findUserEndTime = performance.now();
		console.log(
			`[getUserServers] findOne user query took ${(findUserEndTime - findUserStartTime).toFixed(2)}ms`,
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
		const findAccountsStartTime = performance.now();
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
		const findAccountsEndTime = performance.now();
		console.log(
			`[getUserServers] findMany accounts query took ${(findAccountsEndTime - findAccountsStartTime).toFixed(2)}ms`,
		);

		// Handle paginated result - check if it's an array or has a page property
		type AccountResult = {
			providerId: string;
			accessToken: string | null;
			userId: string;
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

		// Get Discord OAuth token from BetterAuth
		// BetterAuth stores OAuth tokens in the account
		if (!("accessToken" in discordAccount)) {
			throw new Error("Discord account missing access token");
		}
		const token = discordAccount.accessToken;
		if (!token) {
			throw new Error("Discord token not found");
		}

		// Fetch user's Discord servers using the API client
		// Cache the result for 5 minutes to reduce API calls
		const cacheKey = `discord:guilds:${sessionUserId}`;
		const clientStartTime = performance.now();
		const client = await Effect.runPromise(discordApi(token));
		const clientEndTime = performance.now();
		console.log(
			`[getUserServers] Creating Discord API client took ${(clientEndTime - clientStartTime).toFixed(2)}ms`,
		);

		const fetchGuildsStartTime = performance.now();
		const cachedGuildsEffect = getOrSetCache(
			cacheKey,
			() => client.listMyGuilds(),
			300, // 5 minutes TTL
		);
		const discordGuilds = await Effect.runPromise(cachedGuildsEffect);
		const fetchGuildsEndTime = performance.now();
		console.log(
			`[getUserServers] Fetching Discord guilds (${discordGuilds.length} total) took ${(fetchGuildsEndTime - fetchGuildsStartTime).toFixed(2)}ms`,
		);

		// Filter to servers user can manage (ManageGuild, Administrator, or Owner)
		const filterStartTime = performance.now();
		const manageableServers = discordGuilds.filter((guild) => {
			const permissions = BigInt(guild.permissions);
			return (
				guild.owner ||
				hasPermission(permissions, PERMISSIONS.ManageGuild) ||
				hasPermission(permissions, PERMISSIONS.Administrator)
			);
		});
		const filterEndTime = performance.now();
		console.log(
			`[getUserServers] Filtering manageable servers (${manageableServers.length} manageable out of ${discordGuilds.length} total) took ${(filterEndTime - filterStartTime).toFixed(2)}ms`,
		);

		// Match with Answer Overflow servers
		const serverDiscordIds = manageableServers.map((g) => g.id);
		const fetchAoServersStartTime = performance.now();
		const aoServersArray = await ctx.runQuery(
			api.servers.publicFindManyServersByDiscordId,
			{ discordIds: serverDiscordIds },
		);
		const fetchAoServersEndTime = performance.now();
		console.log(
			`[getUserServers] Fetching ${serverDiscordIds.length} AO servers took ${(fetchAoServersEndTime - fetchAoServersStartTime).toFixed(2)}ms`,
		);

		// Create a map from Discord ID to server for efficient lookup
		const aoServersMap = new Map(
			aoServersArray.map((server) => [server.discordId, server]),
		);

		// Combine Discord guild data with AO server data
		const combineStartTime = performance.now();
		const serversWithMetadata: ServerWithMetadata[] = manageableServers.map(
			(guild) => {
				const aoServer = aoServersMap.get(guild.id);
				const permissions = BigInt(guild.permissions);

				let highestRole: "Manage Guild" | "Administrator" | "Owner" =
					"Manage Guild";
				if (guild.owner) {
					highestRole = "Owner";
				} else if (hasPermission(permissions, PERMISSIONS.Administrator)) {
					highestRole = "Administrator";
				}

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
		const sorted = serversWithMetadata.sort(
			(a: ServerWithMetadata, b: ServerWithMetadata) => {
				if (a.hasBot && !b.hasBot) return -1;
				if (!a.hasBot && b.hasBot) return 1;

				const roleOrder: Record<
					"Owner" | "Administrator" | "Manage Guild",
					number
				> = {
					Owner: 0,
					Administrator: 1,
					"Manage Guild": 2,
				};
				return roleOrder[a.highestRole] - roleOrder[b.highestRole];
			},
		);
		const combineEndTime = performance.now();
		console.log(
			`[getUserServers] Combining and sorting servers took ${(combineEndTime - combineStartTime).toFixed(2)}ms`,
		);

		const totalTime = performance.now() - startTime;
		console.log(
			`[getUserServers] Total execution time: ${totalTime.toFixed(2)}ms`,
		);

		return sorted;
	},
});
