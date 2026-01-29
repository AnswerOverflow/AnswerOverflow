import { v } from "convex/values";
import { DateTime, Duration } from "effect";
import { components } from "../_generated/api";
import {
	anonOrAuthenticatedMutation,
	anonOrAuthenticatedQuery,
	internalMutation,
	type MutationCtx,
	type QueryCtx,
} from "../client";
import { authComponent } from "../shared/betterAuth";
import { getPlanConfig, type UserPlanType } from "../shared/userPlans";

const ONE_DAY = Duration.decode("1 day");

function nowMillis(): number {
	return DateTime.unsafeMake(Date.now()).epochMillis;
}

function addOneDay(timestamp: number): number {
	const dt = DateTime.unsafeMake(timestamp);
	const future = DateTime.addDuration(dt, ONE_DAY);
	return future.epochMillis;
}

function isPeriodExpired(periodEnd: number): boolean {
	const now = DateTime.unsafeMake(Date.now());
	const end = DateTime.unsafeMake(periodEnd);
	return DateTime.greaterThan(now, end);
}

function stripeSecondsToMillis(seconds: number): number {
	return DateTime.unsafeMake(seconds * 1000).epochMillis;
}

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

	const now = nowMillis();
	const id = await ctx.db.insert("userMessageUsage", {
		userId,
		periodStart: now,
		periodEnd: addOneDay(now),
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
	const now = nowMillis();

	if (
		plan === "FREE" &&
		planConfig.dailyReset &&
		isPeriodExpired(usage.periodEnd)
	) {
		const newPeriodEnd = addOneDay(now);
		await ctx.db.patch(usage._id, {
			periodStart: now,
			periodEnd: newPeriodEnd,
			subscriptionMessagesUsed: 0,
		});
		usage.subscriptionMessagesUsed = 0;
		usage.periodStart = now;
		usage.periodEnd = newPeriodEnd;
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
	const now = nowMillis();

	if (!usage) {
		return {
			plan,
			subscriptionMessagesUsed: 0,
			subscriptionMessagesLimit: planConfig.messagesPerMonth,
			purchasedCredits: 0,
			periodEnd: addOneDay(now),
			dailyReset: planConfig.dailyReset,
		};
	}

	let effectiveUsed = usage.subscriptionMessagesUsed;
	let effectivePeriodEnd = usage.periodEnd;

	if (
		plan === "FREE" &&
		planConfig.dailyReset &&
		isPeriodExpired(usage.periodEnd)
	) {
		effectiveUsed = 0;
		effectivePeriodEnd = addOneDay(now);
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

		const periodStartMillis = stripeSecondsToMillis(args.periodStart);
		const periodEndMillis = stripeSecondsToMillis(args.periodEnd);

		if (existing) {
			if (existing.periodStart >= periodStartMillis) {
				return;
			}
			await ctx.db.patch(existing._id, {
				periodStart: periodStartMillis,
				periodEnd: periodEndMillis,
				subscriptionMessagesUsed: 0,
			});
		} else {
			await ctx.db.insert("userMessageUsage", {
				userId: args.userId,
				periodStart: periodStartMillis,
				periodEnd: periodEndMillis,
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

		const status = await getUsageStatus(ctx, args.userId);
		const remaining =
			Math.max(
				0,
				status.subscriptionMessagesLimit - status.subscriptionMessagesUsed,
			) + status.purchasedCredits;

		return {
			...status,
			remaining,
			isAnonymous,
		};
	},
});

export const consumeMessage = anonOrAuthenticatedMutation({
	args: {},
	handler: async (ctx, args) => {
		return checkAndConsumeMessage(ctx, args.userId);
	},
});
