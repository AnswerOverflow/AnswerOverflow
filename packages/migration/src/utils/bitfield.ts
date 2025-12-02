export interface ServerBitfieldFlags {
	readTheRulesConsentEnabled: boolean;
	considerAllMessagesPublicEnabled: boolean;
	anonymizeMessagesEnabled: boolean;
}

export interface ChannelBitfieldFlags {
	indexingEnabled: boolean;
	markSolutionEnabled: boolean;
	sendMarkSolutionInstructionsInNewThreads: boolean;
	autoThreadEnabled: boolean;
	forumGuidelinesConsentEnabled: boolean;
}

export interface UserServerSettingsBitfieldFlags {
	canPubliclyDisplayMessages: boolean;
	messageIndexingDisabled: boolean;
}

export function decodeServerBitfield(bitfield: number): ServerBitfieldFlags {
	return {
		readTheRulesConsentEnabled: (bitfield & 1) !== 0,
		considerAllMessagesPublicEnabled: (bitfield & 2) !== 0,
		anonymizeMessagesEnabled: (bitfield & 4) !== 0,
	};
}

export function decodeChannelBitfield(bitfield: number): ChannelBitfieldFlags {
	return {
		indexingEnabled: (bitfield & 1) !== 0,
		markSolutionEnabled: (bitfield & 2) !== 0,
		sendMarkSolutionInstructionsInNewThreads: (bitfield & 4) !== 0,
		autoThreadEnabled: (bitfield & 8) !== 0,
		forumGuidelinesConsentEnabled: (bitfield & 16) !== 0,
	};
}

export function decodeUserServerSettingsBitfield(
	bitfield: number,
): UserServerSettingsBitfieldFlags {
	return {
		canPubliclyDisplayMessages: (bitfield & 1) !== 0,
		messageIndexingDisabled: (bitfield & 2) !== 0,
	};
}
