import type { QueryCtx } from "../client";

export type ResolvedServerContext = {
	discordId: string;
	name: string;
	hasBot: boolean;
	iconUrl?: string;
};

export async function resolveServerContext(
	ctx: QueryCtx,
	serverDiscordId: string | undefined,
): Promise<ResolvedServerContext | null> {
	if (!serverDiscordId) {
		return null;
	}

	const server = await ctx.db
		.query("servers")
		.withIndex("by_discordId", (q) =>
			q.eq("discordId", BigInt(serverDiscordId)),
		)
		.first();

	if (server) {
		return {
			discordId: serverDiscordId,
			name: server.name,
			hasBot: true,
			iconUrl: server.icon
				? `https://cdn.discordapp.com/icons/${serverDiscordId}/${server.icon}.png`
				: undefined,
		};
	}

	return {
		discordId: serverDiscordId,
		name: "Unknown Server",
		hasBot: false,
	};
}
