import { v } from "convex/values";
import { getOneFrom } from "convex-helpers/server/relationships";
import { publicInternalMutation } from "../client";
import { serverSchema } from "../schema";

export const createServerExternal = publicInternalMutation({
	args: {
		data: serverSchema,
	},
	handler: async (ctx, args) => {
		// Check if server already exists
		const existing = await getOneFrom(
			ctx.db,
			"servers",
			"by_discordId",
			args.data.discordId,
		);

		if (existing) {
			throw new Error(
				`Server with discordId ${args.data.discordId} already exists`,
			);
		}

		return await ctx.db.insert("servers", args.data);
	},
});

export const updateServerExternal = publicInternalMutation({
	args: {
		id: v.id("servers"),
		data: serverSchema,
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db.get(args.id);
		if (!existing) {
			throw new Error(`Server with id ${args.id} not found`);
		}

		await ctx.db.patch(args.id, args.data);
		return args.id;
	},
});

export const upsertServerExternal = publicInternalMutation({
	args: {
		data: serverSchema,
	},
	handler: async (ctx, args) => {
		const existing = await getOneFrom(
			ctx.db,
			"servers",
			"by_discordId",
			args.data.discordId,
		);

		if (existing) {
			// Check if we need to clear kickedTime
			// If kickedTime is explicitly undefined in args.data and existing server has it set, clear it
			const shouldClearKickedTime =
				args.data.kickedTime === undefined &&
				existing.kickedTime !== undefined &&
				existing.kickedTime !== null;

			if (shouldClearKickedTime) {
				// Use replace to clear optional fields
				const { _id, _creationTime, ...existingData } = existing;
				await ctx.db.replace(existing._id, {
					...existingData,
					...args.data,
					kickedTime: undefined,
					_id,
					_creationTime,
				});
			} else {
				// Use patch for normal updates
				await ctx.db.patch(existing._id, args.data);
			}
			return existing._id;
		}
		return await ctx.db.insert("servers", args.data);
	},
});
