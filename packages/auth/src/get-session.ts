import type {
	GetServerSidePropsContext,
	NextApiRequest,
	NextApiResponse,
} from 'next';
import { getServerSession as getNextAuthSession } from 'next-auth';

import { authOptions } from './auth-options';

export const getServerSession = async (
	ctx:
		| {
				req: GetServerSidePropsContext['req'];
				res: GetServerSidePropsContext['res'];
		  }
		| { req: NextApiRequest; res: NextApiResponse },
) => {
	const isTenantSession =
		ctx.req.cookies['answeroverflow.tenant-token'] !== undefined;
	const session = await getNextAuthSession(ctx.req, ctx.res, authOptions);
	if (!session) return null;
	return {
		...session,
		isTenantSession,
	};
};
