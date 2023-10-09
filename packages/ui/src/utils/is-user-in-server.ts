import { appRouter } from '@answeroverflow/api';
import { getServerSession } from '@answeroverflow/auth';
import { createContextInner } from '~api/router/context';

export async function isUserInServer(
	id: string,
): Promise<'in_server' | 'not_in_server'> {
	const session = await getServerSession();
	const caller = appRouter.createCaller(
		await createContextInner({
			session: session,
			source: 'web-client',
		}),
	);
	const servers = await caller.auth.getServers();
	return servers?.some((s) => s.id === id) ? 'in_server' : 'not_in_server';
}
