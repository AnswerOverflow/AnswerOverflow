import { AppRouterCaller, appRouter } from '@answeroverflow/api';
import { createContextInner } from '@answeroverflow/api/src/router/context';
import { Auth } from '@answeroverflow/core/auth';
import { TRPCError } from '@trpc/server';

export type TRPCCall<T, E extends TRPCError['code'] | undefined> = {
	apiCall: (router: AppRouterCaller) => Promise<T>;
	allowedErrors?: E | E[];
};

export async function callAPI<
	T,
	E extends TRPCError['code'] | undefined = undefined,
>(args: TRPCCall<T, E>): Promise<E extends undefined ? T : T | null> {
	const session = await Auth.getServerSession();
	const caller = appRouter.createCaller(
		await createContextInner({
			session: session,
			source: 'web-client',
		}),
	);
	const { apiCall } = args;
	let { allowedErrors } = args;
	try {
		return await apiCall(caller);
	} catch (error) {
		if (!(error instanceof TRPCError)) throw error;
		if (!Array.isArray(allowedErrors))
			allowedErrors = allowedErrors ? [allowedErrors] : [];
		if (allowedErrors.includes(error.code as E)) {
			// @ts-ignore
			return null;
		} else {
			throw error;
		}
	}
}
