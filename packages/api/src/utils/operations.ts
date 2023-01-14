import { TRPCError } from "@trpc/server";

export async function upsert<T>(
  find: () => Promise<T>,
  create: () => Promise<T>,
  update: (old: T) => Promise<T>
) {
  try {
    const existing = await find();
    return update(existing);
  } catch (error) {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") return create();
    else throw error;
  }
}

export async function upsertMany<T, Data>(calls: {
  input: Data[];
  find: () => Promise<T[]>;
  getInputId: (input: Data) => string;
  getFetchedDataId: (input: T) => string;
  create: (input: Data[]) => Promise<T[]>;
  update: (input: Data[]) => Promise<T[]>;
}) {
  const { find, create, getInputId, getFetchedDataId, input, update } = calls;
  const existing = await find();
  // map existing to id
  const existingMap = existing.reduce((acc, cur) => {
    acc[getFetchedDataId(cur)] = cur;
    return acc;
  }, {} as Record<string, T>);

  const toCreate = input.filter((c) => !existingMap[getInputId(c)]).map((c) => c);
  const toUpdate = input.filter((c) => existingMap[getInputId(c)]).map((c) => c);
  const [created, updated] = await Promise.all([update(toUpdate), create(toCreate)]);
  return [...created, ...updated];
}

export function addDefaultValues<T, F>(input: T[], getDefaultValue: (input: T) => F) {
  return input.map((v) => getDefaultValue(v));
}

export async function findOrThrowNotFound<T>(find: () => Promise<T | null>, message: string) {
  const data = await find();
  if (!data) throw new TRPCError({ code: "NOT_FOUND", message });
  return data;
}

export async function findAllowNull<T>(find: () => Promise<T>) {
  try {
    return await find();
  } catch (error) {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") {
      return null;
    } else {
      throw error;
    }
  }
}
