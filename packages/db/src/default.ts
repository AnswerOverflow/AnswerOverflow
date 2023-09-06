import { addFlagsToChannel } from './zodSchemas/channelSchemas';
import { addFlagsToServer } from './utils/serverUtils';
import { addFlagsToUserServerSettings } from './utils/userServerSettingsUtils';
import {
	Channel,
	DiscordAccount,
	Server,
	User,
	UserServerSettings,
} from './schema';

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
	return {
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
	return {
		bitfield: 0,
		inviteCode: null,
		archivedTimestamp: null,
		solutionTagId: null,
		...override,
	};
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
	return {
		avatar: null,
		...override,
	};
}

export function getDefaultUserServerSettings(
	override: Partial<UserServerSettings> & { userId: string; serverId: string },
): UserServerSettings {
	return {
		bitfield: 0,
		...override,
	};
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
