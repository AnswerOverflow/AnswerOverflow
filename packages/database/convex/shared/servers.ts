import { getOneFrom } from "convex-helpers/server/relationships";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../client";
import type { ServerPreferences } from "../schema";

export const DEFAULT_SERVER_PREFERENCES = {
	plan: "FREE" as const,
	readTheRulesConsentEnabled: false,
	considerAllMessagesPublicEnabled: true,
	anonymizeMessagesEnabled: false,
};

type ServerWithMetadata = {
	hasBot: boolean;
	highestRole: "Owner" | "Administrator" | "Manage Guild";
};

export function sortServersByBotAndRole<T extends ServerWithMetadata>(
	servers: T[],
): T[] {
	return servers.sort((a, b) => {
		if (a.hasBot && !b.hasBot) return -1;
		if (!a.hasBot && b.hasBot) return 1;

		const roleOrder: Record<
			"Owner" | "Administrator" | "Manage Guild",
			number
		> = {
			Owner: 0,
			Administrator: 1,
			"Manage Guild": 2,
		};
		return roleOrder[a.highestRole] - roleOrder[b.highestRole];
	});
}

export function validateCustomDomain(domain: string | null): string | null {
	if (domain === null || domain === "") {
		return null;
	}

	if (domain.toLowerCase().endsWith(".answeroverflow.com")) {
		return "Domain cannot end with .answeroverflow.com. Please use a domain that you own";
	}

	const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
	if (!domainRegex.test(domain)) {
		return "Invalid domain format";
	}

	return null;
}

export async function validateCustomDomainUniqueness(
	ctx: QueryCtx | MutationCtx,
	customDomain: string | null | undefined,
	excludePreferencesId?: Id<"serverPreferences">,
): Promise<string | null> {
	if (!customDomain) {
		return null;
	}

	const existing = await getOneFrom(
		ctx.db,
		"serverPreferences",
		"by_customDomain",
		customDomain,
	);

	if (existing && existing._id !== excludePreferencesId) {
		return `Server with custom domain ${customDomain} already exists`;
	}

	return null;
}

export async function getServerByDiscordId(
	ctx: QueryCtx | MutationCtx,
	discordId: bigint,
) {
	const server = await getOneFrom(ctx.db, "servers", "by_discordId", discordId);
	if (!server || server.kickedTime) {
		return null;
	}

	return server;
}

export async function upsertServerPreferencesLogic(
	ctx: MutationCtx,
	serverId: bigint,
	preferences: Partial<Omit<ServerPreferences, "serverId">>,
) {
	const existing = await getOneFrom(
		ctx.db,
		"serverPreferences",
		"by_serverId",
		serverId,
	);

	if (existing) {
		await ctx.db.patch(existing._id, {
			...existing,
			...preferences,
			serverId,
		});
	} else {
		await ctx.db.insert("serverPreferences", {
			...DEFAULT_SERVER_PREFERENCES,
			...preferences,
			serverId,
		});
	}

	return serverId;
}
