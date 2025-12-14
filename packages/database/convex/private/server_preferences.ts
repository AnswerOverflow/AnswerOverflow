import { v } from "convex/values";
import { getOneFrom } from "convex-helpers/server/relationships";
import { internalQuery, privateMutation, privateQuery } from "../client";
import { planValidator } from "../schema";
import { validateCustomDomainUniqueness } from "../shared/shared";

const serverPreferencesSchema = v.object({
	serverId: v.int64(),
	stripeCustomerId: v.optional(v.string()),
	stripeSubscriptionId: v.optional(v.string()),
	plan: planValidator,
	readTheRulesConsentEnabled: v.optional(v.boolean()),
	considerAllMessagesPublicEnabled: v.optional(v.boolean()),
	anonymizeMessagesEnabled: v.optional(v.boolean()),
	customDomain: v.optional(v.string()),
	subpath: v.optional(v.string()),
	addedByUserId: v.optional(v.int64()),
});

const DEFAULT_SERVER_PREFERENCES = {
	plan: "FREE" as const,
	readTheRulesConsentEnabled: false,
	considerAllMessagesPublicEnabled: true,
	anonymizeMessagesEnabled: false,
};

export const getServerPreferencesByServerId = privateQuery({
	args: {
		serverId: v.int64(),
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
		const existing = await getOneFrom(
			ctx.db,
			"serverPreferences",
			"by_serverId",
			serverId,
		);

		if (existing) {
			if (
				preferences.customDomain &&
				preferences.customDomain !== existing.customDomain
			) {
				const domainError = await validateCustomDomainUniqueness(
					ctx,
					preferences.customDomain,
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
			);

			if (domainError) {
				throw new Error(domainError);
			}

			const preferencesId = await ctx.db.insert("serverPreferences", args);

			const created = await ctx.db.get(preferencesId);
			if (!created) {
				throw new Error("Failed to create server preferences");
			}
			return created;
		}
	},
});

export const updateServerPreferences = privateMutation({
	args: {
		serverId: v.int64(),
		preferences: serverPreferencesSchema.partial(),
	},
	handler: async (ctx, args) => {
		const existing = await getOneFrom(
			ctx.db,
			"serverPreferences",
			"by_serverId",
			args.serverId,
		);

		if (existing) {
			await ctx.db.patch(existing._id, {
				...existing,
				...args.preferences,
				serverId: args.serverId,
			});
		} else {
			await ctx.db.insert("serverPreferences", {
				...DEFAULT_SERVER_PREFERENCES,
				...args.preferences,
				serverId: args.serverId,
			});
		}

		return args.serverId;
	},
});

export const updateStripeCustomer = privateMutation({
	args: {
		serverId: v.int64(),
		stripeCustomerId: v.string(),
	},
	handler: async (ctx, args) => {
		const existing = await getOneFrom(
			ctx.db,
			"serverPreferences",
			"by_serverId",
			args.serverId,
		);

		if (existing) {
			await ctx.db.patch(existing._id, {
				stripeCustomerId: args.stripeCustomerId,
			});
		} else {
			await ctx.db.insert("serverPreferences", {
				...DEFAULT_SERVER_PREFERENCES,
				serverId: args.serverId,
				stripeCustomerId: args.stripeCustomerId,
			});
		}
	},
});

export const updateStripeSubscription = privateMutation({
	args: {
		serverId: v.int64(),
		stripeSubscriptionId: v.union(v.string(), v.null()),
		plan: planValidator,
	},
	handler: async (ctx, args) => {
		const existing = await getOneFrom(
			ctx.db,
			"serverPreferences",
			"by_serverId",
			args.serverId,
		);

		if (existing) {
			await ctx.db.patch(existing._id, {
				stripeSubscriptionId: args.stripeSubscriptionId ?? undefined,
				plan: args.plan,
			});
		} else {
			await ctx.db.insert("serverPreferences", {
				...DEFAULT_SERVER_PREFERENCES,
				serverId: args.serverId,
				stripeSubscriptionId: args.stripeSubscriptionId ?? undefined,
				plan: args.plan,
			});
		}
	},
});

export const getServerPreferencesByCustomDomain = internalQuery({
	args: {
		customDomain: v.string(),
	},
	handler: async (ctx, args) => {
		const preferences = await getOneFrom(
			ctx.db,
			"serverPreferences",
			"by_customDomain",
			args.customDomain,
			"customDomain",
		);

		return preferences ?? null;
	},
});
