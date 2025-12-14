import type { Channel } from "../db/schema";
import { decodeChannelBitfield } from "../utils/bitfield";

export interface NewChannel {
	id: string;
	serverId: string;
	name: string;
	type: number;
	parentId?: string;
	archivedTimestamp?: number;
}

export interface NewChannelSettings {
	channelId: string;
	indexingEnabled: boolean;
	markSolutionEnabled: boolean;
	sendMarkSolutionInstructionsInNewThreads: boolean;
	autoThreadEnabled: boolean;
	forumGuidelinesConsentEnabled: boolean;
	solutionTagId?: string;
	lastIndexedSnowflake?: string;
	inviteCode?: string;
}

export function transformChannel(row: Channel): {
	channel: NewChannel;
	channelSettings: NewChannelSettings;
} {
	const flags = decodeChannelBitfield(row.bitfield);

	return {
		channel: {
			id: row.id,
			serverId: row.serverId,
			name: row.name,
			type: row.type,
			parentId: row.parentId ?? undefined,
			archivedTimestamp: row.archivedTimestamp
				? Number(row.archivedTimestamp)
				: undefined,
		},
		channelSettings: {
			channelId: row.id,
			indexingEnabled: flags.indexingEnabled,
			markSolutionEnabled: flags.markSolutionEnabled,
			sendMarkSolutionInstructionsInNewThreads:
				flags.sendMarkSolutionInstructionsInNewThreads,
			autoThreadEnabled: flags.autoThreadEnabled,
			forumGuidelinesConsentEnabled: flags.forumGuidelinesConsentEnabled,
			solutionTagId: row.solutionTagId ?? undefined,
			lastIndexedSnowflake: row.lastIndexedSnowflake ?? undefined,
			inviteCode: row.inviteCode ?? undefined,
		},
	};
}
