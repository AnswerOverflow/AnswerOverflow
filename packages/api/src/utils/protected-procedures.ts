import { findOrThrowNotFound } from "./operations";
import { TRPCError } from "@trpc/server";
import type { DeepPartial } from "@answeroverflow/utils";

type PermissionCheckResult = Promise<TRPCError | void> | (TRPCError | void);

export type PermissionsChecks =
  | Array<() => PermissionCheckResult | PermissionCheckResult[]>
  | (() => PermissionCheckResult | PermissionCheckResult[]);

async function iteratePermissionResults(
  results: Array<PermissionCheckResult> | PermissionCheckResult
) {
  let errors: TRPCError[] = [];
  if (Array.isArray(results)) {
    const awaitedResults = await Promise.all(results);
    errors = awaitedResults.filter((result) => result != undefined) as TRPCError[];
  } else {
    const awaitedResult = await results;
    if (awaitedResult != undefined) {
      errors = [awaitedResult];
    }
  }
  if (errors.length > 0) {
    // Ugly
    const errorMessages = [...new Set(errors.map((error) => error.message))].join("\n");
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: errorMessages,
    });
  }
}

async function validatePermissions(permissions: PermissionsChecks) {
  if (Array.isArray(permissions)) {
    await iteratePermissionResults(permissions.map((permission) => permission()).flat());
  } else {
    await iteratePermissionResults(permissions());
  }
}

type PermissionsChecksWithData<T> =
  | Array<(data: T) => PermissionCheckResult | PermissionCheckResult[]>
  | ((data: T) => PermissionCheckResult | PermissionCheckResult[]);

async function validatePermissionsWithData<T>(permissions: PermissionsChecksWithData<T>, data: T) {
  if (Array.isArray(permissions)) {
    const permissionResults = permissions.map((permission) => permission(data));
    // flatten
    const flattenedPermissionResults = permissionResults.flat();
    await iteratePermissionResults(flattenedPermissionResults);
  } else {
    await iteratePermissionResults(permissions(data));
  }
}

type ProtectedFetchInput<T> = {
  fetch: () => Promise<T | null>;
  permissions: PermissionsChecksWithData<T>;
  notFoundMessage: string;
};

export async function protectedFetch<T>({
  fetch,
  permissions,
  notFoundMessage,
}: ProtectedFetchInput<T>) {
  const data = await findOrThrowNotFound(fetch, notFoundMessage);
  await validatePermissionsWithData(permissions, data);
  return data;
}

type ValidatedPermissionsOrFormatData<F, T extends F> = {
  permissions: PermissionsChecksWithData<T>;
  publicDataFormatter: (data: T) => DeepPartial<T> & F;
  data: T;
};

async function validatePermissionsOrFormatData<F, T extends F>({
  permissions,
  publicDataFormatter,
  data,
}: ValidatedPermissionsOrFormatData<F, T>): Promise<T | (DeepPartial<T> & F)> {
  try {
    await validatePermissionsWithData(permissions, data);
  } catch (error) {
    if (error instanceof TRPCError && error.code === "PRECONDITION_FAILED" && publicDataFormatter)
      return publicDataFormatter(data);
    throw error;
  }
  return data;
}

export async function protectedFetchWithPublicData<F extends {}, T extends F>({
  fetch,
  notFoundMessage,
  ...validate
}: ProtectedFetchInput<T> & Omit<ValidatedPermissionsOrFormatData<F, T>, "data">) {
  const data = await findOrThrowNotFound(fetch, notFoundMessage);
  return validatePermissionsOrFormatData({
    ...validate,
    data,
  });
}

export async function protectedFetchManyWithPublicData<G extends {}, F extends G[], T extends F>({
  publicDataFormatter,
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
        publicDataFormatter,
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
