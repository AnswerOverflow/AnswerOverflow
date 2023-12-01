import { TRPCError } from '@trpc/server';

export async function findOrThrowNotFound<T>(
	find: () => Promise<T | null | undefined> | undefined,
	message: string,
) {
	const data = await find();
	if (!data) throw new TRPCError({ code: 'NOT_FOUND', message });
	return data;
}
