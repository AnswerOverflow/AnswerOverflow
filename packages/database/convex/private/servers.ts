import { v } from "convex/values";
import { asyncMap } from "convex-helpers";
import { getOneFrom } from "convex-helpers/server/relationships";
import { Array as Arr, Predicate } from "effect";
import { privateMutation, privateQuery } from "../client";
import { serverSchema } from "../schema";

export const upsertServer = privateMutation({
	args: serverSchema,
	handler: async (ctx, args) => {
		const existing = await getOneFrom(
			ctx.db,
			"servers",
			"by_discordId",
			args.discordId,
		);
		if (existing) {
			await ctx.db.patch(existing._id, {
				...args,
				kickedTime: undefined,
			});
			return { isNew: false };
		}
		await ctx.db.insert("servers", {
			...args,
			kickedTime: undefined,
		});
		return { isNew: true };
	},
});

export const updateServer = privateMutation({
	args: {
		serverId: v.int64(),
		server: serverSchema.partial(),
	},
	handler: async (ctx, args) => {
		const existing = await getOneFrom(
			ctx.db,
			"servers",
			"by_discordId",
			args.serverId,
		);
		if (!existing) {
			throw new Error(`Server with id ${args.serverId} not found`);
		}
		return await ctx.db.patch(existing._id, args.server);
	},
});

export const getAllServers = privateQuery({
	args: {},
	handler: async (ctx) => {
		return await ctx.db.query("servers").collect();
	},
});

export const getServerByDiscordId = privateQuery({
	args: {
		discordId: v.int64(),
	},
	handler: async (ctx, args) => {
		return getOneFrom(ctx.db, "servers", "by_discordId", args.discordId);
	},
});

export const findManyServersById = privateQuery({
	args: {
		ids: v.array(v.id("servers")),
	},
	handler: async (ctx, args) => {
		if (args.ids.length === 0) return [];

		const servers = [];
		for (const id of args.ids) {
			const server = await ctx.db.get(id);
			if (server) {
				servers.push(server);
			}
		}
		return servers;
	},
});

export const findManyServersByDiscordId = privateQuery({
	args: {
		discordIds: v.array(v.int64()),
	},
	handler: async (ctx, args) => {
		if (args.discordIds.length === 0) return [];
		const servers = await asyncMap(args.discordIds, (discordId) =>
			getOneFrom(ctx.db, "servers", "by_discordId", discordId),
		);
		return Arr.filter(servers, Predicate.isNotNullable);
	},
});
