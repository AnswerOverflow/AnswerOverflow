import { TRPCError } from '@trpc/server';

export function addDefaultValues<T, F>(
	input: T[],
	getDefaultValue: (input: T) => F,
) {
	return input.map((v) => getDefaultValue(v));
}

export async function findOrThrowNotFound<T>(
	find: () => Promise<T | null>,
	message: string,
) {
	const data = await find();
	if (!data) throw new TRPCError({ code: 'NOT_FOUND', message });
	return data;
}

export async function findAllowNull<T>(find: () => Promise<T>) {
	try {
		return await find();
	} catch (error) {
		if (error instanceof TRPCError && error.code === 'NOT_FOUND') {
			return null;
		} else {
			throw error;
		}
	}
}
