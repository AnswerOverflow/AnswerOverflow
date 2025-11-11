"use node";

import { createClerkClient } from "@clerk/backend";
import {
	FetchHttpClient,
	HttpClient,
	HttpClientRequest,
} from "@effect/platform";
import { make } from "@packages/discord-api/generated";
import { Effect } from "effect";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action } from "./_generated/server";

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

const clerkClient = createClerkClient({
	secretKey: process.env.CLERK_SECRET_KEY,
});

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
		const identity = await ctx.auth.getUserIdentity();
		if (identity === null || identity.email === undefined) {
			throw new Error("Not authenticated");
		}

		// Get Clerk user
		const userList = await clerkClient.users.getUserList({
			emailAddress: [identity.email],
		});
		if (userList.totalCount > 1) {
			throw new Error("Multiple users found for email");
		}
		const user = userList.data[0];
		if (!user) {
			throw new Error("User not found");
		}

		// Get Discord OAuth token
		const response = await clerkClient.users.getUserOauthAccessToken(
			user.id,
			"discord",
		);

		const token = response.data.at(0)?.token;
		if (!token) {
			throw new Error("Discord token not found");
		}

		// Fetch user's Discord servers using the API client
		const client = await Effect.runPromise(discordApi(token));
		const discordGuilds = await Effect.runPromise(client.listMyGuilds());

		// Filter to servers user can manage (ManageGuild, Administrator, or Owner)
		const manageableServers = discordGuilds.filter((guild) => {
			const permissions = BigInt(guild.permissions);
			return (
				guild.owner ||
				hasPermission(permissions, PERMISSIONS.ManageGuild) ||
				hasPermission(permissions, PERMISSIONS.Administrator)
			);
		});

		// Match with Answer Overflow servers
		const serverDiscordIds = manageableServers.map((g) => g.id);
		const aoServers = await Promise.all(
			serverDiscordIds.map((discordId) =>
				ctx.runQuery(api.servers.publicGetServerByDiscordId, { discordId }),
			),
		);

		// Combine Discord guild data with AO server data
		const serversWithMetadata: ServerWithMetadata[] = manageableServers.map(
			(guild, idx) => {
				const aoServer = aoServers[idx];
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
						aoServer?.kickedTime === null || aoServer?.kickedTime === undefined,
					aoServerId: aoServer?._id,
				};
			},
		);

		// Sort: has bot + owner/admin/manage, then no bot + owner/admin/manage
		return serversWithMetadata.sort(
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
	},
});
