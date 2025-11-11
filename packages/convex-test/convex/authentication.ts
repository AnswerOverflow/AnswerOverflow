import { api } from "./_generated/api";
import { action, mutation, query } from "./_generated/server";

export const actionCallingQuery = action({
  args: {},
  async handler(ctx): Promise<string | null> {
    return await ctx.runQuery(api.authentication.getName);
  },
});

export const getName = query({
  args: {},
  async handler(ctx) {
    return (await ctx.auth.getUserIdentity())?.name;
  },
});

export const actionCallingMutation = action({
  args: {},
  async handler(ctx): Promise<string | null> {
    return await ctx.runQuery(api.authentication.getName);
  },
});

export const writeName = mutation({
  args: {},
  async handler(ctx) {
    return (await ctx.auth.getUserIdentity())?.name;
  },
});

export const actionCallingAction = action({
  args: {},
  async handler(ctx): Promise<string | null> {
    return await ctx.runAction(api.authentication.actionCallingQuery);
  },
});
