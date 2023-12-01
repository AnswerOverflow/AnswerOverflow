import { findMessageResultPage } from '@answeroverflow/db/src/pages';
import { protectedGet } from '../../tokens';

export const runtime = 'edge';
export const preferredRegion = 'iad1';

export async function GET(
	request: Request,
	{ params }: { params: { id: string } },
) {
	return protectedGet({
		fetch() {
			return findMessageResultPage(params.id, []);
		},
		isApiTokenValid({ data, uss }) {
			return uss.serverId !== data.server.id;
		},
	});
}
