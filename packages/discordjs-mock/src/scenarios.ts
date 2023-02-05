import { Client, Guild, PermissionFlagsBits } from "discord.js";
import { mockGuild } from "./guild-mock";
import { mockGuildMember } from "./user-mock";

export type GuildMemberVariants = Awaited<ReturnType<typeof createGuildMemberVariants>>;

export async function createGuildMemberVariants(
  client: Client,
  guild: Guild | undefined = undefined
) {
  if (!guild) guild = mockGuild(client);
  const guild_member_owner = await guild.members.fetch(guild.ownerId);
  const guild_member_default = mockGuildMember({ client, guild });
  const pending_guild_member_default = mockGuildMember({
    client,
    guild,
    data: {
      pending: true,
    },
  });
  const guild_member_manage_guild = mockGuildMember({
    client,
    guild,
    permissions: PermissionFlagsBits.ManageGuild,
  });
  const guild_member_admin = mockGuildMember({
    client,
    guild,
    permissions: PermissionFlagsBits.Administrator,
  });

  return {
    guild_member_owner,
    guild_member_default,
    pending_guild_member_default,
    guild_member_manage_guild,
    guild_member_admin,
  };
}
