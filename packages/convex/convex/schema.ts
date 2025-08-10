import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

export const serverSchema = v.object({
	discordId: v.string(),
	name: v.string(),
	icon: v.optional(v.string()),
	description: v.optional(v.string()),
	vanityInviteCode: v.optional(v.string()),
	bitfield: v.number(),
	kickedTime: v.optional(v.number()),
	vanityUrl: v.optional(v.string()),
	customDomain: v.optional(v.string()),
	subpath: v.optional(v.string()),
	stripeCustomerId: v.optional(v.string()),
	stripeSubscriptionId: v.optional(v.string()),
	plan: v.union(
		v.literal("FREE"),
		v.literal("STARTER"),
		v.literal("ADVANCED"),
		v.literal("PRO"),
		v.literal("ENTERPRISE"),
		v.literal("OPEN_SOURCE"),
	),
	approximateMemberCount: v.number(),
});
export type Server = Infer<typeof serverSchema>;

export default defineSchema({
	servers: defineTable(serverSchema),
});
