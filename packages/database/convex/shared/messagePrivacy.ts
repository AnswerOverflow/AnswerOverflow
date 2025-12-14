import type { Id } from "../_generated/dataModel";
import type { Message, ServerPreferences, UserServerSettings } from "../schema";

export type UserServer = {
	id: Id<"servers">;
	owner: boolean;
	permissions: number;
};

export function isMessagePublic(
	serverPreferences: ServerPreferences | null,
	userServerSettings: UserServerSettings | null,
	serverId: bigint,
): boolean {
	const areAllServerMessagesPublic = Boolean(
		serverPreferences?.considerAllMessagesPublicEnabled,
	);
	const hasUserGrantedConsent = Boolean(
		userServerSettings?.canPubliclyDisplayMessages &&
			userServerSettings?.serverId === serverId,
	);
	return areAllServerMessagesPublic || hasUserGrantedConsent;
}

export function shouldAnonymizeMessage(
	serverPreferences: ServerPreferences | null,
	userServerSettings: UserServerSettings | null,
	serverId: bigint,
): boolean {
	const anonymizeEnabled = serverPreferences?.anonymizeMessagesEnabled ?? false;
	const hasUserGrantedConsent =
		userServerSettings?.canPubliclyDisplayMessages &&
		userServerSettings?.serverId === serverId;
	return anonymizeEnabled && !hasUserGrantedConsent;
}

export type MessageWithPrivacyFlags = Message & {
	public: boolean;
	isAnonymous: boolean;
};
