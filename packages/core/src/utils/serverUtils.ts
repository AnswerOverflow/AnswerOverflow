import { getRandomId } from '@answeroverflow/utils/id';
import type { Server, User, UserServerSettings } from '../schema';
import { serverSettingsFlags } from '../zodSchemas/serverSchemas';
import { bitfieldToDict, dictToBitfield, mergeFlags } from './bitfieldUtils';
import { addFlagsToUserServerSettings } from './userServerSettingsUtils';

export const bitfieldToServerFlags = (bitfield: number) =>
	bitfieldToDict(bitfield, serverSettingsFlags);

export function addFlagsToServer<T extends Pick<Server, 'bitfield'>>(
	serverSettings: T,
) {
	return {
		...serverSettings,
		flags: bitfieldToServerFlags(serverSettings.bitfield),
	};
}

export function getDefaultServerWithFlags(
	override: Partial<Server> & { id: string; name: string },
) {
	return addFlagsToServer(getDefaultServer(override));
}

export function getDefaultServer(
	override: Partial<Server> & { id: string; name: string },
): Server {
	const data: Server = {
		icon: null,
		kickedTime: null,
		bitfield: 0,
		description: null,
		vanityUrl: null,
		customDomain: null,
		stripeCustomerId: null,
		stripeSubscriptionId: null,
		plan: 'FREE',
		vanityInviteCode: null,
		approximateMemberCount: 0,
		...override,
	};
	return data;
}

export function mergeServerFlags(
	old: number,
	newFlags: Record<string, boolean>,
) {
	return mergeFlags(
		() => bitfieldToServerFlags(old),
		newFlags,
		(flags) => dictToBitfield(flags, serverSettingsFlags),
	);
}

// TODO: sort to separate files
export function getDefaultUser(
	override: Partial<User> & {
		id: string;
	},
): User {
	return {
		email: `test+${getRandomId()}@test.com`,
		emailVerified: null,
		image: null,
		name: null,
		...override,
	};
}

export function getDefaultUserServerSettings(
	override: Partial<UserServerSettings> & { userId: string; serverId: string },
): UserServerSettings {
	const data: UserServerSettings = {
		bitfield: 0,
		apiCallsUsed: 0,
		apiKey: null,
		...override,
	};
	return data;
}

export function getDefaultUserServerSettingsWithFlags({
	userId,
	serverId,
}: {
	userId: string;
	serverId: string;
}) {
	return addFlagsToUserServerSettings(
		getDefaultUserServerSettings({ userId, serverId }),
	);
}
