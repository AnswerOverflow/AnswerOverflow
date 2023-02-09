import {
  ChatInputCommandInteraction,
  InteractionType,
  APIChatInputApplicationCommandInteraction,
  ApplicationCommandType,
  GuildBasedChannel,
  Guild,
  GuildMember,
  PermissionsBitField,
  Client,
} from "discord.js";
import { randomSnowflake } from "@answeroverflow/discordjs-utils";
import { mockTextChannel } from "./channel-mock";
import { mockGuild } from "./guild-mock";
import { mockGuildMember } from "./user-mock";

export function mockInteracion(
  client: Client,
  name: string,
  id: string,
  guild?: Guild,
  channel?: GuildBasedChannel,
  member?: GuildMember
): ChatInputCommandInteraction {
  if (!guild) {
    guild = mockGuild(client);
  }
  if (!channel) {
    channel = mockTextChannel(client, guild);
  }
  if (!member) {
    member = mockGuildMember({ client, guild });
  }
  const rawData: APIChatInputApplicationCommandInteraction = {
    application_id: client.user?.id.toString() ?? randomSnowflake.toString(), // TODO: This probably should be an assert
    channel_id: channel.id,
    id, // TODO: Is this related to the command id?
    type: InteractionType.ApplicationCommand,
    token: "123456789",
    version: 1,
    app_permissions: PermissionsBitField.Default.toString(),
    locale: "en-US",
    guild_id: guild.id,
    member: {
      user: {
        id: member.id,
        username: member.user.username,
        discriminator: member.user.discriminator,
        avatar: member.user.avatar,
      },
      roles: member.roles.cache.map((role) => role.id),
      premium_since: null,
      permissions: member.permissions.bitfield.toString(),
      pending: false,
      nick: member.nickname,
      mute: false,
      joined_at: member.joinedAt?.toISOString() ?? new Date().toISOString(),
      deaf: false,
    },
    data: {
      id,
      name,
      type: ApplicationCommandType.ChatInput,
      guild_id: guild.id,
    },
  };
  // TODO: Look into adding command to client cache
  const command = Reflect.construct(ChatInputCommandInteraction, [
    client,
    rawData,
  ]) as ChatInputCommandInteraction;
  command.reply = jest.fn();
  return command;
}
