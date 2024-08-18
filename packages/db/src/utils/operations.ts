import { type DBErrorCode, DBError } from './error';

interface UpsertOptions<T> {
	find: () => Promise<T | null>;
	create: () => Promise<T>;
	update: (old: T) => Promise<T> | T;
}

export async function upsert<T>({ find, create, update }: UpsertOptions<T>) {
	const existing = await find();
	if (!existing) return create();
	return update(existing);
}

export async function upsertMany<T, F, Data>(calls: {
	input: Data[];
	find: () => Promise<T[]>;
	getInputId: (input: Data) => string;
	getFetchedDataId: (input: T) => string;
	create: (input: Data[]) => Promise<F[]>;
	update: (input: Data[]) => Promise<F[]>;
}) {
	const { find, create, getInputId, getFetchedDataId, input, update } = calls;
	const existing = await find();
	// map existing to id
	const existingMap = existing.reduce(
		(acc, cur) => {
			acc[getFetchedDataId(cur)] = cur;
			return acc;
		},
		{} as Record<string, T>,
	);

	const toCreate = input
		.filter((c) => !existingMap[getInputId(c)])
		.map((c) => c);
	const toUpdate = input
		.filter((c) => existingMap[getInputId(c)])
		.map((c) => c);
	const [created, updated] = await Promise.all([
		update(toUpdate),
		create(toCreate),
	]);
	return [...created, ...updated];
}

export function addDefaultValues<T, F>(
	input: T[],
	getDefaultValue: (input: T) => F,
) {
	return input.map((v) => getDefaultValue(v));
}

export function callDatabaseWithErrorHandler<T>({
	operation,
	allowedErrors = [],
}: {
	operation: () => Promise<T>;
	allowedErrors?: DBErrorCode[] | DBErrorCode;
}) {
	try {
		return operation();
	} catch (error) {
		if (!Array.isArray(allowedErrors)) {
			allowedErrors = [allowedErrors];
		}
		if (error instanceof DBError && allowedErrors.includes(error.code)) {
			return;
		} else {
			throw error;
		}
	}
}
