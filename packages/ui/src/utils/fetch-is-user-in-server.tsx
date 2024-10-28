import { appRouter } from '@answeroverflow/api/index';
import { createContextInner } from '@answeroverflow/api/src/router/context';
import { Auth } from '@answeroverflow/core/auth';

export async function fetchIsUserInServer(
	id: string,
): Promise<'in_server' | 'not_in_server'> {
	const session = await Auth.getServerSession();
	const caller = appRouter.createCaller(
		await createContextInner({
			session: session,
			source: 'web-client',
		}),
	);
	const servers = await caller.auth.getServers();
	return servers?.some((s) => s.id === id) ? 'in_server' : 'not_in_server';
}
