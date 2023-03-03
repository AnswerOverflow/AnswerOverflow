import { ChannelType, GuildMember } from "discord.js";
import type { ChannelWithFlags } from "@answeroverflow/db";
import { callAPI, TRPCStatusHandler } from "~discord-bot/utils/trpc";
import { toAOChannelWithServer } from "~discord-bot/utils/conversions";
import { createMemberCtx } from "~discord-bot/utils/context";
import { removeDiscordMarkdown, RootChannel } from "~discord-bot/utils/utils";
import {
  FORUM_GUIDELINES_CONSENT_PROMPT,
  FORUM_GUIDELINES_CONSENT_MISSING_ERROR_MESSAGE,
} from "@answeroverflow/constants";

type ChannelSettingsUpdateAPICall = {
  member: GuildMember;
  enabled: boolean;
  channel: RootChannel;
  Error: (message: string) => unknown | Promise<unknown>;
} & Omit<TRPCStatusHandler<ChannelWithFlags>, "Error">;

export async function updateChannelIndexingEnabled({
  member,
  channel,
  enabled,
  Error,
  ...statusHandlers
}: ChannelSettingsUpdateAPICall) {
  let newInviteCode: string | null = null;
  if (enabled) {
    const channelInvite = await channel.createInvite({
      maxAge: 0,
      maxUses: 0,
      reason: "Channel indexing enabled invite",
      unique: false,
      temporary: false,
    });
    newInviteCode = channelInvite.code;
  }
  return callAPI({
    apiCall: (router) =>
      router.channels.setIndexingEnabled({
        channel: toAOChannelWithServer(channel),
        enabled,
        inviteCode: newInviteCode ?? undefined,
      }),
    getCtx: () => createMemberCtx(member),
    Error: (error) => Error(error.message),
    ...statusHandlers,
  });
}

export function doesTextHaveConsentPrompt(text: string) {
  const strippedGuidelines = removeDiscordMarkdown(text).replace(/[^A-Za-z0-9]/g, "");
  return strippedGuidelines.includes(FORUM_GUIDELINES_CONSENT_PROMPT.replace(/[^A-Za-z0-9]/g, ""));
}

export async function updateChannelForumGuidelinesConsentEnabled({
  member,
  channel,
  enabled,
  Error,
  ...statusHandlers
}: ChannelSettingsUpdateAPICall) {
  if (channel.type === ChannelType.GuildForum && enabled) {
    if (!channel.topic || !doesTextHaveConsentPrompt(channel.topic))
      return Error(FORUM_GUIDELINES_CONSENT_MISSING_ERROR_MESSAGE);
  }
  return callAPI({
    apiCall: (router) =>
      router.channels.setForumGuidelinesConsentEnabled({
        channel: toAOChannelWithServer(channel),
        enabled,
      }),
    getCtx: () => createMemberCtx(member),
    Error: (error) => Error(error.message),
    ...statusHandlers,
  });
}
