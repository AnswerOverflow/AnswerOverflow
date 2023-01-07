import { ApplyOptions } from "@sapphire/decorators";
import { Listener } from "@sapphire/framework";
import { Events, GuildMember } from "discord.js";
import { toAODiscordAccount } from "~discord-bot/utils/conversions";
import { callAPI } from "~discord-bot/utils/trpc";
@ApplyOptions<Listener.Options>({ once: true, event: Events.GuildMemberUpdate })
export class OnMessage extends Listener {
  public async run(oldMember: GuildMember, newMember: GuildMember) {
    if (oldMember.pending && !newMember.pending) {
      await callAPI({
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
        Error(error) {
          console.log(error);
        },
        Ok() {
          console.log(
            `Updated user ${newMember.id} in server ${newMember.guild.id} to have read the rules consent.`
          );
        },
      });
    }
  }
}
