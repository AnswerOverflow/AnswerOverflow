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
  APIBaseInteraction,
  Channel,
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

function setupMockedInteractionAPIData<Type extends InteractionType>({
  channel,
  caller,
  message = undefined,
  type,
  applicationId = undefined,
  override = {},
}: {
  applicationId?: string;
  channel: Channel;
  message?: Message;
  caller: User;
  type: Type;
  override?: Partial<APIBaseInteraction<Type, {}>>;
}): Omit<Required<APIBaseInteraction<Type, {}>>, "guild_id" | "message" | "member"> &
  Pick<APIBaseInteraction<Type, {}>, "guild_id" | "message"> {
  return {
    application_id: applicationId ?? randomSnowflake().toString(),
    channel_id: channel.id,
    id: randomSnowflake().toString(),
    token: randomSnowflake().toString(), // TODO: Use a real token
    version: 1,
    app_permissions: PermissionsBitField.Default.toString(),
    locale: "en-US",
    guild_id: channel.isDMBased() ? undefined : channel.guild.id,
    user: {
      id: caller.id,
      avatar: caller.avatar,
      discriminator: caller.discriminator,
      username: caller.username,
    },
    data: {},
    guild_locale: "en-US",
    message: message ? messageToAPIData(message) : undefined,
    type,
    ...override,
  };
}

function applyInteractionResponseHandlers(interaction: Interaction) {
  const client = interaction.client;
  if ("update" in interaction) {
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
  }
  if ("deferUpdate" in interaction) {
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
  }

  if ("deferReply" in interaction) {
    // @ts-ignore
    interaction.deferReply = (options) => {
      interaction.deferred = true;
      const msg = mockMessage({
        client,
        channel: interaction.channel ?? undefined, // TODO: probably error here?
        author: interaction.client.user,
        override: {
          id: interaction.id.toString(),
        },
      });
      if (options?.fetchReply) {
        return Promise.resolve(msg);
      }
      return Promise.resolve(
        mockInteractionResponse({
          id: interaction.id,
          interaction,
        })
      );
    };
  }

  if ("reply" in interaction) {
    // @ts-ignore
    interaction.reply = (opts) => {
      const msg = mockMessage({
        client,
        channel: interaction.channel ?? undefined, // TODO: probably error here?
        author: interaction.client.user,
        override: {
          id: interaction.id.toString(),
        },
      });
      interaction.deferred = false;
      interaction.replied = true;
      applyMessagePayload(opts, msg);
      if (opts instanceof Object && "fetchReply" in opts) {
        return msg;
      }

      return Promise.resolve(
        mockInteractionResponse({
          interaction: interaction,
          id: interaction.id,
        })
      );
    };
  }

  if ("fetchReply" in interaction) {
    interaction.fetchReply = () => {
      if (interaction.isChatInputCommand() || interaction.isContextMenuCommand()) {
        const msg = interaction.channel?.messages.cache.get(interaction.id);
        if (!msg) throw new Error("Message not found");
        return Promise.resolve(msg);
      } else {
        if (!interaction.message) throw new Error("No message to edit");
        return Promise.resolve(interaction.message);
      }
    };
  }

  if ("editReply" in interaction) {
    interaction.editReply = async (opts) => {
      interaction.deferred = false;
      interaction.replied = true;
      if (interaction.isChatInputCommand() || interaction.isContextMenuCommand()) {
        const message = await interaction.fetchReply();
        return message.edit(opts);
      } else {
        if (!interaction.message) throw new Error("No message to edit");
        return interaction.message?.edit(opts);
      }
    };
  }
}

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
    ...setupMockedInteractionAPIData({
      caller: member.user,
      channel,
      type: InteractionType.ApplicationCommand,
      applicationId: id,
    }),
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
  applyInteractionResponseHandlers(command);
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
  const customId = override.custom_id ?? randomSnowflake().toString();
  const rawData = {
    component_type: ComponentType.Button,
    custom_id: customId,
    message: messageToAPIData(message),
    ...override,
    ...setupMockedInteractionAPIData({
      caller,
      channel: message.channel,
      type: InteractionType.MessageComponent,
      message,
      override,
    }),
    data: {
      component_type: ComponentType.Button,
      custom_id: customId,
    },
  } satisfies RawMessageButtonInteractionData & RawMessageComponentInteractionData;
  const interaction = Reflect.construct(ButtonInteraction, [client, rawData]) as ButtonInteraction;
  applyInteractionResponseHandlers(interaction);
  return interaction;
}
