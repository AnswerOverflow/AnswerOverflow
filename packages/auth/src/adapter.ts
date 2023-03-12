import { prisma, upsertDiscordAccount } from "@answeroverflow/db";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { getDiscordUser } from "@answeroverflow/cache";
import type { Adapter, AdapterAccount } from "next-auth/adapters";

export const extendedAdapter: Adapter = {
	...PrismaAdapter(prisma),
	async linkAccount(account) {
		if (account.provider !== "discord") {
			throw Error("Unknown account provider");
		}
		if (!account.access_token) {
			throw Error("No access token");
		}
		const user = await getDiscordUser(account.access_token);
		await upsertDiscordAccount({
			id: user.id,
			name: user.username,
			avatar: user.avatar
		});
		return PrismaAdapter(prisma).linkAccount(account) as unknown as AdapterAccount;
	}
};
