import type { GuildMember } from "discord.js";
import type { ChannelWithFlags } from "@answeroverflow/db";
import { callAPI, TRPCStatusHandler } from "~discord-bot/utils/trpc";
import { toAOChannelWithServer } from "~discord-bot/utils/conversions";
import { createMemberCtx } from "~discord-bot/utils/context";
import type { RootChannel } from "~discord-bot/utils/utils";

export async function updateChannelIndexingEnabled({
  member,
  channel,
  enabled,
  inviteCode,
  ...statusHandlers
}: {
  member: GuildMember;
  enabled: boolean;
  inviteCode: string;
  channel: RootChannel;
} & TRPCStatusHandler<ChannelWithFlags>) {
  return callAPI({
    apiCall: (router) =>
      router.channels.setIndexingEnabled({
        channel: toAOChannelWithServer(channel),
        enabled,
        inviteCode,
      }),
    getCtx: () => createMemberCtx(member),
    ...statusHandlers,
  });
}
