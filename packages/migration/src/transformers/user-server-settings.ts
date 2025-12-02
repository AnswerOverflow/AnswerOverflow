import type { UserServerSettings } from "../db/schema";
import { decodeUserServerSettingsBitfield } from "../utils/bitfield";

export interface NewUserServerSettings {
	serverId: string;
	userId: string;
	permissions: number;
	canPubliclyDisplayMessages: boolean;
	messageIndexingDisabled: boolean;
	apiKey?: string;
	apiCallsUsed: number;
}

export function transformUserServerSettings(
	row: UserServerSettings,
): NewUserServerSettings {
	const flags = decodeUserServerSettingsBitfield(row.bitfield);

	return {
		serverId: row.serverId,
		userId: row.userId,
		permissions: 0,
		canPubliclyDisplayMessages: flags.canPubliclyDisplayMessages,
		messageIndexingDisabled: flags.messageIndexingDisabled,
		apiKey: row.apiKey ?? undefined,
		apiCallsUsed: row.apiCallsUsed,
	};
}
