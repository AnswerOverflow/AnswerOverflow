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
  PublicThreadChannel,
} from "discord.js";
import { randomSnowflake } from "~discord-bot/utils/utils";
import { mockGuild } from "./guild-mock";

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
  // eslint-disable-next-line no-unused-vars
  create_mock_data: (guild: Guild) => T
): T {
  if (!guild) {
    guild = mockGuild(client);
  }
  const channel = create_mock_data(guild);
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

export function mockThreadChannel(
  client: SapphireClient,
  guild?: Guild,
  parent?: ForumChannel | TextChannel,
  data: Partial<APIThreadChannel> = {}
) {
  return setupMockedChannel(client, guild, (guild) => {
    if (!parent) {
      parent = mockTextChannel(client, guild);
    }
    // TODO: Make the ID match the message ID?
    const raw_data: APIThreadChannel = {
      ...getGuildTextChannelMockDataBase(ChannelType.PublicThread, guild),
      member: {
        id: randomSnowflake().toString(),
        user_id: randomSnowflake().toString(),
        join_timestamp: new Date().toISOString(),
        flags: 0,
      },
      guild_id: guild.id,
      parent_id: parent.id,
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
    const channel: PublicThreadChannel = Reflect.construct(ThreadChannel, [
      guild,
      raw_data,
      client,
    ]) as PublicThreadChannel;
    return channel;
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
      default_reaction_emoji: null,
      default_sort_order: null,
      ...data,
    };
    const channel: ForumChannel = Reflect.construct(ForumChannel, [guild, raw_data, client]);
    return channel;
  });
}
