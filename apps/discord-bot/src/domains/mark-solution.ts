import {
  ActionRowBuilder,
  AnyThreadChannel,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  DiscordAPIError,
  EmbedBuilder,
  ForumChannel,
  Message,
  MessageActionRowComponentBuilder,
  NewsChannel,
  PermissionResolvable,
  TextChannel,
  User,
} from "discord.js";
import { ANSWER_OVERFLOW_BLUE_HEX } from "~discord-bot/utils/constants";
import { findSolutionsToMessage } from "./indexing";
import type { ChannelWithFlags } from "@answeroverflow/api";
import { makeConsentButton } from "./manage-account";
import { findChannelById } from "@answeroverflow/db";

export const QUESTION_ID_FIELD_NAME = "Question Message ID";
export const SOLUTION_ID_FIELD_NAME = "Solution Message ID";
export const PERMISSIONS_ALLOWED_TO_MARK_AS_SOLVED: PermissionResolvable[] = [
  "Administrator",
  "ManageChannels",
  "ManageThreads",
  "ManageGuild",
];

export class MarkSolutionError extends Error {}

export async function checkIfCanMarkSolution(possibleSolution: Message, userMarkingAsSolved: User) {
  const guild = possibleSolution.guild;
  if (!guild)
    throw new MarkSolutionError("Cannot mark a message as a solution if it's not in a guild");
  const thread = possibleSolution.channel;

  if (!thread.isThread()) {
    throw new MarkSolutionError("Cannot mark a message as a solution if it's not in a thread");
  }
  const threadParent = thread.parent;

  if (possibleSolution.author.id === possibleSolution.client.id) {
    throw new MarkSolutionError("Answer Overflow Bot messages can't be marked as a solution");
  }

  if (!threadParent) throw new MarkSolutionError("Could not find the parent channel of the thread");

  const channelSettings = await findChannelById(threadParent.id);

  if (!channelSettings || !channelSettings.flags.markSolutionEnabled) {
    throw new MarkSolutionError("Mark solution is not enabled in this channel");
  }

  // Find the question message
  // First try to find the message that started the thread, threads are created with the same thread id as the starter message

  let questionMessage: Message | undefined;
  try {
    // TODO: Support headless threads
    if (threadParent.type === ChannelType.GuildForum) {
      // If we fail to find the message with the same id as the thread, fetch the first message in the thread as a fallbacck
      questionMessage = await thread.messages.fetch(thread.id);
    } else {
      questionMessage = await threadParent.messages.fetch(thread.id);
    }
  } catch (error) {
    if (error instanceof DiscordAPIError && error.status === 404) {
      throw new MarkSolutionError("Could not find the root message of the thread");
    } else {
      throw error;
    }
  }
  // Check if the user has permission to mark the question as solved
  const guildMember = await guild.members.fetch(userMarkingAsSolved.id);
  if (questionMessage.author.id !== userMarkingAsSolved.id) {
    const userPermissions = guildMember.permissions;
    const doesUserHaveOverridePermissions = PERMISSIONS_ALLOWED_TO_MARK_AS_SOLVED.some(
      (permission) => userPermissions.has(permission)
    );
    if (!doesUserHaveOverridePermissions) {
      throw new MarkSolutionError(
        `You don't have permission to mark this question as solved. Only the thread author or users with the permissions ${PERMISSIONS_ALLOWED_TO_MARK_AS_SOLVED.join(
          ", "
        )} can mark a question as solved.`
      );
    }
  }

  // Check if the question is already solved
  assertMessageIsUnsolved(thread, questionMessage, channelSettings.solutionTagId);
  return {
    question: questionMessage,
    solution: possibleSolution,
    server: guild,
    thread,
    parentChannel: threadParent,
    channelSettings,
  };
}

export function assertMessageIsUnsolved(
  thread: AnyThreadChannel,
  questionMessage: Message,
  solutionTagId: string | null
) {
  // 1. Check if the thread has a solved tag
  if (solutionTagId && thread.appliedTags.includes(solutionTagId)) {
    throw new MarkSolutionError("This question is already marked as solved");
  }

  // 2. Check if the thread has a solved emoji ✅ applied by the Answer Overflow Bot
  const checkmarkEmojis = questionMessage.reactions.cache.get("✅");
  if (checkmarkEmojis?.users.cache.has(questionMessage.client.user?.id)) {
    throw new MarkSolutionError("This question is already marked as solved");
  }

  // 3. Look at the message history to see if it contains the solution message from the Answer Overflow Bot
  // This is more of a backup, so we only do the cached falues
  const isSolutionInCache = thread.messages.cache.some((message) => {
    const { questionId, solutionId } = findSolutionsToMessage(message);
    return questionId && solutionId;
  });

  if (isSolutionInCache) {
    throw new MarkSolutionError("This question is already marked as solved");
  }
}

export async function addSolvedIndicatorToThread(
  thread: AnyThreadChannel,
  parentChannel: TextChannel | ForumChannel | NewsChannel,
  questionMessage: Message,
  solvedTagId: string | null
) {
  // Apply the solved tag if it exists and it is a forum channel, otherwise add a checkmark reaction as a fallback
  if (parentChannel.type == ChannelType.GuildForum && solvedTagId) {
    await thread.setAppliedTags([...thread.appliedTags, solvedTagId]);
  } else {
    await questionMessage.react("✅");
  }
}

export function makeRequestForConsentString(serverName: string) {
  return [
    `${serverName} uses Answer Overflow to publicly index questions on search engines such as Google so that people who have similar questions can find the answers they are looking for`,
    `Your permission is required to use your messages, if you would like to contribute your messages from ${serverName} help channels, please use the button below`,
  ].join("\n\n");
}

export function makeMarkSolutionResponse({
  question,
  solution,
  serverName,
  settings,
}: {
  question: Message;
  solution: Message;
  serverName: string;
  settings: ChannelWithFlags;
}) {
  const components = new ActionRowBuilder<MessageActionRowComponentBuilder>();
  const embed = new EmbedBuilder()
    .addFields(
      {
        name: QUESTION_ID_FIELD_NAME,
        value: question.id,
        inline: true,
      },
      {
        name: SOLUTION_ID_FIELD_NAME,
        value: solution.id,
        inline: true,
      },
      {
        name: "Learn more",
        value: "https://answeroverflow.com",
      }
    )
    .setColor(ANSWER_OVERFLOW_BLUE_HEX);

  if (settings.flags.indexingEnabled && !settings.flags.forumGuidelinesConsentEnabled) {
    embed.setDescription(
      [
        `**Thank you for marking this question as solved!**`,
        makeRequestForConsentString(serverName),
      ].join("\n\n")
    );
    components.addComponents(makeConsentButton());
  } else {
    embed.setDescription("**Thank you for marking this question as solved!**");
  }

  components.addComponents(
    new ButtonBuilder().setLabel("Jump To Solution").setURL(solution.url).setStyle(ButtonStyle.Link)
  );

  // TODO: Add view on Answer Overflow

  return { embed, components: components.components.length > 0 ? components : undefined };
}

export async function markAsSolved(targetMessage: Message, user: User) {
  const { parentChannel, question, solution, thread, channelSettings, server } =
    await checkIfCanMarkSolution(targetMessage, user);
  await addSolvedIndicatorToThread(thread, parentChannel, question, channelSettings.solutionTagId);
  const { embed, components } = makeMarkSolutionResponse({
    question,
    solution,
    serverName: server.name,
    settings: channelSettings,
  });
  return {
    embed,
    components,
    solution,
    question,
    thread,
  };
}
