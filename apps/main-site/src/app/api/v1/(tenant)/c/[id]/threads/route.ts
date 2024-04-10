import { protectedGet } from '../../../tokens';
import { findQuestionsForSitemapCached } from '@answeroverflow/cache';

export const runtime = 'edge';
export const preferredRegion = 'iad1';

export async function GET(
	request: Request,
	{ params }: { params: { id: string } },
) {
	return protectedGet({
		fetch() {
			return findQuestionsForSitemapCached(params.id);
		},
		isApiTokenValid({ data, uss }) {
			return uss.serverId === data.server.id;
		},
		transform(data) {
			return data.questions.map((q) => ({
				id: q.thread.id,
			}));
		},
	});
}
