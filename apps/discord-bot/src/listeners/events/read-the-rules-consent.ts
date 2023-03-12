import { ApplyOptions } from "@sapphire/decorators";
import { Listener } from "@sapphire/framework";
import { Events, GuildMember } from "discord.js";
import { provideConsentOnReadTheRules } from "~discord-bot/domains/manage-account";

@ApplyOptions<Listener.Options>({ event: Events.GuildMemberUpdate })
export class ReadTheRulesConsent extends Listener {
	public async run(oldMember: GuildMember, newMember: GuildMember) {
		await provideConsentOnReadTheRules({
			oldMember,
			newMember
		});
	}
}
