import { v } from "convex/values";
import { getOneFrom } from "convex-helpers/server/relationships";
import { privateMutation, privateQuery } from "../client";
import {
	getServerByDiscordId,
	validateCustomDomainUniqueness,
} from "../shared/shared";

const serverPreferencesSchema = v.object({
	serverId: v.string(),
	readTheRulesConsentEnabled: v.optional(v.boolean()),
	considerAllMessagesPublicEnabled: v.optional(v.boolean()),
	anonymizeMessagesEnabled: v.optional(v.boolean()),
	customDomain: v.optional(v.string()),
	subpath: v.optional(v.string()),
});

export const getServerPreferencesByServerId = privateQuery({
	args: {
		serverId: v.string(),
	},
	handler: async (ctx, args) => {
		const preferences = await getOneFrom(
			ctx.db,
			"serverPreferences",
			"by_serverId",
			args.serverId,
		);

		return preferences ?? null;
	},
});

export const upsertServerPreferences = privateMutation({
	args: serverPreferencesSchema,
	handler: async (ctx, args) => {
		const { serverId, ...preferences } = args;
		const existing = await ctx.db
			.query("serverPreferences")
			.withIndex("by_serverId", (q) => q.eq("serverId", serverId))
			.first();

		if (existing) {
			if (
				preferences.customDomain &&
				preferences.customDomain !== existing.customDomain
			) {
				const domainError = await validateCustomDomainUniqueness(
					ctx,

					preferences.customDomain,

					undefined,

					existing._id,
				);

				if (domainError) {
					throw new Error(domainError);
				}
			}

			await ctx.db.patch(existing._id, preferences);
			const updated = await ctx.db.get(existing._id);
			if (!updated) {
				throw new Error("Failed to update server preferences");
			}
			return updated;
		} else {
			const domainError = await validateCustomDomainUniqueness(
				ctx,

				preferences.customDomain,

				serverId,
			);

			if (domainError) {
				throw new Error(domainError);
			}

			const preferencesId = await ctx.db.insert("serverPreferences", args);

			const serverRecord = await getServerByDiscordId(ctx, serverId);
			if (serverRecord) {
				await ctx.db.patch(serverRecord._id, {
					preferencesId,
				});
			}

			const created = await ctx.db.get(preferencesId);
			if (!created) {
				throw new Error("Failed to create server preferences");
			}
			return created;
		}
	},
});
