import { v } from "convex/values";
import { components, internal } from "../_generated/api";
import {
	anonOrAuthenticatedMutation,
	anonOrAuthenticatedQuery,
	internalMutation,
	type MutationCtx,
	type QueryCtx,
} from "../client";
import { authComponent } from "../shared/betterAuth";
import {
	getPlanConfig,
	USER_PLANS,
	type UserPlanType,
} from "../shared/userPlans";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function getUserPlan(
	ctx: QueryCtx,
	userId: string,
): Promise<UserPlanType> {
	const subscriptions = await ctx.runQuery(
		components.stripe.public.listSubscriptionsByUserId,
		{ userId },
	);

	const activeSubscription = subscriptions.find(
		(s) => s.status === "active" || s.status === "trialing",
	);

	if (activeSubscription) {
		return "PRO";
	}

	return "FREE";
}

async function getOrCreateUsage(ctx: QueryCtx | MutationCtx, userId: string) {
	const existing = await ctx.db
		.query("userMessageUsage")
		.withIndex("by_userId", (q) => q.eq("userId", userId))
		.first();

	if (existing) {
		return existing;
	}

	return null;
}

async function ensureUsageRecord(ctx: MutationCtx, userId: string) {
	const existing = await getOrCreateUsage(ctx, userId);
	if (existing) {
		return existing;
	}

	const now = Date.now();
	const id = await ctx.db.insert("userMessageUsage", {
		userId,
		periodStart: now,
		periodEnd: now + DAY_MS,
		subscriptionMessagesUsed: 0,
		purchasedCredits: 0,
	});

	const created = await ctx.db.get(id);
	if (!created) {
		throw new Error("Failed to create usage record");
	}
	return created;
}

export async function checkAndConsumeMessage(
	ctx: MutationCtx,
	userId: string,
): Promise<{ allowed: boolean; reason?: string }> {
	const plan = await getUserPlan(ctx, userId);
	const planConfig = getPlanConfig(plan);
	const usage = await ensureUsageRecord(ctx, userId);
	const now = Date.now();

	if (plan === "FREE" && planConfig.dailyReset && now > usage.periodEnd) {
		await ctx.db.patch(usage._id, {
			periodStart: now,
			periodEnd: now + DAY_MS,
			subscriptionMessagesUsed: 0,
		});
		usage.subscriptionMessagesUsed = 0;
		usage.periodStart = now;
		usage.periodEnd = now + DAY_MS;
	}

	if (usage.subscriptionMessagesUsed < planConfig.messagesPerMonth) {
		await ctx.db.patch(usage._id, {
			subscriptionMessagesUsed: usage.subscriptionMessagesUsed + 1,
		});
		return { allowed: true };
	}

	if (usage.purchasedCredits > 0) {
		await ctx.db.patch(usage._id, {
			purchasedCredits: usage.purchasedCredits - 1,
		});
		return { allowed: true };
	}

	if (plan === "FREE") {
		return {
			allowed: false,
			reason:
				"You've used all your free messages for today. Upgrade to Pro for 1,500 messages per month.",
		};
	}

	return {
		allowed: false,
		reason:
			"You've used all your messages this month. Purchase additional credits or wait for your billing cycle to reset.",
	};
}

export async function getUsageStatus(ctx: QueryCtx, userId: string) {
	const plan = await getUserPlan(ctx, userId);
	const planConfig = getPlanConfig(plan);
	const usage = await getOrCreateUsage(ctx, userId);
	const now = Date.now();

	if (!usage) {
		return {
			plan,
			subscriptionMessagesUsed: 0,
			subscriptionMessagesLimit: planConfig.messagesPerMonth,
			purchasedCredits: 0,
			periodEnd: now + DAY_MS,
			dailyReset: planConfig.dailyReset,
		};
	}

	let effectiveUsed = usage.subscriptionMessagesUsed;
	let effectivePeriodEnd = usage.periodEnd;

	if (plan === "FREE" && planConfig.dailyReset && now > usage.periodEnd) {
		effectiveUsed = 0;
		effectivePeriodEnd = now + DAY_MS;
	}

	return {
		plan,
		subscriptionMessagesUsed: effectiveUsed,
		subscriptionMessagesLimit: planConfig.messagesPerMonth,
		purchasedCredits: usage.purchasedCredits,
		periodEnd: effectivePeriodEnd,
		dailyReset: planConfig.dailyReset,
	};
}

export const resetUsageForSubscription = internalMutation({
	args: {
		userId: v.string(),
		periodStart: v.number(),
		periodEnd: v.number(),
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query("userMessageUsage")
			.withIndex("by_userId", (q) => q.eq("userId", args.userId))
			.first();

		if (existing) {
			await ctx.db.patch(existing._id, {
				periodStart: args.periodStart * 1000,
				periodEnd: args.periodEnd * 1000,
				subscriptionMessagesUsed: 0,
			});
		} else {
			await ctx.db.insert("userMessageUsage", {
				userId: args.userId,
				periodStart: args.periodStart * 1000,
				periodEnd: args.periodEnd * 1000,
				subscriptionMessagesUsed: 0,
				purchasedCredits: 0,
			});
		}
	},
});

export const getMessageUsageStatus = anonOrAuthenticatedQuery({
	args: {},
	handler: async (ctx, args) => {
		const user = await authComponent.getAuthUser(ctx);
		const isAnonymous = user?.isAnonymous ?? false;

		if (isAnonymous) {
			return {
				plan: "FREE" as const,
				subscriptionMessagesUsed: 0,
				subscriptionMessagesLimit: USER_PLANS.FREE.messagesPerMonth,
				purchasedCredits: 0,
				periodEnd: Date.now() + DAY_MS,
				dailyReset: true,
				isAnonymous: true,
			};
		}

		const status = await getUsageStatus(ctx, args.userId);
		return {
			...status,
			isAnonymous: false,
		};
	},
});

export const consumeMessage = anonOrAuthenticatedMutation({
	args: {},
	handler: async (ctx, args) => {
		const user = await authComponent.getAuthUser(ctx);
		const isAnonymous = user?.isAnonymous ?? false;

		if (isAnonymous) {
			return { allowed: true };
		}

		return checkAndConsumeMessage(ctx, args.userId);
	},
});
