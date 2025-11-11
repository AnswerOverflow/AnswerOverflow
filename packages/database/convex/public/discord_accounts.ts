import { type Infer, v } from "convex/values";
import { query } from "../_generated/server";
import type { discordAccountSchema } from "../schema";

type DiscordAccount = Infer<typeof discordAccountSchema>;

export const findManyDiscordAccountsById = query({
	args: {
		ids: v.array(v.string()),
	},
	handler: async (ctx, args) => {
		if (args.ids.length === 0) return [];

		const accounts: DiscordAccount[] = [];
		for (const id of args.ids) {
			const account = await ctx.db
				.query("discordAccounts")
				.filter((q) => q.eq(q.field("id"), id))
				.first();
			if (account) {
				accounts.push(account);
			}
		}
		return accounts;
	},
});
