export async function findOrCreate<T>(
  // eslint-disable-next-line no-unused-vars
  finder: () => Promise<T | null>,
  // eslint-disable-next-line no-unused-vars
  creator: () => Promise<T>
): Promise<T> {
  const data = await finder();
  if (data != null) return data;
  return creator();
}

export async function upsert<T>(
  find: () => Promise<T | null>,
  create: () => Promise<T>,
  // eslint-disable-next-line no-unused-vars
  update: (old: T) => Promise<T>
) {
  const existing = await find();
  if (!existing) {
    return create();
  }
  return update(existing);
}

export async function upsertMany<T, CreateInput, UpdateInput>(calls: {
  find: () => Promise<T[]>;
  // eslint-disable-next-line no-unused-vars
  getToCreate: (existing: T[]) => CreateInput[];
  // eslint-disable-next-line no-unused-vars
  getToUpdate: (existing: T[]) => UpdateInput[];
  // eslint-disable-next-line no-unused-vars
  create: (input: CreateInput[]) => Promise<T[]>;
  // eslint-disable-next-line no-unused-vars
  update: (input: UpdateInput[]) => Promise<T[]>;
}) {
  const { find, getToCreate, getToUpdate, create, update } = calls;
  const existing = await find();
  const toCreate = getToCreate(existing);
  const toUpdate = getToUpdate(existing);
  const [created, updated] = await Promise.all([update(toUpdate), create(toCreate)]);
  return [...created, ...updated];
}
