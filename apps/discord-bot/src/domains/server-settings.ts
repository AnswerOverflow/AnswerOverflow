import type { GuildMember } from 'discord.js';
import type { ServerWithFlags } from '@answeroverflow/db';
import { callAPI, type TRPCStatusHandler } from '~discord-bot/utils/trpc';
import { toAOServer } from '~discord-bot/utils/conversions';
import { createMemberCtx } from '~discord-bot/utils/context';

export async function updateReadTheRulesConsentEnabled({
	member,
	enabled,
	...statusHandlers
}: {
	member: GuildMember;
	enabled: boolean;
} & TRPCStatusHandler<ServerWithFlags>) {
	return callAPI({
		apiCall: (router) =>
			router.servers.setReadTheRulesConsentEnabled({
				server: toAOServer(member.guild),
				enabled,
			}),
		getCtx: () => createMemberCtx(member),
		...statusHandlers,
	});
}

export async function updateConsiderAllMessagesPublic({
	member,
	enabled,
	...statusHandlers
}: {
	member: GuildMember;
	enabled: boolean;
} & TRPCStatusHandler<ServerWithFlags>) {
	return callAPI({
		apiCall: (router) =>
			router.servers.setConsiderAllMessagesPublic({
				server: toAOServer(member.guild),
				enabled,
			}),
		getCtx: () => createMemberCtx(member),
		...statusHandlers,
	});
}
