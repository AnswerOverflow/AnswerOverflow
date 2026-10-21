import { v } from "convex/values";
import { getOneFrom } from "convex-helpers/server/relationships";
import { type MutationCtx, privateMutation } from "../client";

// A lease on the production Discord gateway session.
//
// Invariant: at any server time `now`, at most one holder has a lease row with
// `expiresAt > now`, and only that holder can extend it. A holder learns it
// still owns the lease only from a successful acquire or renew, and stops
// acting before `expiresAt` by its own clock (see apps/discord-bot
// gateway-lease.ts). `token` increases on every change of holder, so a stale
// holder's renew or release can never touch its successor's lease.

const MIN_TTL_MS = 5_000;
const MAX_TTL_MS = 300_000;

const assertTtl = (ttlMs: number) => {
	if (!Number.isInteger(ttlMs) || ttlMs < MIN_TTL_MS || ttlMs > MAX_TTL_MS) {
		throw new Error(
			`ttlMs must be an integer between ${MIN_TTL_MS} and ${MAX_TTL_MS}`,
		);
	}
};

const getLease = (ctx: MutationCtx, name: string) =>
	getOneFrom(ctx.db, "gatewayLeases", "by_name", name, "name");

export const acquireGatewayLease = privateMutation({
	args: {
		name: v.string(),
		holderId: v.string(),
		ttlMs: v.number(),
	},
	handler: async (ctx, args) => {
		assertTtl(args.ttlMs);
		const now = Date.now();
		const expiresAt = now + args.ttlMs;
		const lease = await getLease(ctx, args.name);

		if (!lease) {
			await ctx.db.insert("gatewayLeases", {
				name: args.name,
				holderId: args.holderId,
				token: 1,
				expiresAt,
			});
			return { acquired: true as const, token: 1, expiresAt };
		}

		if (lease.holderId === args.holderId && lease.expiresAt > now) {
			await ctx.db.patch(lease._id, { expiresAt });
			return { acquired: true as const, token: lease.token, expiresAt };
		}

		if (lease.expiresAt > now) {
			return {
				acquired: false as const,
				holderId: lease.holderId,
				expiresAt: lease.expiresAt,
			};
		}

		const token = lease.token + 1;
		await ctx.db.patch(lease._id, {
			holderId: args.holderId,
			token,
			expiresAt,
		});
		return { acquired: true as const, token, expiresAt };
	},
});

export const renewGatewayLease = privateMutation({
	args: {
		name: v.string(),
		holderId: v.string(),
		token: v.number(),
		ttlMs: v.number(),
	},
	handler: async (ctx, args) => {
		assertTtl(args.ttlMs);
		const now = Date.now();
		const lease = await getLease(ctx, args.name);

		if (
			!lease ||
			lease.holderId !== args.holderId ||
			lease.token !== args.token ||
			lease.expiresAt <= now
		) {
			return { renewed: false as const };
		}

		const expiresAt = now + args.ttlMs;
		await ctx.db.patch(lease._id, { expiresAt });
		return { renewed: true as const, expiresAt };
	},
});

export const releaseGatewayLease = privateMutation({
	args: {
		name: v.string(),
		holderId: v.string(),
		token: v.number(),
	},
	handler: async (ctx, args) => {
		const now = Date.now();
		const lease = await getLease(ctx, args.name);

		if (
			!lease ||
			lease.holderId !== args.holderId ||
			lease.token !== args.token ||
			lease.expiresAt <= now
		) {
			return { released: false as const };
		}

		await ctx.db.patch(lease._id, { expiresAt: now });
		return { released: true as const };
	},
});
