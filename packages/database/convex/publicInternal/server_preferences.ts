import { v } from "convex/values";
import { getOneFrom } from "convex-helpers/server/relationships";
import { publicInternalMutation, publicInternalQuery } from "../client";
import { validateCustomDomainUniqueness } from "../shared/shared";

const serverPreferencesSchema = v.object({
	serverId: v.id("servers"),
	readTheRulesConsentEnabled: v.optional(v.boolean()),
	considerAllMessagesPublicEnabled: v.optional(v.boolean()),
	anonymizeMessagesEnabled: v.optional(v.boolean()),
	customDomain: v.optional(v.string()),
	subpath: v.optional(v.string()),
});

export const getServerPreferencesByServerId = publicInternalQuery({
	args: {
		serverId: v.id("servers"),
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

export const createServerPreferences = publicInternalMutation({
	args: {
		preferences: serverPreferencesSchema,
	},
	handler: async (ctx, args) => {
		const server = await ctx.db.get(args.preferences.serverId);
		if (!server) {
			throw new Error("Server not found");
		}

		const existing = await ctx.db
			.query("serverPreferences")
			.withIndex("by_serverId", (q) =>
				q.eq("serverId", args.preferences.serverId),
			)
			.first();

		if (existing) {
			throw new Error("Server preferences already exist");
		}

		const domainError = await validateCustomDomainUniqueness(
			ctx,

			args.preferences.customDomain,

			args.preferences.serverId,
		);

		if (domainError) {
			throw new Error(domainError);
		}

		const preferencesId = await ctx.db.insert(
			"serverPreferences",
			args.preferences,
		);

		const serverRecord = await ctx.db.get(args.preferences.serverId);
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
	},
});

export const updateServerPreferences = publicInternalMutation({
	args: {
		preferences: serverPreferencesSchema,
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query("serverPreferences")
			.withIndex("by_serverId", (q) =>
				q.eq("serverId", args.preferences.serverId),
			)
			.first();

		if (!existing) {
			throw new Error("Server preferences not found");
		}

		if (
			args.preferences.customDomain &&
			args.preferences.customDomain !== existing.customDomain
		) {
			const domainError = await validateCustomDomainUniqueness(
				ctx,

				args.preferences.customDomain,

				undefined,

				existing._id,
			);

			if (domainError) {
				throw new Error(domainError);
			}
		}

		await ctx.db.patch(existing._id, args.preferences);

		const updated = await ctx.db.get(existing._id);
		if (!updated) {
			throw new Error("Failed to update server preferences");
		}

		return updated;
	},
});

export const upsertServerPreferences = publicInternalMutation({
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

			const serverRecord = await ctx.db.get(serverId);
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

export const deleteServerPreferences = publicInternalMutation({
	args: {
		serverId: v.id("servers"),
	},
	handler: async (ctx, args) => {
		const preferences = await getOneFrom(
			ctx.db,
			"serverPreferences",
			"by_serverId",
			args.serverId,
		);

		if (preferences) {
			const serverRecord = await ctx.db.get(args.serverId);
			if (serverRecord) {
				await ctx.db.patch(serverRecord._id, {
					preferencesId: undefined,
				});
			}

			await ctx.db.delete(preferences._id);
		}

		return null;
	},
});
