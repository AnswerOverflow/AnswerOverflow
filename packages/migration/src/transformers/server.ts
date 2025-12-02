import type { Server } from "../db/schema";
import { decodeServerBitfield } from "../utils/bitfield";

export interface NewServer {
	discordId: string;
	name: string;
	icon?: string;
	description?: string;
	vanityInviteCode?: string;
	kickedTime?: number;
	approximateMemberCount: number;
}

export interface NewServerPreferences {
	serverId: string;
	stripeCustomerId?: string;
	stripeSubscriptionId?: string;
	plan: string;
	readTheRulesConsentEnabled?: boolean;
	considerAllMessagesPublicEnabled?: boolean;
	anonymizeMessagesEnabled?: boolean;
	customDomain?: string;
	subpath?: string;
}

export function transformServer(row: Server): {
	server: NewServer;
	serverPreferences: NewServerPreferences;
} {
	const flags = decodeServerBitfield(row.bitfield);

	return {
		server: {
			discordId: row.id,
			name: row.name,
			icon: row.icon ?? undefined,
			description: row.description ?? undefined,
			vanityInviteCode: row.vanityInviteCode ?? undefined,
			kickedTime: row.kickedTime?.getTime() ?? undefined,
			approximateMemberCount: row.approximateMemberCount,
		},
		serverPreferences: {
			serverId: row.id,
			stripeCustomerId: row.stripeCustomerId ?? undefined,
			stripeSubscriptionId: row.stripeSubscriptionId ?? undefined,
			plan: row.plan,
			readTheRulesConsentEnabled: flags.readTheRulesConsentEnabled || undefined,
			considerAllMessagesPublicEnabled:
				flags.considerAllMessagesPublicEnabled || undefined,
			anonymizeMessagesEnabled: flags.anonymizeMessagesEnabled || undefined,
			customDomain: row.customDomain ?? undefined,
			subpath: row.subpath ?? undefined,
		},
	};
}
