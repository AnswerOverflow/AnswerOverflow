import { ActionCache } from "@convex-dev/action-cache";
import { v } from "convex/values";
import { components, internal } from "../_generated/api";
import type { DiscordInviteInfo } from "../private/github";
import { publicAction } from "./custom_functions";

const getDiscordInviteInfoCache = () =>
	new ActionCache(components.actionCache, {
		action: internal.private.github.fetchDiscordInviteInfoInternal,
		name: "discordInviteInfo",
		ttl: 24 * 60 * 60 * 1000,
	});

export const getDiscordInviteInfo = publicAction({
	args: {
		owner: v.string(),
		repo: v.string(),
	},
	returns: v.object({
		hasDiscordInvite: v.boolean(),
		inviteCodes: v.array(v.string()),
		isOnAnswerOverflow: v.boolean(),
		serverName: v.optional(v.string()),
	}),
	handler: async (ctx, args): Promise<DiscordInviteInfo> => {
		return await getDiscordInviteInfoCache().fetch(ctx, {
			owner: args.owner,
			repo: args.repo,
		});
	},
});
