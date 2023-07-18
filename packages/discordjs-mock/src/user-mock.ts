import {
	Client,
	ClientUser,
	Guild,
	GuildMember,
	type PermissionResolvable,
	PermissionsBitField,
	User,
	type APIGuildMember,
	GuildMemberFlags,
} from 'discord.js';
import type { RawUserData } from 'discord.js/typings/rawDataTypes';
import { randomSnowflake } from '@answeroverflow/discordjs-utils';
import { mockGuild, mockRole } from './guild-mock';

export function mockUser(client: Client, data: Partial<RawUserData> = {}) {
	const rawData: RawUserData = {
		id: randomSnowflake().toString(),
		username: 'USERNAME',
		discriminator: 'user#0000',
		avatar: 'user avatar url',
		bot: false,
		...data,
	};
	const user = Reflect.construct(User, [client, rawData]) as User;
	client.users.cache.set(user.id, user);
	return user;
}

export function mockClientUser(
	client: Client,
	override: Partial<RawUserData> = {},
) {
	const rawData: RawUserData = {
		id: process.env.DISCORD_CLIENT_ID ?? randomSnowflake().toString(),
		username: 'test',
		discriminator: '0000',
		avatar: null,
		bot: false,
		...override,
	};
	const clientUser = Reflect.construct(ClientUser, [
		client,
		rawData,
	]) as ClientUser;
	client.user = clientUser;
	client.user.id = rawData.id;
	return clientUser;
}

export function mockGuildMember(input: {
	client: Client;
	user?: User;
	guild?: Guild;
	permissions?: PermissionResolvable;
	data?: Partial<APIGuildMember>;
}) {
	const {
		client,
		permissions = PermissionsBitField.Default,
		data = {},
	} = input;
	let { user, guild } = input;
	if (!user) {
		user = mockUser(client);
	}
	if (!guild) {
		guild = mockGuild(client, user); // By default make the guild owner the user
	}

	// Create a custom role that represents the permission the user has
	const role = mockRole(client, permissions, guild);

	const rawData: APIGuildMember = {
		roles: [role.id],
		deaf: false,
		user: {
			id: user.id,
			avatar: user.avatar,
			discriminator: user.discriminator,
			username: user.username,
			global_name: user.username,
		},
		joined_at: '33',
		mute: false,
		flags: GuildMemberFlags.CompletedOnboarding,
		...data,
	};

	const member = Reflect.construct(GuildMember, [
		client,
		rawData,
		guild,
	]) as GuildMember;
	guild.members.cache.set(member.id, member);
	return member;
}
