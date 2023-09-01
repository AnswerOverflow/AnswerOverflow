import {
	bitfieldToDict,
	dictToBitfield,
	mergeFlags,
} from '@answeroverflow/prisma-types';
import { serverSettingsFlags } from '../zod';
import type { Server } from '../schema';

export const bitfieldToServerFlags = (bitfield: number) =>
	bitfieldToDict(bitfield, serverSettingsFlags);

export function addFlagsToServer<T extends Server>(serverSettings: T) {
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
