import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { Events, GuildMember } from 'discord.js';
import { provideConsentOnReadTheRules } from '../../domains/manage-account';

@ApplyOptions<Listener.Options>({ event: Events.GuildMemberUpdate })
export class ReadTheRulesConsent extends Listener {
	public constructor(context: Listener.Context, options: Listener.Options) {
		super(context, {
			...options,
			event: Events.GuildMemberUpdate,
		});
	}
	public async run(oldMember: GuildMember, newMember: GuildMember) {
		try {
			await provideConsentOnReadTheRules({
				oldMember,
				newMember,
			});
		} catch (error) {
			console.error('Error in ReadTheRulesConsent listener:', error);
		}
	}
}
