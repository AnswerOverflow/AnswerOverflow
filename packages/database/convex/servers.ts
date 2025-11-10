import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { serverSchema } from "./schema";

export const publicGetAllServers = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("servers"),
      _creationTime: v.number(),
      discordId: v.string(),
      name: v.string(),
      icon: v.optional(v.string()),
      description: v.optional(v.string()),
      vanityInviteCode: v.optional(v.string()),
      kickedTime: v.optional(v.number()),
      vanityUrl: v.optional(v.string()),
      stripeCustomerId: v.optional(v.string()),
      stripeSubscriptionId: v.optional(v.string()),
      plan: v.union(
        v.literal("FREE"),
        v.literal("STARTER"),
        v.literal("ADVANCED"),
        v.literal("PRO"),
        v.literal("ENTERPRISE"),
        v.literal("OPEN_SOURCE")
      ),
      approximateMemberCount: v.number(),
      preferencesId: v.optional(v.id("serverPreferences")),
    })
  ),
  handler: async (ctx) => {
    return await ctx.db.query("servers").collect();
  },
});

export const publicGetServerByDiscordId = query({
  args: {
    discordId: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("servers"),
      _creationTime: v.number(),
      discordId: v.string(),
      name: v.string(),
      icon: v.optional(v.string()),
      description: v.optional(v.string()),
      vanityInviteCode: v.optional(v.string()),
      kickedTime: v.optional(v.number()),
      vanityUrl: v.optional(v.string()),
      stripeCustomerId: v.optional(v.string()),
      stripeSubscriptionId: v.optional(v.string()),
      plan: v.union(
        v.literal("FREE"),
        v.literal("STARTER"),
        v.literal("ADVANCED"),
        v.literal("PRO"),
        v.literal("ENTERPRISE"),
        v.literal("OPEN_SOURCE")
      ),
      approximateMemberCount: v.number(),
      preferencesId: v.optional(v.id("serverPreferences")),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("servers")
      .filter((q) => q.eq(q.field("discordId"), args.discordId))
      .first();
  },
});

export const upsertServerExternal = mutation({
  args: {
    apiKey: v.string(),
    data: serverSchema,
  },
  returns: v.id("servers"),
  handler: async (ctx, { apiKey, data }) => {
    const configuredSecret = "hello";
    if (!configuredSecret || apiKey !== configuredSecret) {
      throw new Error("Unauthorized");
    }

    const existing = await ctx.db
      .query("servers")
      .filter((q) => q.eq(q.field("discordId"), data.discordId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, data);
      return existing._id;
    }
    return await ctx.db.insert("servers", data);
  },
});
