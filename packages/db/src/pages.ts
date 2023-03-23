import {
	addFlagsToChannel,
	prisma,
	zChannelPublic,
	zServerPublic,
} from '@answeroverflow/prisma-types';
import { addFlagsToServer } from '@answeroverflow/prisma-types';
import type { z } from 'zod';
import { findAllChannelQuestions, MessageFull } from './message';

// TODO: Do not merge w/out tests
export async function findServerWithCommunityPageData(idOrVanityUrl: string) {
	// TODO: Micro optimization, if the idOrVanityUrl is a number, we can skip the vanityUrl check
	const found = await prisma.server.findFirst({
		where: {
			OR: [{ id: idOrVanityUrl }, { vanityUrl: idOrVanityUrl }],
		},
		include: {
			channels: true,
		},
	});
	if (!found) return null;
	const channels = found.channels
		.map(addFlagsToChannel)
		.filter((c) => c.flags.indexingEnabled)
		.map((c) => zChannelPublic.parse(c));
	const server = zServerPublic.parse(addFlagsToServer(found));

	const allChannelQuestions = await Promise.all(
		channels.map((c) =>
			findAllChannelQuestions({
				channelId: c.id,
				includePrivateMessages: false,
				limit: 100,
			}),
		),
	);

	const questionLookup = new Map<
		string,
		{
			message: MessageFull;
			thread: z.infer<typeof zChannelPublic>;
		}[]
	>();

	for (const channelQuestions of allChannelQuestions.flat()) {
		if (!channelQuestions.thread.parentId) continue;
		if (!channelQuestions.message) continue;
		const channel = channelQuestions.thread.parentId;
		const questions = questionLookup.get(channel);
		if (!questions) {
			questionLookup.set(channel, [
				{
					message: channelQuestions.message,
					thread: channelQuestions.thread,
				},
			]);
		} else {
			questions.push({
				message: channelQuestions.message,
				thread: channelQuestions.thread,
			});
		}
	}

	const channelsWithQuestions = channels
		.map((c) => {
			const questions = questionLookup.get(c.id) ?? [];
			return {
				channel: c,
				questions: questions
					.sort((a, b) => {
						const aDate = BigInt(a.thread.id);
						const bDate = BigInt(b.thread.id);
						if (aDate > bDate) return -1;
						if (aDate < bDate) return 1;
						return 0;
					})
					.slice(0, 20),
			};
		})
		.filter(Boolean);
	return {
		server,
		channels: channelsWithQuestions,
	};
}

export type CommunityPageData = NonNullable<
	Awaited<ReturnType<typeof findServerWithCommunityPageData>>
>;
