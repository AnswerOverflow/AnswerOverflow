import {
  type Guild,
  TextChannel,
  APITextChannel,
  ChannelType,
  APIGuildForumChannel,
  GuildTextChannelType,
  APIGuildTextChannel,
  GuildBasedChannel,
  ForumChannel,
  APIThreadChannel,
  ThreadChannel,
  Message,
  ForumLayoutType,
  User,
  MessageType,
  Invite,
  APIInvite,
  GuildChannel,
  Collection,
  TextBasedChannel,
  Client,
  PublicThreadChannel,
  FetchArchivedThreadOptions,
  SnowflakeUtil,
  FetchedThreads,
  AnyThreadChannel,
  APINewsChannel,
  NewsChannel,
  MessageReaction,
  MessageResolvable,
  FetchMessagesOptions,
  DiscordAPIError,
  FetchMessageOptions,
} from "discord.js";
import type { RawMessageData, RawMessageReactionData } from "discord.js/typings/rawDataTypes";
import {
  isSnowflakeLarger,
  isSnowflakeLargerAsInt,
  randomSnowflake,
  sortMessagesById,
} from "@answeroverflow/discordjs-utils";
import { mockGuild } from "./guild-mock";
import { mockGuildMember, mockUser } from "./user-mock";

export function getGuildTextChannelMockDataBase<Type extends GuildTextChannelType>(
  type: Type,
  guild: Guild
) {
  const rawData: APIGuildTextChannel<Type> = {
    id: randomSnowflake().toString(),
    type,
    position: 0,
    default_auto_archive_duration: 60,
    rate_limit_per_user: 0,
    flags: 0,
    guild_id: guild?.id,
    last_message_id: null,
    last_pin_timestamp: null,
    name: "channel name",
    nsfw: false,
    parent_id: null,
    permission_overwrites: [],
    topic: "channel topic",
  };
  return rawData;
}

function setupMockedChannel<T extends GuildBasedChannel>(
  client: Client,
  guild: Guild | undefined,
  createMockData: (guild: Guild) => T
): T {
  if (!guild) {
    guild = mockGuild(client);
  }
  const channel = createMockData(guild);
  if (
    channel.type === ChannelType.GuildText ||
    channel.type === ChannelType.GuildAnnouncement ||
    channel.type === ChannelType.GuildForum
  ) {
    channel.threads.fetchActive = jest.fn().mockImplementation(() => {
      const activeThreads = [...channel.threads.cache.values()].filter(
        (thread) => !thread.archived || thread.archived == null
      );
      const output: FetchedThreads = {
        threads: new Collection(
          activeThreads.map((thread) => [thread.id, thread as AnyThreadChannel])
        ),
        hasMore: false,
      };
      return Promise.resolve(output);
    });
    channel.threads.fetchArchived = jest
      .fn()
      .mockImplementation((options: FetchArchivedThreadOptions = {}) => {
        let filteredThreads = [
          ...channel.threads.cache.sorted((a, b) => isSnowflakeLargerAsInt(a.id, b.id)).values(),
        ].filter((thread) => thread.archived);
        if (options.type) {
          filteredThreads = filteredThreads.filter((thread) => {
            const isPublicThread = thread.type === ChannelType.PublicThread;
            const isPrivateThread = thread.type === ChannelType.PrivateThread;
            if (options.type === "public" && isPublicThread) {
              return true;
            }
            if (options.type === "private" && isPrivateThread) {
              return true;
            }
            return false;
          });
        }

        filteredThreads = filteredThreads.filter((thread) => {
          let beforeTime = options.before;
          if (beforeTime == undefined) {
            return true;
          }
          if (beforeTime instanceof Date || typeof beforeTime === "number") {
            beforeTime = SnowflakeUtil.generate({ timestamp: beforeTime }).toString();
          }
          if (beforeTime instanceof ThreadChannel) {
            beforeTime = beforeTime.id;
          }
          return isSnowflakeLarger(thread.id, beforeTime);
        });

        if (options.limit) {
          filteredThreads = filteredThreads.slice(0, options.limit);
        }

        const output: FetchedThreads = {
          threads: new Collection(
            filteredThreads.map((thread) => [thread.id, thread as AnyThreadChannel])
          ),
          hasMore: false, // TODO: set this
        };
        return Promise.resolve(output);
      });
    channel.createInvite = jest.fn().mockImplementation(() => {
      const invite = mockInvite(client, channel);
      return Promise.resolve(invite);
    });
  }
  if (channel.isTextBased()) {
    // TODO: Add the sent message to the cache
    channel.send = jest.fn();

    channel.messages.fetch = jest
      .fn()
      .mockImplementation(
        (q: MessageResolvable | FetchMessagesOptions | FetchMessageOptions = {}) => {
          if (q instanceof Message) {
            return Promise.resolve(q);
          }
          if (typeof q === "string") {
            const message = channel.messages.cache.get(q);
            if (!message) {
              return Promise.reject(
                new DiscordAPIError(
                  {
                    code: 10008,
                    message: "NOT FOUND",
                  },
                  10008,
                  404,
                  "GET",
                  "/channels/123/messages/123",
                  {
                    files: [],
                  }
                )
              );
            }
            return Promise.resolve(message);
          }
          if ("message" in q) {
            const resolvable = q.message;
            // DRY? Never heard of it
            if (resolvable instanceof Message) {
              return Promise.resolve(q);
            }
            if (typeof resolvable === "string") {
              const message = channel.messages.cache.get(resolvable);
              if (!message) {
                return Promise.reject(
                  new DiscordAPIError(
                    {
                      code: 10008,
                      message: "NOT FOUND",
                    },
                    10008,
                    404,
                    "GET",
                    "/channels/123/messages/123",
                    {
                      files: [],
                    }
                  )
                );
              }
              return Promise.resolve(message);
            }
            throw new Error("Invalid message");
          }
          const { after } = q;
          let { limit } = q;

          if (!limit) {
            limit = 100; // Default Discord limit
          }

          // 1. sort by id
          const sortedCachedMessages = sortMessagesById(
            Array.from(channel.messages.cache.values())
          );
          // 2. filter to only above the id
          const filteredMessages = sortedCachedMessages.filter((message) => {
            if (!after) return true;
            return isSnowflakeLarger(message.id, after);
          });
          // 3. take up to limit
          const messages = filteredMessages.slice(0, limit);
          jest.clearAllMocks();
          const asCollection = new Collection(messages.map((message) => [message.id, message]));
          return Promise.resolve(asCollection);
        }
      );
  }
  client.channels.cache.set(channel.id, channel);
  guild.channels.cache.set(channel.id, channel);
  return channel;
}

