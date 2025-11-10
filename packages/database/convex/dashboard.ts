"use node";

import { createClerkClient } from "@clerk/backend";
import { action } from "./_generated/server";
import { v } from "convex/values";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

export const getForCurrentUser = action({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null || identity.email === undefined) {
      throw new Error("Not authenticated");
    }
    const userList = await clerkClient.users.getUserList({
      emailAddress: [identity.email],
    });
    if (userList.totalCount > 1) {
      throw new Error("Multiple users found for email");
    }
    const user = userList.data[0];
    if (!user) {
      throw new Error("User not found");
    }
    const response = await clerkClient.users.getUserOauthAccessToken(
      user.id,
      "discord"
    );

    const token = response.data.at(0)?.token;

    if (!token) {
      throw new Error("Discord token not found");
    }

    // TODO: Implement Discord API call
    const result = { token };
    console.log("result", result);
    return JSON.stringify(result);
  },
});
