import { getOneFrom } from "convex-helpers/server/relationships";
import { v } from "convex/values";
import { internalQuery, privateMutation, privateQuery } from "../client";
import { planValidator } from "../schema";
import {
	DEFAULT_SERVER_PREFERENCES,
	upsertServerPreferencesLogic,
	validateCustomDomainUniqueness,
} from "../shared";

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
		await upsertServerPreferencesLogic(ctx, args.serverId, args.preferences);
		return args.serverId;
	},
});

export const updateStripeCustomer = privateMutation({
	args: {
		serverId: v.int64(),
		stripeCustomerId: v.string(),
	},
	handler: async (ctx, args) => {
		await upsertServerPreferencesLogic(ctx, args.serverId, {
			stripeCustomerId: args.stripeCustomerId,
		});
	},
});

export const updateStripeSubscription = privateMutation({
	args: {
		serverId: v.int64(),
		stripeSubscriptionId: v.union(v.string(), v.null()),
		plan: planValidator,
	},
	handler: async (ctx, args) => {
		await upsertServerPreferencesLogic(ctx, args.serverId, {
			stripeSubscriptionId: args.stripeSubscriptionId ?? undefined,
			plan: args.plan,
		});
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
