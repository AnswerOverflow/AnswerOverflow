import { protectedGet } from '../../../tokens';

import { callAPI } from '@answeroverflow/ui/src/utils/trpc';

/*
	Request format in body:
	{
	query: string,
	channelId: string | undefined,
	}
 */

import { z } from 'zod';
const bodySchema = z.object({
	query: z.string(),
	channelId: z.string().optional(),
});

export async function POST(
	request: Request,
	{ params }: { params: { id: string } },
) {
	return protectedGet({
		async fetch() {
			const body = await request.json();
			const parsedBody = bodySchema.parse(body);
			return callAPI({
				apiCall(router) {
					return router.messages.search({
						...parsedBody,
						serverId: params.id,
					});
				},
			});
		},
		isApiTokenValid({ uss }) {
			return uss.serverId !== params.id;
		},
	});
}
