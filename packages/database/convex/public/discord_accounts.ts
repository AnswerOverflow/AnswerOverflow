import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { asyncMap } from "convex-helpers";
import { getOneFrom } from "convex-helpers/server/relationships";
import { enrichMessagesWithServerAndChannels } from "../shared/dataAccess";
import { getDiscordAccountById as getDiscordAccountByIdShared } from "../shared/shared";
import { publicQuery } from "./custom_functions";

export const getUserPosts = publicQuery({
	args: {
		userId: v.int64(),
		serverId: v.optional(v.int64()),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (ctx, args) => {
		const serverIdFilter = args.serverId ?? null;

		const paginatedResult = await ctx.db
			.query("messages")
			.withIndex("by_authorId_and_childThreadId", (q) =>
				q.eq("authorId", args.userId).gte("childThreadId", 0n),
			)
			.order("desc")
			.paginate(args.paginationOpts);

		const filteredMessages = serverIdFilter
			? paginatedResult.page.filter((m) => m.serverId === serverIdFilter)
			: paginatedResult.page;

		const enrichedPosts = await enrichMessagesWithServerAndChannels(
			ctx,
			filteredMessages,
		);

		return {
			page: enrichedPosts,
			isDone: paginatedResult.isDone,
			continueCursor: paginatedResult.continueCursor,
		};
	},
});

export const getUserPageHeaderData = publicQuery({
	args: {
		userId: v.int64(),
	},
	handler: async (ctx, args) => {
		const user = await getDiscordAccountByIdShared(ctx, args.userId);
		if (!user) {
			return null;
		}

		const userServerSettings = await ctx.db
			.query("userServerSettings")
			.withIndex("by_userId", (q) => q.eq("userId", args.userId))
			.collect();
		const serverPreferences = await asyncMap(
			userServerSettings,
			async (userServerSetting) => {
				return getOneFrom(
					ctx.db,
					"serverPreferences",
					"by_serverId",
					userServerSetting.serverId,
				);
			},
		);

		const isPublic =
			userServerSettings.some(
				(userServerSetting) => userServerSetting.canPubliclyDisplayMessages,
			) ||
			serverPreferences.some(
				(serverPreference) =>
					serverPreference?.considerAllMessagesPublicEnabled &&
					!serverPreference.anonymizeMessagesEnabled,
			);

		if (!isPublic) {
			return null;
		}
		return {
			user: {
				id: user.id.toString(),
				name: user.name,
				avatar: user.avatar,
			},
			servers: [],
		};
	},
});
