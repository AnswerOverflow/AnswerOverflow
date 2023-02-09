import { ApplyOptions } from "@sapphire/decorators";
import { Listener } from "@sapphire/framework";
import { Events, GuildMember } from "discord.js";
import { findServerById } from "@answeroverflow/db";
import { createMemberCtx } from "~discord-bot/utils/context";
import { toAODiscordAccount } from "~discord-bot/utils/conversions";
import { callAPI, makeConsoleStatusHandler } from "~discord-bot/utils/trpc";

@ApplyOptions<Listener.Options>({ event: Events.GuildMemberUpdate })
export class ReadTheRulesConsent extends Listener {
  public async run(oldMember: GuildMember, newMember: GuildMember) {
    if (oldMember.pending && !newMember.pending) {
      const serverSettings = await findServerById(newMember.guild.id);

      if (!serverSettings?.flags.readTheRulesConsentEnabled) {
        return;
      }
      await callAPI({
        async ApiCall(router) {
          const user = toAODiscordAccount(newMember.user);
          return router.userServerSettings.upsertWithDeps({
            user,
            serverId: oldMember.guild.id,
            flags: {
              canPubliclyDisplayMessages: true,
            },
          });
        },
        ...makeConsoleStatusHandler({
          errorMessage: `Failed to update user ${newMember.id} in server ${newMember.guild.id} to have read the rules consent.`,
          successMessage: `Updated user ${newMember.id} in server ${newMember.guild.id} to have read the rules consent.`,
        }),

        getCtx: () => createMemberCtx(newMember),
      });
    }
  }
}
