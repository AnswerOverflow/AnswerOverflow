import { Message, getDefaultMessage } from "@answeroverflow/elastic-types";
import {
	type DiscordAccount,
	getDefaultDiscordAccount,
	type Server,
	type Channel,
	getDefaultServer,
	getDefaultChannel,
	getDefaultUserServerSettings,
	UserServerSettings,
	UserServerSettingsWithFlags,
	addFlagsToUserServerSettings,
	ChannelWithFlags,
	addFlagsToChannel,
	dictToBitfield,
	channelBitfieldFlags,
	userServerSettingsFlags,
	addFlagsToServer,
	serverSettingsFlags,
	ServerWithFlags
} from "@answeroverflow/prisma-types";
import { getRandomId, getRandomSentence } from "@answeroverflow/utils";
import { ChannelType } from "discord-api-types/v10";
import type { PartialDeep } from "type-fest";
export function mockDiscordAccount(override: Partial<DiscordAccount> = {}) {
	const account = getDefaultDiscordAccount({
		id: getRandomId(),
		name: `U-${getRandomId().slice(0, 10)}`,
		...override
	});
	return account;
}

export function mockMessage(
	server: Server,
	channel: Channel,
	author: DiscordAccount,
	override: Omit<Partial<Message>, "authorId" | "channelId" | "serverId"> = {}
) {
	return getDefaultMessage({
		id: getRandomId(),
		authorId: author.id,
		channelId: channel.id,
		serverId: server.id,
		content: getRandomSentence(),
		...override
	});
}

export function mockServer(override: Partial<Server> = {}) {
	return getDefaultServer({
		id: getRandomId(),
		name: "test-server",
		icon: "ASDASDASDASDsd",
		...override
	});
}

export function mockServerWithFlags(override: Omit<PartialDeep<ServerWithFlags>, "bitfield"> = {}) {
	const base = addFlagsToServer(mockServer(override));
	const { flags, ...rest } = override;
	const data = {
		...base,
		flags: {
			...base.flags,
			...flags
		},
		...rest
	};
	data.bitfield = dictToBitfield(data.flags, serverSettingsFlags);
	return data;
}

export function mockChannel(server: Server, override?: Omit<Partial<Channel>, "serverId">) {
	return getDefaultChannel({
		id: getRandomId(),
		name: "test-channel",
		serverId: server.id ?? getRandomId(),
		type: ChannelType.GuildText,
		parentId: null,
		...override
	});
}

export function mockChannelWithFlags(
	server: Server,
	override: Omit<PartialDeep<ChannelWithFlags>, "serverId" | "bitfield"> = {}
): ChannelWithFlags {
	const base = addFlagsToChannel(mockChannel(server));
	const { flags, ...rest } = override;
	const data = {
		...base,
		flags: {
			...base.flags,
			...flags
		},
		...rest
	};
	data.bitfield = dictToBitfield(data.flags, channelBitfieldFlags);
	return data;
}

export function mockThread(
	parent: Channel,
	override?: Omit<Partial<Channel>, "parentId" | "serverId">
) {
	return getDefaultChannel({
		id: getRandomId(),
		name: "test-thread",
		serverId: parent.serverId,
		type: ChannelType.PublicThread,
		parentId: parent.id,
		...override
	});
}

export function mockUserServerSettings(override: Partial<UserServerSettings> = {}) {
	return {
		...getDefaultUserServerSettings({
			serverId: getRandomId(),
			userId: getRandomId()
		}),
		...override
	};
}

export function mockUserServerSettingsWithFlags(
	override: Omit<PartialDeep<UserServerSettingsWithFlags>, "bitfield"> = {}
): UserServerSettingsWithFlags {
	const base = addFlagsToUserServerSettings(mockUserServerSettings());
	const { flags, ...rest } = override;
	const data = {
		...base,
		flags: {
			...base.flags,
			...flags
		},
		...rest
	};
	data.bitfield = dictToBitfield(data.flags, userServerSettingsFlags);
	return data;
}
