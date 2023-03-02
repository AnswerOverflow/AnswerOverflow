import type { GuildMember } from "discord.js";
import type { ChannelWithFlags } from "@answeroverflow/db";
import { callAPI, TRPCStatusHandler } from "~discord-bot/utils/trpc";
import { toAOChannelWithServer } from "~discord-bot/utils/conversions";
import { createMemberCtx } from "~discord-bot/utils/context";
import type { RootChannel } from "~discord-bot/utils/utils";

type ChannelSettingsUpdateAPICall = {
  member: GuildMember;
  enabled: boolean;
  channel: RootChannel;
} & TRPCStatusHandler<ChannelWithFlags>;

export async function updateChannelIndexingEnabled({
  member,
  channel,
  enabled,
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
    ...statusHandlers,
  });
}

export async function updateChannelForumGuidelinesConsentEnabled({
  member,
  channel,
  enabled,
  ...statusHandlers
}: ChannelSettingsUpdateAPICall) {
  return callAPI({
    apiCall: (router) =>
      router.channels.setForumGuidelinesConsentEnabled({
        channel: toAOChannelWithServer(channel),
        enabled,
      }),
    getCtx: () => createMemberCtx(member),
    ...statusHandlers,
  });
}
