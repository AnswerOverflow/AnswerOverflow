import type { GuildMember } from 'discord.js';
import type { ServerWithFlags } from '@answeroverflow/db';
import { createMemberCtx } from '../utils/context';
import { toAOServer } from '../utils/conversions';
import { TRPCStatusHandler, callAPI } from '../utils/trpc';

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

export async function setAnonymizeMessages({
	member,
	enabled,
	...statusHandlers
}: {
	member: GuildMember;
	enabled: boolean;
} & TRPCStatusHandler<ServerWithFlags>) {
	return callAPI({
		apiCall: (router) =>
			router.servers.setAnonymizeMessages({
				server: toAOServer(member.guild),
				enabled,
			}),
		getCtx: () => createMemberCtx(member),
		...statusHandlers,
	});
}
