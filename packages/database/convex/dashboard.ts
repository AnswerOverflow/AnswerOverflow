"use node";

import { createClerkClient } from "@clerk/backend";
import { Effect } from "effect";
import { discordApi } from "../src/discord";
import { action } from "./_generated/server";

const clerkClient = createClerkClient({
	secretKey: process.env.CLERK_SECRET_KEY,
});

export const getForCurrentUser = action({
	args: {},
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (identity === null || identity.email === undefined) {
			throw new Error("Not authenticated");
		}
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
		const response = await clerkClient.users.getUserOauthAccessToken(
			user.id,
			"discord",
		);

		const token = response.data.at(0)?.token;

		if (!token) {
			throw new Error("Discord token not found");
		}

		const getServers = Effect.gen(function* () {
			const rest = yield* discordApi(token);
			return yield* rest.listMyGuilds({});
		});

		const result = await Effect.runPromiseExit(getServers);
		console.log("result", result);
		return JSON.stringify(result);
	},
});
