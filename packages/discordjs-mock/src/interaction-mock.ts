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
  ButtonInteraction,
  ComponentType,
  Message,
  APIMessage,
  User,
  APIUser,
  Channel,
  APIChannel,
  ChannelType,
  APIGuildForumTag,
  GuildForumTag,
  APITextChannel,
  APIDMChannel,
  APIThreadChannel,
  APIChannelMention,
  InteractionResponse,
  Interaction,
  Snowflake,
  InteractionUpdateOptions,
  MessagePayload,
} from "discord.js";
import { randomSnowflake } from "@answeroverflow/discordjs-utils";
import { mockTextChannel } from "./channel-mock";
import { mockMessage } from "./message-mock";
import { mockGuild } from "./guild-mock";
import { mockGuildMember } from "./user-mock";
import type {
  RawMessageButtonInteractionData,
  RawMessageComponentInteractionData,
} from "discord.js/typings/rawDataTypes";

export function mockChatInputCommandInteraction(
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

export function userToAPIUser(user: User): APIUser {
  return {
    id: user.id,
    username: user.username,
    discriminator: user.discriminator,
    avatar: user.avatar,
    accent_color: user.accentColor,
    banner: user.banner,
    bot: user.bot,
    flags: user.flags?.bitfield,
    system: user.system,
  };
}

export function tagToAPIGuildForumTag(tag: GuildForumTag): APIGuildForumTag {
  return {
    emoji_id: tag.emoji?.id ?? null,
    emoji_name: tag.emoji?.name ?? null,
    id: tag.id,
    moderated: tag.moderated,
    name: tag.name,
  };
}

export function channelToAPIChannel(channel: Channel): APIChannel {
  if (channel.isDMBased() && channel.type !== ChannelType.GroupDM) {
    const data: APIDMChannel = {
      id: channel.id,
      type: channel.type,
      flags: channel.flags?.bitfield,
      last_message_id: channel.lastMessageId,
      name: channel.recipient?.username, // TODO: Fix
      recipients: [channel.client.user, channel.recipient].map((user) => userToAPIUser(user!)), // TODO: Is the bot a recipient?
    };
    return data;
  }
  if (channel.isThread()) {
    const data: APIThreadChannel = {
      applied_tags: channel.appliedTags,
      id: channel.id,
      position: 0,
      type: channel.type,
      flags: channel.flags?.bitfield,
      guild_id: channel.guild?.id,
      last_message_id: channel.lastMessageId,
      member_count: channel.memberCount ?? 0,
      message_count: channel.messageCount ?? 0,
      name: channel.name,
      parent_id: channel.parentId,
      nsfw: false,
      thread_metadata: {
        locked: channel.locked ?? false,
        create_timestamp: channel.createdAt?.toISOString(),
        archive_timestamp:
          channel.archivedAt?.toISOString() ??
          channel.createdAt?.toISOString() ??
          new Date().toISOString(),
        invitable: channel.invitable ?? false,
        auto_archive_duration: channel.autoArchiveDuration ?? 0,
        archived: channel.archived ?? false,
      },
      owner_id: channel.ownerId ?? undefined,
      total_message_sent: channel.totalMessageSent ?? 0,
      rate_limit_per_user: channel.rateLimitPerUser ?? 0,
      member: undefined, // TODO: Define
    };
    return data;
  }
  if (channel.type === ChannelType.GuildText) {
    const data: APITextChannel = {
      id: channel.id,
      position: channel.position,
      type: channel.type,
      default_auto_archive_duration: channel.defaultAutoArchiveDuration,
      flags: channel.flags?.bitfield,
      guild_id: channel.guild?.id,
      last_message_id: channel.lastMessageId,
      last_pin_timestamp: channel.lastPinAt?.toISOString(),
      name: channel.name,
      nsfw: channel.nsfw,
      parent_id: channel.parentId,
      permission_overwrites: undefined,
      rate_limit_per_user: channel.rateLimitPerUser,
      topic: channel.topic,
    };
    return data;
  }
  throw new Error("Channel type not supported");
}

export function channelToAPIChannelMention(channel: Channel): APIChannelMention {
  if (channel.isDMBased()) {
    throw new Error("Cannot mention a DM channel");
  }
  return {
    id: channel.id,
    guild_id: channel.guild.id,
    name: channel.name,
    type: channel.type,
  };
}

export function messageToAPIData(message: Message): APIMessage {
  return {
    id: message.id,
    attachments: [],
    author: userToAPIUser(message.author),
    channel_id: message.channel.id,
    content: message.content,
    edited_timestamp: message.editedAt?.toISOString() ?? null,
    embeds: [],
    flags: message.flags?.bitfield,
    mention_everyone: message.mentions.everyone,
    mention_roles: message.mentions.roles.map((role) => role.id),
    mentions: message.mentions.users.map((user) => userToAPIUser(user)),
    pinned: message.pinned,
    timestamp: message.createdAt.toISOString(),
    tts: message.tts,
    type: message.type,
    mention_channels: message.mentions.channels.map(channelToAPIChannelMention),
    nonce: message.nonce ?? undefined,
    position: message.position ?? undefined,
  };
}

export function mockInteractionResponse({
  interaction,
  id,
}: {
  interaction: Interaction;
  id: Snowflake;
}): InteractionResponse {
  return Reflect.construct(InteractionResponse, [interaction, id]) as InteractionResponse;
}

export function mockButtonInteraction({
  client,
  override,
}: {
  client: Client;
  override: Partial<
    Omit<RawMessageButtonInteractionData & RawMessageComponentInteractionData, "component_type">
  >;
}) {
  const guild = mockGuild(client);
  const member = mockGuildMember({ client, guild });
  const channel = mockTextChannel(client, guild);
  const message = mockMessage({ client, channel, author: client.user! });
  const id = randomSnowflake.toString();
  const customId = override.custom_id ?? randomSnowflake.toString();
  const rawData = {
    component_type: ComponentType.Button,
    application_id: client.user?.id.toString() ?? randomSnowflake.toString(), // TODO: This probably should be an assert
    channel_id: channel.id,
    id,
    token: randomSnowflake.toString(), // TODO: Use a real token
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
      component_type: ComponentType.Button,
      custom_id: customId,
    },
    custom_id: customId,
    message: messageToAPIData(message),
    type: InteractionType.MessageComponent,
    ...override,
  } satisfies RawMessageButtonInteractionData & RawMessageComponentInteractionData;
  const interaction = Reflect.construct(ButtonInteraction, [client, rawData]) as ButtonInteraction;

  // @ts-ignore
  interaction.update = async (
    options:
      | (InteractionUpdateOptions & { fetchReply: true })
      | (string | MessagePayload | InteractionUpdateOptions)
  ) => {
    const channel = client.channels.cache.get(interaction.channelId);
    const cachedMessage = channel?.isTextBased()
      ? channel.messages.cache.get(interaction.message.id)
      : undefined;
    if (!cachedMessage) throw new Error("No message found to update");

    await cachedMessage.edit(options);

    if (options instanceof Object && "fetchReply" in options) {
      return cachedMessage;
    }
    return mockInteractionResponse({
      interaction: interaction,
      id: interaction.id,
    });
  };
  return interaction;
}
