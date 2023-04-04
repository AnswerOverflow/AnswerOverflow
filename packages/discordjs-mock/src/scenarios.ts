import { Client, Guild, PermissionFlagsBits } from 'discord.js';
import { mockGuild } from './guild-mock';
import { mockGuildMember } from './user-mock';

export type GuildMemberVariants = Awaited<
	ReturnType<typeof createGuildMemberVariants>
>;

export async function createGuildMemberVariants(
	client: Client,
	guild: Guild | undefined = undefined,
) {
	if (!guild) guild = mockGuild(client);
	const guildMemberOwner = await guild.members.fetch(guild.ownerId);
	const guildMemberDefault = mockGuildMember({ client, guild });
	const pendingGuildMemberDefault = mockGuildMember({
		client,
		guild,
		data: {
			pending: true,
		},
	});
	const guildMemberManageGuild = mockGuildMember({
		client,
		guild,
		permissions: PermissionFlagsBits.ManageGuild,
	});
	const guildMemberAdmin = mockGuildMember({
		client,
		guild,
		permissions: PermissionFlagsBits.Administrator,
	});

	return {
		guildMemberOwner,
		guildMemberDefault,
		pendingGuildMemberDefault,
		guildMemberManageGuild,
		guildMemberAdmin,
	};
}
