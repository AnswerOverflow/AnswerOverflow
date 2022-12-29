import { TRPCError } from "@trpc/server";
import type { Context } from "../router/context";
import { assertCanEditServers } from "./permissions";

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

// eslint-disable-next-line no-unused-vars
export function addDefaultValues<T, F>(input: T[], getDefaultValue: (input: T) => F) {
  return input.map((v) => getDefaultValue(v));
}

export async function findOrThrowNotFound<T>(find: () => Promise<T | null>, message: string) {
  const data = await find();
  if (!data) throw new TRPCError({ code: "NOT_FOUND", message });
  return data;
}
// Scenarios:
// 1. Fetch then assert
// 2. Assert then create
// 3. Fetch then assert then create

type ProtectedFetchInput<T> = {
  fetch: () => Promise<T | null>;
  // eslint-disable-next-line no-unused-vars
  assertPermissions: (data: T) => void;
  not_found_message: string;
};
export async function protectedFetch<T>(input: ProtectedFetchInput<T>) {
  const { fetch, assertPermissions, not_found_message } = input;
  const data = await findOrThrowNotFound(fetch, not_found_message);
  assertPermissions(data);
  return data;
}

type ProtectedMutationInput<T> = {
  operation: () => Promise<T>;
  assertPermissions: () => void;
};
export async function protectedMutation<T>(input: ProtectedMutationInput<T>) {
  const { operation, assertPermissions } = input;
  assertPermissions();
  return operation();
}

export async function protectedMutationFetchFirst<T, F>(
  input: ProtectedFetchInput<T> & {
    // eslint-disable-next-line no-unused-vars
    operation: (data: T) => Promise<F>;
  }
) {
  const data = await protectedFetch(input);
  return input.operation(data);
}

type ServerManagerProtectedFetch<T> = Omit<ProtectedFetchInput<T>, "assertPermissions"> & {
  // eslint-disable-next-line no-unused-vars
  getServerId: (data: T) => string | string[];
  ctx: Context;
};
export async function protectedServerManagerFetch<T>(input: ServerManagerProtectedFetch<T>) {
  return protectedFetch({
    ...input,
    assertPermissions: (data) => assertCanEditServers(input.ctx, input.getServerId(data)),
  });
}

type ServerManagerProtectedMutation<T> = Omit<ProtectedMutationInput<T>, "assertPermissions"> & {
  server_id: string | string[];
  ctx: Context;
};
export async function protectedServerManagerMutation<T>(input: ServerManagerProtectedMutation<T>) {
  return protectedMutation({
    ...input,
    assertPermissions: () => assertCanEditServers(input.ctx, input.server_id),
  });
}

export async function protectedServerManagerMutationFetchFirst<T, F>(
  input: ServerManagerProtectedFetch<T> & {
    // eslint-disable-next-line no-unused-vars
    operation: (data: T) => Promise<F>;
  }
) {
  const data = await protectedServerManagerFetch(input);
  return input.operation(data);
}
