import { ApplyOptions } from "@sapphire/decorators";
import { Listener } from "@sapphire/framework";
import { Events, GuildMember } from "discord.js";
import { makeGuildMemberUserServerSettingsUpsertWithDeps } from "~discord-bot/utils/conversions";
import { callAPI } from "~discord-bot/utils/trpc";
@ApplyOptions<Listener.Options>({ once: true, event: Events.GuildMemberUpdate })
export class OnMessage extends Listener {
  public async run(oldMember: GuildMember, newMember: GuildMember) {
    if (oldMember.pending && !newMember.pending) {
      await callAPI({
        async ApiCall(router) {
          const server_settings = await router.server_settings.byId(oldMember.guild.id);
          if (server_settings.flags.read_the_rules_consent_enabled) {
            await router.user_server_settings.upsertWithDeps(
              makeGuildMemberUserServerSettingsUpsertWithDeps(newMember, {
                flags: {
                  can_publicly_display_messages: true,
                },
              })
            );
          }
        },
      });
    }
  }
}
