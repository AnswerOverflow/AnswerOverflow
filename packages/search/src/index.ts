import {
	BaseMessageWithRelations,
	ChannelWithFlags,
	findManyChannelsById,
	findManyMessagesWithAuthors,
	findManyServersById,
	MessageFull,
	ServerWithFlags,
} from '@answeroverflow/db';
import { elastic } from './elastic';
import { sharedEnvs } from '@answeroverflow/env/shared';

export type SearchResult = {
	message: MessageFull;
	score: number;
	channel: ChannelWithFlags;
	server: ServerWithFlags;
	thread?: ChannelWithFlags;
};
export type MessageSearchOptions = {
	query: string;
	channelId?: string;
	serverId?: string;
	after?: string;
	limit?: number;
};

export async function searchMessages(opts: MessageSearchOptions) {
	const results = await elastic.searchMessages(opts);
	const messagesWithAuthors = await findManyMessagesWithAuthors(
		results.map((r) => r.id),
	);
	// TODO: Include w/ query above
	const [servers, channels] = await Promise.all([
		findManyServersById(messagesWithAuthors.map((m) => m.serverId)),
		findManyChannelsById(
			messagesWithAuthors.flatMap((m) =>
				m.parentChannelId ? [m.channelId, m.parentChannelId] : [m.channelId],
			),
		),
	]);
	const serverLookup = new Map(servers.map((s) => [s.id, s]));
	const channelLookup = new Map(channels.map((c) => [c.id, c]));
	const resultsLookup = new Map(results.map((r) => [r.id, r]));

	return messagesWithAuthors
		.map((m): SearchResult | null => {
			const channel = channelLookup.get(m.parentChannelId ?? m.channelId);
			const server = serverLookup.get(m.serverId);
			const thread = m.parentChannelId
				? channelLookup.get(m.channelId)
				: undefined;
			if (!channel || !server) {
				return null;
			}
			if (!channel.flags.indexingEnabled) {
				return null;
			}
			return {
				message: m,
				channel,
				score: resultsLookup.get(m.id)!.score ?? 0,
				server: server,
				thread,
			};
		})
		.filter((res) => res != null && res.server.kickedTime === null)
		.sort((a, b) => b!.score - a!.score) as SearchResult[];
}

export function indexMessageForSearch(messages: BaseMessageWithRelations[]) {
	if (sharedEnvs.ELASTIC_DISABLED) return Promise.resolve(true);
	return elastic.bulkUpsertMessages(
		messages.map((m) => ({
			...m,
			embeds: [],
			attachments: [],
			reactions: [],
			solutionIds: [],
			messageReference: null,
			flags: 0,
			type: 0,
			pinned: false,
			tts: false,
		})),
	);
}
