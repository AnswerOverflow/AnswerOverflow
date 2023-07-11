import type {
	Channel,
	DiscordAccount,
	Server,
	User,
	UserServerSettings,
} from '@prisma/client';
import { addFlagsToChannel } from './channel-schema';
import { addFlagsToServer } from './server-schema';
import { addFlagsToUserServerSettings } from './user-server-settings-schema';
export function getDefaultUser(
	override: Partial<User> & {
		id: string;
	},
): User {
	return {
		email: null,
		emailVerified: null,
		image: null,
		name: null,
		...override,
	};
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
		...override,
	};
	return data;
}

export function getDefaultServerWithFlags(
	override: Partial<Server> & Pick<Server, 'id' | 'name'>,
) {
	return addFlagsToServer(getDefaultServer(override));
}

export function getDefaultChannel(
	override: Partial<Channel> &
		Pick<Channel, 'id' | 'name' | 'serverId' | 'parentId' | 'type'>,
): Channel {
	const data: Channel = {
		bitfield: 0,
		inviteCode: null,
		archivedTimestamp: null,
		solutionTagId: null,
		...override,
	};
	return data;
}

export function getDefaultChannelWithFlags(
	override: Partial<Channel> &
		Pick<Channel, 'id' | 'serverId' | 'type' | 'parentId' | 'name'>,
) {
	return addFlagsToChannel(getDefaultChannel(override));
}

export function getDefaultDiscordAccount(
	override: Partial<DiscordAccount> & { id: string; name: string },
): DiscordAccount {
	const data: DiscordAccount = {
		avatar: null,
		...override,
	};
	return data;
}

export function getDefaultUserServerSettings(
	override: Partial<UserServerSettings> & { userId: string; serverId: string },
): UserServerSettings {
	const data: UserServerSettings = {
		bitfield: 0,
		...override,
	};
	return data;
}

export type UserServerSettingsWithFlags = Awaited<
	ReturnType<typeof addFlagsToUserServerSettings>
>;

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
