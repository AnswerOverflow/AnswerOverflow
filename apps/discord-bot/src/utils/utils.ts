import { ReacordTester, ReacordDiscordJs } from "@answeroverflow/reacord";
import type {
  ChatInputCommandSuccessPayload,
  Command,
  ContextMenuCommandSuccessPayload,
  MessageCommandSuccessPayload,
} from "@sapphire/framework";
import { container } from "@sapphire/framework";
import { send } from "@sapphire/plugin-editable-commands";
import { cyan } from "colorette";
import type { APIUser } from "discord-api-types/v9";
import {
  Guild,
  Message,
  EmbedBuilder,
  User,
  SnowflakeUtil,
  CommandInteraction,
  GuildTextBasedChannel,
  Snowflake,
} from "discord.js";
import type { ReactNode } from "react";
import { RandomLoadingMessage } from "./constants";

/**
 * Picks a random item from an array
 * @param array The array to pick a random item from
 * @example
 * const randomEntry = pickRandom([1, 2, 3, 4]) // 1
 */
export function pickRandom<T>(array: readonly T[]): T {
  const { length } = array;
  return array[Math.floor(Math.random() * length)];
}

/**
 * Sends a loading message to the current channel
 * @param message The message data for which to send the loading message
 */
export function sendLoadingMessage(message: Message): Promise<typeof message> {
  return send(message, {
    embeds: [
      new EmbedBuilder().setDescription(pickRandom(RandomLoadingMessage)).setColor("#FF0000"),
    ],
  });
}

export function logSuccessCommand(
  payload:
    | ContextMenuCommandSuccessPayload
    | ChatInputCommandSuccessPayload
    | MessageCommandSuccessPayload
): void {
  let successLoggerData: ReturnType<typeof getSuccessLoggerData>;

  if ("interaction" in payload) {
    successLoggerData = getSuccessLoggerData(
      payload.interaction.guild,
      payload.interaction.user,
      payload.command
    );
  } else {
    successLoggerData = getSuccessLoggerData(
      payload.message.guild,
      payload.message.author,
      payload.command
    );
  }

  container.logger.debug(
    `${successLoggerData.shard} - ${successLoggerData.commandName} ${successLoggerData.author} ${successLoggerData.sentAt}`
  );
}

export function getSuccessLoggerData(guild: Guild | null, user: User, command: Command) {
  const shard = getShardInfo(guild?.shardId ?? 0);
  const commandName = getCommandInfo(command);
  const author = getAuthorInfo(user);
  const sentAt = getGuildInfo(guild);

  return { shard, commandName, author, sentAt };
}

function getShardInfo(id: number) {
  return `[${cyan(id.toString())}]`;
}

function getCommandInfo(command: Command) {
  return cyan(command.name);
}

function getAuthorInfo(author: User | APIUser) {
  return `${author.username}[${cyan(author.id)}]`;
}

function getGuildInfo(guild: Guild | null) {
  if (guild === null) return "Direct Messages";
  return `${guild.name}[${cyan(guild.id)}]`;
}

function getRandomTime(start?: Date, end?: Date) {
  if (!start) {
    start = new Date(2015, 0, 1);
  }
  if (!end) {
    end = new Date();
  }
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

export function randomSnowflake(start?: Date, end?: Date) {
  return SnowflakeUtil.generate({ timestamp: getRandomTime(start, end) });
}

export function ephemeralReply(
  reacord: ReacordTester | ReacordDiscordJs,
  content: ReactNode,
  interaction?: CommandInteraction
) {
  if (reacord instanceof ReacordTester) {
    reacord.ephemeralReply(content);
    return;
  } else if (interaction && reacord instanceof ReacordDiscordJs) {
    reacord.ephemeralReply(interaction, content);
    return;
  }
  throw new Error(`Invalid reacord instance`);
}
export function getRootChannel(channel: GuildTextBasedChannel) {
  if (channel.isVoiceBased()) return undefined;
  if (!channel.isTextBased()) return undefined;
  if (channel.isThread()) {
    if (!channel.parent) {
      return undefined;
    }
    return channel.parent;
  }
  return channel;
}

export function sortMessagesById<T extends Message>(messages: T[]) {
  return messages.sort((a, b) => isSnowflakeLargerAsInt(a.id, b.id));
}

export function isSnowflakeLargerAsInt(a: Snowflake, b: Snowflake) {
  return !isSnowflakeLarger(a, b) ? -1 : isSnowflakeLarger(a, b) ? 1 : 0;
}

export function isSnowflakeLarger(a: Snowflake, b: Snowflake) {
  const a_as_big_int = BigInt(a);
  const b_as_big_int = BigInt(b);
  return a_as_big_int > b_as_big_int;
}
