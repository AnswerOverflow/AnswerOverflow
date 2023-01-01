import { TRPCError } from "@trpc/server";

export async function upsert<T>(
  find: () => Promise<T>,
  create: () => Promise<T>,
  // eslint-disable-next-line no-unused-vars
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

export async function upsertMany<
  T,
  CreateInput,
  UpdateInput,
  F extends { create: CreateInput; update: UpdateInput }
>(calls: {
  input: F[];
  find: () => Promise<T[]>;
  // eslint-disable-next-line no-unused-vars
  getInputId: (input: F) => string;
  // eslint-disable-next-line no-unused-vars
  getFetchedDataId: (input: T) => string;
  // eslint-disable-next-line no-unused-vars
  create: (input: F["create"][]) => Promise<T[]>;
  // eslint-disable-next-line no-unused-vars
  update: (input: F["update"][]) => Promise<T[]>;
}) {
  const { find, create, getInputId, getFetchedDataId, input, update } = calls;
  const existing = await find();
  // map existing to id
  const existingMap = existing.reduce((acc, cur) => {
    acc[getFetchedDataId(cur)] = cur;
    return acc;
  }, {} as Record<string, T>);

  const toCreate = input.filter((c) => !existingMap[getInputId(c)]).map((c) => c.create);
  const toUpdate = input.filter((c) => existingMap[getInputId(c)]).map((c) => c.update);
  const [created, updated] = await Promise.all([update(toUpdate), create(toCreate)]);
  return [...created, ...updated];
}

// eslint-disable-next-line no-unused-vars
export function addDefaultValues<T, F>(input: T[], getDefaultValue: (input: T) => F) {
  return input.map((v) => getDefaultValue(v));
}

export async function findOrThrowNotFound<T>(find: () => Promise<T | null>, message: string) {
  const data = await find();
  if (!data) throw new TRPCError({ code: "NOT_FOUND", message });
  return data;
}