export function mockTextChannel(
  client: Client,
  guild?: Guild,
  data: Partial<APITextChannel> = {}
): TextChannel {
  return setupMockedChannel(client, guild, (guild) => {
    const rawData: APITextChannel = {
      ...getGuildTextChannelMockDataBase(ChannelType.GuildText, guild),
      ...data,
    };
    const channel = Reflect.construct(TextChannel, [guild, rawData, client]) as TextChannel;
    return channel;
  });
}

export function mockThreadFromParentMessage(input: {
  client: Client;
  parentMessage: Message;
  data?: Partial<APIThreadChannel>;
}) {
  const { client, parentMessage, data = {} } = input;
  if (parentMessage) {
    if (
      parentMessage &&
      (parentMessage.channel.type === ChannelType.GuildText ||
        parentMessage.channel.type === ChannelType.GuildAnnouncement)
    ) {
      return mockPublicThread({
        client,
        parentChannel: parentMessage.channel,
        data: {
          id: parentMessage.id,
          ...data,
        },
      });
    }
  }
  throw new Error("Invalid parent message");
}

export function mockPublicThread(input: {
  client: Client;
  parentChannel?: TextChannel | ForumChannel | NewsChannel;
  data?: Partial<APIThreadChannel>;
}) {
  const { client, data = {} } = input;
  let { parentChannel } = input;

  return setupMockedChannel(client, parentChannel?.guild, (guild) => {
    if (!parentChannel) {
      parentChannel = mockTextChannel(client, guild);
    }
    const rawData: APIThreadChannel = {
      ...getGuildTextChannelMockDataBase(ChannelType.PublicThread, guild),
      member: {
        id: randomSnowflake().toString(),
        user_id: randomSnowflake().toString(),
        join_timestamp: new Date().toISOString(),
        flags: 0,
      },
      guild_id: guild.id,
      parent_id: parentChannel.id,
      applied_tags: [],
      message_count: 0,
      member_count: 0,
      thread_metadata: {
        archived: false,
        auto_archive_duration: 60,
        archive_timestamp: new Date().toISOString(),
        locked: false,
      },
      ...data,
    };

    const thread: PublicThreadChannel = Reflect.construct(ThreadChannel, [
      guild,
      rawData,
      client,
    ]) as PublicThreadChannel;

    // @ts-ignore
    parentChannel.threads.cache.set(thread.id, thread);
    return thread;
  });
}

