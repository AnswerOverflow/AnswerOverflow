import { findOrThrowNotFound } from "./operations";
import type { TRPCError } from "@trpc/server";

type PermissionCheckResult = Promise<TRPCError | void> | (TRPCError | void);

type PermissionsChecks = Array<() => PermissionCheckResult> | (() => PermissionCheckResult);

async function iteratePermissionResults(
  results: Array<PermissionCheckResult> | PermissionCheckResult
) {
  if (Array.isArray(results)) {
    const awaited_results = await Promise.all(results);
    const errors = awaited_results.filter((result) => result != undefined) as TRPCError[];
    if (errors.length > 0) {
      throw errors[0];
    }
  } else {
    const awaited_result = await results;
    if (awaited_result != undefined) {
      throw awaited_result;
    }
  }
}

async function validatePermissions(permissions: PermissionsChecks) {
  if (Array.isArray(permissions)) {
    await iteratePermissionResults(permissions.map(async (permission) => permission()));
  } else {
    await iteratePermissionResults(permissions());
  }
}

type PermissionsChecksWithData<T> =
  | Array<(data: T) => PermissionCheckResult>
  | ((data: T) => PermissionCheckResult);

async function validatePermissionsWithData<T>(permissions: PermissionsChecksWithData<T>, data: T) {
  if (Array.isArray(permissions)) {
    await iteratePermissionResults(permissions.map(async (permission) => permission(data)));
  } else {
    await iteratePermissionResults(permissions(data));
  }
}

type ProtectedFetchInput<T> = {
  fetch: () => Promise<T | null>;
  permissions: PermissionsChecksWithData<T>;
  not_found_message: string;
};

export async function protectedFetch<F, T extends F>({
  fetch,
  permissions,
  not_found_message,
}: ProtectedFetchInput<T>) {
  const data = await findOrThrowNotFound(fetch, not_found_message);
  await validatePermissionsWithData(permissions, data);
  return data;
}

type ValidatedPermissionsOrFormatData<F, T extends F> = {
  permissions: PermissionsChecksWithData<T>;
  public_data_permissions?: PermissionsChecksWithData<T>;
  public_data_formatter: (data: T) => Partial<T> & F;
  data: T;
};

async function validatePermissionsOrFormatData<F, T extends F>({
  permissions,
  public_data_permissions = [],
  public_data_formatter,
  data,
}: ValidatedPermissionsOrFormatData<F, T>): Promise<T | (Partial<T> & F)> {
  try {
    await validatePermissionsWithData(permissions, data);
  } catch (error) {
    if (public_data_formatter) {
      await validatePermissionsWithData(public_data_permissions, data);
      return public_data_formatter(data);
    }
    throw error;
  }
  return data;
}

export async function protectedFetchWithPublicData<F extends {}, T extends F>({
  fetch,
  not_found_message,
  ...validate
}: ProtectedFetchInput<T> & Omit<ValidatedPermissionsOrFormatData<F, T>, "data">) {
  const data = await findOrThrowNotFound(fetch, not_found_message);
  return validatePermissionsOrFormatData({
    ...validate,
    data,
  });
}

export async function protectedFetchManyWithPublicData<G extends {}, F extends G[], T extends F>({
  public_data_formatter,
  public_data_permissions = [],
  fetch,
  permissions,
}: {
  fetch: () => Promise<T>;
} & Omit<ValidatedPermissionsOrFormatData<G, T[number]>, "data">) {
  const data = await fetch();
  const result = Promise.all(
    data.map(async (item) =>
      validatePermissionsOrFormatData({
        data: item,
        permissions,
        public_data_permissions,
        public_data_formatter,
      })
    )
  );
  return result;
}

type ProtectedMutationInput<T> = {
  operation: () => Promise<T>;
  permissions: PermissionsChecks;
};

export async function protectedMutation<T>({ operation, permissions }: ProtectedMutationInput<T>) {
  await validatePermissions(permissions);
  return operation();
}

type ProtectedMutationFetchFirstInput<T, F> = ProtectedFetchInput<T> & {
  operation: (data: T) => Promise<F>;
};

export async function protectedMutationFetchFirst<T, F>({
  operation,
  ...input
}: ProtectedMutationFetchFirstInput<T, F>) {
  const data = await protectedFetch(input);
  // TODO: Extra permission checks here?
  return operation(data);
}
