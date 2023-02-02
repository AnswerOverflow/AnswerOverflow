import type { SapphireClient } from "@sapphire/framework";
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
} from "~discord-bot/utils/utils";
import { mockGuild } from "./guild-mock";
import { mockGuildMember, mockUser } from "./user-mock";

export function getGuildTextChannelMockDataBase<Type extends GuildTextChannelType>(
  type: Type,
  guild: Guild
) {
  const raw_data: APIGuildTextChannel<Type> = {
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
  return raw_data;
}

function setupMockedChannel<T extends GuildBasedChannel>(
  client: SapphireClient,
  guild: Guild | undefined,
  create_mock_data: (guild: Guild) => T
): T {
  if (!guild) {
    guild = mockGuild(client);
  }
  const channel = create_mock_data(guild);
  if (
    channel.type === ChannelType.GuildText ||
    channel.type === ChannelType.GuildAnnouncement ||
    channel.type === ChannelType.GuildForum
  ) {
    channel.threads.fetchActive = jest.fn().mockImplementation(() => {
      const active_threads = [...channel.threads.cache.values()].filter(
        (thread) => !thread.archived || thread.archived == null
      );
      const output: FetchedThreads = {
        threads: new Collection(
          active_threads.map((thread) => [thread.id, thread as AnyThreadChannel])
        ),
        hasMore: false,
      };
      return Promise.resolve(output);
    });
    channel.threads.fetchArchived = jest
      .fn()
      .mockImplementation((options: FetchArchivedThreadOptions = {}) => {
        let filtered_threads = [
          ...channel.threads.cache.sorted((a, b) => isSnowflakeLargerAsInt(a.id, b.id)).values(),
        ].filter((thread) => thread.archived);
        if (options.type) {
          filtered_threads = filtered_threads.filter((thread) => {
            const is_public_thread = thread.type === ChannelType.PublicThread;
            const is_private_thread = thread.type === ChannelType.PrivateThread;
            if (options.type === "public" && is_public_thread) {
              return true;
            }
            if (options.type === "private" && is_private_thread) {
              return true;
            }
            return false;
          });
        }

        filtered_threads = filtered_threads.filter((thread) => {
          let before_time = options.before;
          if (before_time == undefined) {
            return true;
          }
          if (before_time instanceof Date || typeof before_time === "number") {
            before_time = SnowflakeUtil.generate({ timestamp: before_time }).toString();
          }
          if (before_time instanceof ThreadChannel) {
            before_time = before_time.id;
          }
          return isSnowflakeLarger(thread.id, before_time);
        });

        if (options.limit) {
          filtered_threads = filtered_threads.slice(0, options.limit);
        }

        const output: FetchedThreads = {
          threads: new Collection(
            filtered_threads.map((thread) => [thread.id, thread as AnyThreadChannel])
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
          const sorted_cached_messages = sortMessagesById(
            Array.from(channel.messages.cache.values())
          );
          // 2. filter to only above the id
          const filtered_messages = sorted_cached_messages.filter((message) => {
            if (!after) return true;
            return isSnowflakeLarger(message.id, after);
          });
          // 3. take up to limit
          const messages = filtered_messages.slice(0, limit);
          jest.clearAllMocks();
          const as_collection = new Collection(messages.map((message) => [message.id, message]));
          return Promise.resolve(as_collection);
        }
      );
  }
  client.channels.cache.set(channel.id, channel);
  guild.channels.cache.set(channel.id, channel);
  return channel;
}

export function mockTextChannel(
  client: SapphireClient,
  guild?: Guild,
  data: Partial<APITextChannel> = {}
): TextChannel {
  return setupMockedChannel(client, guild, (guild) => {
    const raw_data: APITextChannel = {
      ...getGuildTextChannelMockDataBase(ChannelType.GuildText, guild),
      ...data,
    };
    const channel = Reflect.construct(TextChannel, [guild, raw_data, client]) as TextChannel;
    return channel;
  });
}

export function mockThreadFromParentMessage(input: {
  client: Client;
  parent_message: Message;
  data?: Partial<APIThreadChannel>;
}) {
  const { client, parent_message, data = {} } = input;
  if (parent_message) {
    if (
      parent_message &&
      (parent_message.channel.type === ChannelType.GuildText ||
        parent_message.channel.type === ChannelType.GuildAnnouncement)
    ) {
      return mockPublicThread({
        client,
        parent_channel: parent_message.channel,
        data: {
          id: parent_message.id,
          ...data,
        },
      });
    }
  }
  throw new Error("Invalid parent message");
}

export function mockPublicThread(input: {
  client: SapphireClient;
  parent_channel?: TextChannel | ForumChannel | NewsChannel;
  data?: Partial<APIThreadChannel>;
}) {
  const { client, data = {} } = input;
  let { parent_channel } = input;

  return setupMockedChannel(client, parent_channel?.guild, (guild) => {
    if (!parent_channel) {
      parent_channel = mockTextChannel(client, guild);
    }
    const raw_data: APIThreadChannel = {
      ...getGuildTextChannelMockDataBase(ChannelType.PublicThread, guild),
      member: {
        id: randomSnowflake().toString(),
        user_id: randomSnowflake().toString(),
        join_timestamp: new Date().toISOString(),
        flags: 0,
      },
      guild_id: guild.id,
      parent_id: parent_channel.id,
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
      raw_data,
      client,
    ]) as PublicThreadChannel;

    // @ts-ignore
    parent_channel.threads.cache.set(thread.id, thread);
    return thread;
  });
}

export function mockForumChannel(
  client: SapphireClient,
  guild?: Guild,
  data: Partial<APIGuildForumChannel> = {}
) {
  return setupMockedChannel(client, guild, (guild) => {
    const raw_data: APIGuildForumChannel = {
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
    const channel = Reflect.construct(ForumChannel, [guild, raw_data, client]);
    return channel;
  });
}

export function mockNewsChannel(input: {
  client: SapphireClient;
  guild?: Guild;
  data?: Partial<APINewsChannel>;
}) {
  return setupMockedChannel(input.client, input.guild, (guild) => {
    const raw_data: APINewsChannel = {
      ...getGuildTextChannelMockDataBase(ChannelType.GuildAnnouncement, guild),
      ...input.data,
    };
    const channel = Reflect.construct(NewsChannel, [guild, raw_data, input.client]) as NewsChannel;
    return channel;
  });
}

export function mockMessages(channel: TextBasedChannel, number_of_messages: number) {
  const messages: Message[] = [];
  for (let id = 1; id <= number_of_messages; id++) {
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
  client: SapphireClient;
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
  const raw_data: RawMessageData = {
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
  const message = Reflect.construct(Message, [client, raw_data]) as Message;
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
  const message_reaction = Reflect.construct(MessageReaction, [
    message.client,
    data,
    message,
  ]) as MessageReaction;
  return message_reaction;
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
  const emoji_id = data.emoji.name ?? data.emoji.id;
  if (!emoji_id) {
    throw new Error("Emoji ID and name cannot be null");
  }
  message.reactions.cache.set(emoji_id, reaction);
  return reaction;
}

export function mockMarkedAsSolvedReply({
  client,
  question_id,
  solution_id,
  channel,
  override = {},
}: {
  client: Client;
  question_id: string;
  solution_id: string;
  channel?: TextBasedChannel;
  override?: Partial<RawMessageData>;
}) {
  const marked_as_solved_reply = mockMessage({
    client,
    author: client.user!,
    override: {
      embeds: [
        {
          fields: [
            {
              name: "Solution Message ID",
              value: solution_id,
              inline: true,
            },
            {
              name: "Question Message ID",
              value: question_id,
              inline: true,
            },
          ],
        },
      ],
      ...override,
    },
    channel,
  });
  return marked_as_solved_reply;
}

export function mockInvite(
  client: SapphireClient,
  channel: GuildChannel | undefined,
  override: Partial<APIInvite> = {}
) {
  if (!channel) {
    channel = mockTextChannel(client);
  }
  const invite_data: APIInvite = {
    code: "test",
    channel: {
      id: channel.id,
      name: channel.name,
      type: channel.type,
    },
    ...override,
  };
  const invite = Reflect.construct(Invite, [client, invite_data]) as Invite;
  return invite;
}
