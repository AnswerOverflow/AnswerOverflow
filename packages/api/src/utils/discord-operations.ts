import { findDiscordOauthByUserId } from "@answeroverflow/db";
import { TRPCError } from "@trpc/server";

export async function getDiscordOauthThrowIfNotFound(userId: string) {
	const account = await findDiscordOauthByUserId(userId);
	if (!account?.access_token) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "You are not authorized with Discord"
		});
	}
	return account;
}
