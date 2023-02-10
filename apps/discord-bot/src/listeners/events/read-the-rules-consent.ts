import { ApplyOptions } from "@sapphire/decorators";
import { Listener } from "@sapphire/framework";
import { Events, GuildMember } from "discord.js";
import { applyReadTheRulesConsent } from "~discord-bot/domains/consent";

@ApplyOptions<Listener.Options>({ event: Events.GuildMemberUpdate })
export class ReadTheRulesConsent extends Listener {
  public async run(oldMember: GuildMember, newMember: GuildMember) {
    await applyReadTheRulesConsent({
      oldMember,
      newMember,
    });
  }
}
