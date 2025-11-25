import { v } from "convex/values";
import { guildManagerQuery } from "../client/guildManager";
import { getServerByDiscordId as getServerByDiscordIdShared } from "../shared/shared";

export const publicGetServerByDiscordId = guildManagerQuery({
	args: {
		discordId: v.int64(),
	},
	handler: async (ctx, args) => {
		return await getServerByDiscordIdShared(ctx, args.discordId);
	},
});
