import {
  Message,
  User,
  MessageType,
  TextBasedChannel,
  Client,
  StartThreadOptions,
  MessagePayload,
  MessageEditOptions,
  Embed,
  APIEmbed,
} from "discord.js";
import type { RawMessageData } from "discord.js/typings/rawDataTypes";
import { randomSnowflake } from "@answeroverflow/discordjs-utils";
import { mockGuildMember, mockUser } from "./user-mock";
import { mockTextChannel, mockThreadFromParentMessage } from "./channel-mock";

export function mockEmbed(data: APIEmbed): Embed {
  return Reflect.construct(Embed, [data]) as Embed;
}

export function mockMessage(input: {
  client: Client;
  author?: User;
  channel?: TextBasedChannel;
  override?: Partial<RawMessageData>;
}) {
  const { client, override = {} } = input;
  let { author, channel } = input;
  if (!channel) {
    channel = mockTextChannel(client);
  }
  if (!author) {
    author = mockUser(client);
    if (!channel.isDMBased()) {
      mockGuildMember({
        client,
        user: author,
        guild: channel.guild,
      });
    }
  }
  const rawData: RawMessageData = {
    id: randomSnowflake().toString(),
    channel_id: channel.id,
    author: {
      // TODO: Use a helper function to get properties
      id: author.id,
      username: author.username,
      discriminator: author.discriminator,
      avatar: author.avatar,
    },
    content: "",
    timestamp: "",
    edited_timestamp: null,
    tts: false,
    mention_everyone: false,
    mentions: [],
    mention_roles: [],
    attachments: [],
    embeds: [],
    pinned: false,
    type: MessageType.Default,
    reactions: [],
    ...override,
  };
  const message = Reflect.construct(Message, [client, rawData]) as Message;
  // TODO: Fix ts ignore?
  // @ts-ignore
  channel.messages.cache.set(message.id, message);
  message.react = jest.fn(); // TODO: implement
  message.startThread = jest.fn().mockImplementation((options: StartThreadOptions) =>
    mockThreadFromParentMessage({
      client,
      parentMessage: message,
      data: options,
    })
  );

  message.edit = (payload: string | MessageEditOptions | MessagePayload) => {
    if (typeof payload === "string") {
      message.content = payload;
    }
    if (payload instanceof MessagePayload) {
      message.embeds = payload.options.embeds?.map(mockEmbed) ?? message.embeds;
      message.content = payload.options.content ?? message.content;
      message.components = payload.options.components ?? message.components;
    }
    return Promise.resolve(message);
  };
  return message;
}
