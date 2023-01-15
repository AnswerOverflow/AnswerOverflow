import { findOrThrowNotFound } from "../operations";
import type { TRPCError } from "@trpc/server";

type PermissionCheckResult = TRPCError | void;

type PermissionsChecks = Array<() => PermissionCheckResult> | (() => PermissionCheckResult);

function iteratePermissionResults(results: Array<PermissionCheckResult> | PermissionCheckResult) {
  if (Array.isArray(results)) {
    const errors = results.filter(
      (result) => result != undefined && typeof result != "undefined"
    ) as TRPCError[];
    if (errors.length > 0) {
      throw errors[0];
    }
  } else {
    if (results) throw results;
  }
}

function validatePermissions(permissions: PermissionsChecks) {
  if (Array.isArray(permissions)) {
    iteratePermissionResults(permissions.map((permission) => permission()));
  } else {
    iteratePermissionResults(permissions());
  }
}

type PermissionsChecksWithData<T> =
  | Array<(data: T) => PermissionCheckResult>
  | ((data: T) => PermissionCheckResult);

function validatePermissionsWithData<T>(permissions: PermissionsChecksWithData<T>, data: T) {
  if (Array.isArray(permissions)) {
    iteratePermissionResults(permissions.map((permission) => permission(data)));
  } else {
    iteratePermissionResults(permissions(data));
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
  validatePermissionsWithData(permissions, data);
  return data;
}

type ProtectedFetchWithPublicDataInput<F, T extends F> = ProtectedFetchInput<T> & {
  public_data_formatter?: (data: T) => Partial<T> & F;
  public_data_permissions?: PermissionsChecksWithData<T>;
};

export async function protectedFetchWithPublicData<F, T extends F>({
  public_data_formatter,
  public_data_permissions = [],
  fetch,
  permissions,
  not_found_message,
}: ProtectedFetchWithPublicDataInput<F, T>): Promise<Partial<T> & F> {
  const data = await findOrThrowNotFound(fetch, not_found_message);
  try {
    validatePermissionsWithData(permissions, data);
    return data;
  } catch (error) {
    if (public_data_formatter) {
      validatePermissionsWithData(public_data_permissions, data);
      return public_data_formatter(data);
    }
    throw error;
  }
}

type ProtectedMutationInput<T> = {
  operation: () => Promise<T>;
  permissions: PermissionsChecks;
};

export async function protectedMutation<T>({ operation, permissions }: ProtectedMutationInput<T>) {
  validatePermissions(permissions);
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
