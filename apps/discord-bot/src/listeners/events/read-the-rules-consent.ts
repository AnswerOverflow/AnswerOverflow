import { ApplyOptions } from "@sapphire/decorators";
import { Listener } from "@sapphire/framework";
import { Events, GuildMember } from "discord.js";
import { createMemberCtx } from "~discord-bot/utils/context";
import { toAODiscordAccount } from "~discord-bot/utils/conversions";
import { callApiWithConsoleStatusHandler } from "~discord-bot/utils/trpc";
@ApplyOptions<Listener.Options>({ once: true, event: Events.GuildMemberUpdate })
export class OnMessage extends Listener {
  public async run(oldMember: GuildMember, newMember: GuildMember) {
    if (oldMember.pending && !newMember.pending) {
      await callApiWithConsoleStatusHandler({
        async ApiCall(router) {
          const user = toAODiscordAccount(newMember.user);
          return router.user_server_settings.upsertWithDeps({
            user,
            server_id: oldMember.guild.id,
            flags: {
              can_publicly_display_messages: true,
            },
          });
        },
        console_error_message: `Failed to update user ${newMember.id} in server ${newMember.guild.id} to have read the rules consent.`,
        console_success_message: `Updated user ${newMember.id} in server ${newMember.guild.id} to have read the rules consent.`,
        getCtx: () => createMemberCtx(newMember),
      });
    }
  }
}
