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
import { ANSWER_OVERFLOW_BLUE } from "~discord-bot/utils/constants";
import { createAnswerOveflowBotCtx } from "~discord-bot/utils/context";
import { findSolutionsToMessage } from "../listeners/indexing";
import { callApiWithConsoleStatusHandler } from "~discord-bot/utils/trpc";
import type { ChannelSettingsWithFlags } from "@answeroverflow/api";
import { makeConsentButton } from "../components/consent";
export const QUESTION_ID_FIELD_NAME = "Question Message ID";
export const SOLUTION_ID_FIELD_NAME = "Solution Message ID";
export const PERMISSIONS_ALLOWED_TO_MARK_AS_SOLVED: PermissionResolvable[] = [
  "Administrator",
  "ManageChannels",
  "ManageThreads",
  "ManageGuild",
];

export class MarkSolutionError extends Error {}

export async function checkIfCanMarkSolution(
  possible_solution: Message,
  user_marking_as_solved: User
) {
  const guild = possible_solution.guild;
  if (!guild)
    throw new MarkSolutionError("Cannot mark a message as a solution if it's not in a guild");
  const thread = possible_solution.channel;

  if (!thread.isThread()) {
    throw new MarkSolutionError("Cannot mark a message as a solution if it's not in a thread");
  }
  const thread_parent = thread.parent;

  if (possible_solution.author.id === possible_solution.client.id) {
    throw new MarkSolutionError("Answer Overflow Bot messages can't be marked as a solution");
  }

  if (!thread_parent)
    throw new MarkSolutionError("Could not find the parent channel of the thread");

  const channel_settings = await callApiWithConsoleStatusHandler({
    ApiCall(router) {
      return router.channel_settings.byId(thread_parent.id);
    },
    getCtx: createAnswerOveflowBotCtx,
    error_message: "Failed to fetch channel settings",
  });

  if (!channel_settings || !channel_settings.flags.mark_solution_enabled) {
    throw new MarkSolutionError("Mark solution is not enabled in this channel");
  }

  // Find the question message
  // First try to find the message that started the thread, threads are created with the same thread id as the starter message

  let question_message: Message | undefined;
  try {
    // TODO: Support headless threads
    if (thread_parent.type === ChannelType.GuildForum) {
      // If we fail to find the message with the same id as the thread, fetch the first message in the thread as a fallbacck
      question_message = await thread.messages.fetch(thread.id);
    } else {
      question_message = await thread_parent.messages.fetch(thread.id);
    }
  } catch (error) {
    if (error instanceof DiscordAPIError && error.status === 404) {
      throw new MarkSolutionError("Could not find the root message of the thread");
    } else {
      throw error;
    }
  }
  // Check if the user has permission to mark the question as solved
  const guild_member = await guild.members.fetch(user_marking_as_solved.id);
  if (question_message.author.id !== user_marking_as_solved.id) {
    const user_permissions = guild_member.permissions;
    const does_user_have_override_permissions = PERMISSIONS_ALLOWED_TO_MARK_AS_SOLVED.some(
      (permission) => user_permissions.has(permission)
    );
    if (!does_user_have_override_permissions) {
      throw new MarkSolutionError(
        `You don't have permission to mark this question as solved. Only the thread author or users with the permissions ${PERMISSIONS_ALLOWED_TO_MARK_AS_SOLVED.join(
          ", "
        )} can mark a question as solved.`
      );
    }
  }

  // Check if the question is already solved
  assertMessageIsUnsolved(thread, question_message, channel_settings.solution_tag_id);
  return {
    question: question_message,
    solution: possible_solution,
    server: guild,
    thread,
    parent_channel: thread_parent,
    channel_settings,
  };
}

export function assertMessageIsUnsolved(
  thread: AnyThreadChannel,
  question_message: Message,
  solution_tag_id: string | null
) {
  // 1. Check if the thread has a solved tag
  if (solution_tag_id && thread.appliedTags.includes(solution_tag_id)) {
    throw new MarkSolutionError("This question is already marked as solved");
  }

  // 2. Check if the thread has a solved emoji ✅ applied by the Answer Overflow Bot
  const checkmark_emojis = question_message.reactions.cache.get("✅");
  if (checkmark_emojis?.users.cache.has(question_message.client.user?.id)) {
    throw new MarkSolutionError("This question is already marked as solved");
  }

  // 3. Look at the message history to see if it contains the solution message from the Answer Overflow Bot
  // This is more of a backup, so we only do the cached falues
  const is_solution_in_cache = thread.messages.cache.some((message) => {
    const { question_id, solution_id } = findSolutionsToMessage(message);
    return question_id && solution_id;
  });

  if (is_solution_in_cache) {
    throw new MarkSolutionError("This question is already marked as solved");
  }
}

export async function addSolvedIndicatorToThread(
  thread: AnyThreadChannel,
  parent_channel: TextChannel | ForumChannel | NewsChannel,
  question_message: Message,
  solved_tag_id: string | null
) {
  // Apply the solved tag if it exists and it is a forum channel, otherwise add a checkmark reaction as a fallback
  if (parent_channel.type == ChannelType.GuildForum && solved_tag_id) {
    await thread.setAppliedTags([...thread.appliedTags, solved_tag_id]);
  } else {
    await question_message.react("✅");
  }
}

export function makeRequestForConsentString(server_name: string) {
  return [
    `${server_name} uses Answer Overflow to publicly index questions on search engines such as Google so that people who have similar questions can find the answers they are looking for`,
    `Your permission is required to use your messages, if you would like to contribute your messages from ${server_name} help channels, please use the button below`,
  ].join("\n\n");
}

export function makeMarkSolutionResponse({
  question,
  solution,
  server_name,
  settings,
}: {
  question: Message;
  solution: Message;
  server_name: string;
  settings: ChannelSettingsWithFlags;
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
    .setColor(ANSWER_OVERFLOW_BLUE);

  if (settings.flags.indexing_enabled && !settings.flags.forum_guidelines_consent_enabled) {
    embed.setDescription(
      [
        `**Thank you for marking this question as solved!**`,
        makeRequestForConsentString(server_name),
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

export async function markAsSolved(target_message: Message, user: User) {
  const { parent_channel, question, solution, thread, channel_settings, server } =
    await checkIfCanMarkSolution(target_message, user);
  await addSolvedIndicatorToThread(
    thread,
    parent_channel,
    question,
    channel_settings.solution_tag_id
  );
  const { embed, components } = makeMarkSolutionResponse({
    question,
    solution,
    server_name: server.name,
    settings: channel_settings,
  });
  return {
    embed,
    components,
    solution,
    question,
    thread,
  };
}