export function mockForumChannel(
  client: Client,
  guild?: Guild,
  data: Partial<APIGuildForumChannel> = {}
) {
  return setupMockedChannel(client, guild, (guild) => {
    const rawData: APIGuildForumChannel = {
      ...getGuildTextChannelMockDataBase(ChannelType.GuildForum, guild),
      available_tags: [
        {
          id: randomSnowflake().toString(),
          name: "test tag",
          emoji_id: null,
          emoji_name: null,
          moderated: false,
        },
      ],
      default_forum_layout: ForumLayoutType.ListView,
      default_reaction_emoji: null,
      default_sort_order: null,
      ...data,
    };
    const channel = Reflect.construct(ForumChannel, [guild, rawData, client]);
    return channel;
  });
}

export function mockNewsChannel(input: {
  client: Client;
  guild?: Guild;
  data?: Partial<APINewsChannel>;
}) {
  return setupMockedChannel(input.client, input.guild, (guild) => {
    const rawData: APINewsChannel = {
      ...getGuildTextChannelMockDataBase(ChannelType.GuildAnnouncement, guild),
      ...input.data,
    };
    const channel = Reflect.construct(NewsChannel, [guild, rawData, input.client]) as NewsChannel;
    return channel;
  });
}

export function mockMessages(channel: TextBasedChannel, numberOfMessages: number) {
  const messages: Message[] = [];
  for (let id = 1; id <= numberOfMessages; id++) {
    messages.push(
      mockMessage({
        client: channel.client,
        channel: channel,
      })
    );
  }
  return messages;
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
  return message;
}

export function mockMessageReaction({
  message,
  reacter,
  override,
}: {
  message: Message;
  reacter: User;
  override: Partial<RawMessageReactionData>;
}) {
  const data: RawMessageReactionData = {
    channel_id: message.channel.id,
    count: 1,
    emoji: {
      id: randomSnowflake().toString(),
      name: "👍",
    },
    user_id: reacter.id,
    message_id: message.id,
    guild_id: message.guild?.id,
    me: reacter.id === message.client.user?.id,
    ...override,
  };
  const messageReaction = Reflect.construct(MessageReaction, [
    message.client,
    data,
    message,
  ]) as MessageReaction;
  return messageReaction;
}

export function mockReaction({
  message,
  user,
  override,
}: {
  message: Message;
  user: User;
  override?: Partial<RawMessageReactionData>;
}) {
  const data: RawMessageReactionData = {
    channel_id: message.channel.id,
    message_id: message.id,
    user_id: user.id,
    guild_id: message.guild?.id,
    count: 1,
    emoji: {
      id: randomSnowflake().toString(),
      name: "👍",
    },
    me: user.id === message.client.user?.id,
    ...override,
  };
  const reaction = Reflect.construct(MessageReaction, [
    message.client,
    data,
    message,
  ]) as MessageReaction;
  const emojiId = data.emoji.name ?? data.emoji.id;
  if (!emojiId) {
    throw new Error("Emoji ID and name cannot be null");
  }
  message.reactions.cache.set(emojiId, reaction);
  return reaction;
}

export function mockMarkedAsSolvedReply({
  client,
  questionId,
  solutionId,
  channel,
  override = {},
}: {
  client: Client;
  questionId: string;
  solutionId: string;
  channel?: TextBasedChannel;
  override?: Partial<RawMessageData>;
}) {
  const markedAsSolvedReply = mockMessage({
    client,
    author: client.user!,
    override: {
      embeds: [
        {
          fields: [
            {
              name: "Solution Message ID",
              value: solutionId,
              inline: true,
            },
            {
              name: "Question Message ID",
              value: questionId,
              inline: true,
            },
          ],
        },
      ],
      ...override,
    },
    channel,
  });
  return markedAsSolvedReply;
}

export function mockInvite(
  client: Client,
  channel: GuildChannel | undefined,
  override: Partial<APIInvite> = {}
) {
  if (!channel) {
    channel = mockTextChannel(client);
  }
  const inviteData: APIInvite = {
    // random 5 letter string
    code: Math.random().toString(36).substring(2, 7),
    channel: {
      id: channel.id,
      name: channel.name,
      type: channel.type,
    },
    ...override,
  };
  const invite = Reflect.construct(Invite, [client, inviteData]) as Invite;
  return invite;
}
