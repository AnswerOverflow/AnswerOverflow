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

// Scenarios:
// 1. Fetch then assert
// 2. Assert then create
// 3. Fetch then assert then create

// 1. Scenario 1, we need to fetch the data before we can assertCanEditServer
type ProtectedFetchInput<T> = {
  fetch: () => Promise<T | null>;
  // eslint-disable-next-line no-unused-vars
  getServerId: (data: T) => string | string[];
  not_found_message: string;
  ctx: Context;
};
export async function protectedFetch<T>(input: ProtectedFetchInput<T>) {
  const { fetch, ctx, not_found_message } = input;
  const data = await findOrThrowNotFound(fetch, not_found_message);
  const server_id = input.getServerId(data);
  assertCanEditServers(ctx, server_id);
  return data;
}

// 2. Scenario 2, we already have the data and can assertCanEditServer
export async function protectedOperation<T>(input: {
  operation: () => Promise<T>;
  // eslint-disable-next-line no-unused-vars
  server_id: string | string[];
  ctx: Context;
}) {
  const { operation, server_id, ctx } = input;
  assertCanEditServers(ctx, server_id);
  return operation();
}

// 3. Scenario 3, we need to fetch the data before we can assertCanEditServer
export async function protectedOperationFetchFirst<T, F>(
  input: ProtectedFetchInput<T> & {
    // eslint-disable-next-line no-unused-vars
    operation: (data: T) => Promise<F>;
  }
) {
  const data = await protectedFetch(input);
  return input.operation(data);
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
