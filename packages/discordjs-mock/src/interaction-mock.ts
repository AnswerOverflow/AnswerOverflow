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
  InteractionResponse,
  Interaction,
  Snowflake,
  InteractionUpdateOptions,
  MessagePayload,
  Message,
  User,
} from "discord.js";
import { randomSnowflake } from "@answeroverflow/discordjs-utils";
import { mockTextChannel } from "./channel-mock";
import { applyMessagePayload, mockMessage } from "./message-mock";
import { mockGuild } from "./guild-mock";
import { mockGuildMember } from "./user-mock";
import type {
  RawMessageButtonInteractionData,
  RawMessageComponentInteractionData,
} from "discord.js/typings/rawDataTypes";
import { messageToAPIData } from "./to-api-data";

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
  override = {},
  caller,
  message,
}: {
  caller: User;
  message: Message;
  override?: Partial<
    Omit<RawMessageButtonInteractionData & RawMessageComponentInteractionData, "component_type">
  >;
}) {
  const client = message.client;
  const id = randomSnowflake.toString();
  const customId = override.custom_id ?? randomSnowflake.toString();
  const rawData = {
    component_type: ComponentType.Button,
    application_id: client.user?.id.toString() ?? randomSnowflake.toString(), // TODO: This probably should be an assert
    channel_id: message.channel.id,
    id,
    token: randomSnowflake.toString(), // TODO: Use a real token
    version: 1,
    app_permissions: PermissionsBitField.Default.toString(),
    locale: "en-US",
    guild_id: message.guild?.id,
    user: {
      id: caller.id,
      avatar: caller.avatar,
      discriminator: caller.discriminator,
      username: caller.username,
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
    interaction.deferred = false;
    await interaction.message.edit(options);
    if (options instanceof Object && "fetchReply" in options) {
      return interaction.message;
    }
    return mockInteractionResponse({
      interaction: interaction,
      id: interaction.id,
    });
  };
  // @ts-ignore
  interaction.deferUpdate = (options) => {
    interaction.deferred = true;
    if (options?.fetchReply) {
      return Promise.resolve(interaction.message);
    }
    return Promise.resolve(
      mockInteractionResponse({
        id: interaction.id,
        interaction,
      })
    );
  };
  // @ts-ignore
  interaction.reply = (opts) => {
    const msg = mockMessage({ client, channel: message.channel, author: client.user });
    interaction.deferred = false;
    interaction.replied = true;
    applyMessagePayload(opts, msg);
    if (opts instanceof Object && "fetchReply" in opts) {
      return Promise.resolve(msg);
    }

    return mockInteractionResponse({
      interaction: interaction,
      id: interaction.id,
    });
  };

  interaction.editReply = (opts) => {
    interaction.deferred = false;
    interaction.replied = true;
    return interaction.message.edit(opts);
  };
  return interaction;
}
