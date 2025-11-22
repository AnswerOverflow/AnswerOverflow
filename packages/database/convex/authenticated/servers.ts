import { v } from "convex/values";
import { authenticatedQuery } from "../client";
import { getServerByDiscordId as getServerByDiscordIdShared } from "../shared/shared";

export const publicGetServerByDiscordId = authenticatedQuery({
	args: {
		discordId: v.string(),
	},
	handler: async (ctx, args) => {
		return await getServerByDiscordIdShared(ctx, args.discordId);
	},
});
