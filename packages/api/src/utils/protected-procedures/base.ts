import { findOrThrowNotFound } from "../operations";

type ProtectedFetchInput<T> = {
  fetch: () => Promise<T | null>;
  assertPermissions: (data: T) => void;
  not_found_message: string;
};
export type ProtectedFetchInputExtendable<T> = Omit<ProtectedFetchInput<T>, "assertPermissions">;

type ProtectedMutationInput<T> = {
  operation: () => Promise<T>;
  assertPermissions: () => void;
};

export type ProtectedMutationInputExtendable<T> = Omit<
  ProtectedMutationInput<T>,
  "assertPermissions"
>;

type ProtectedMutationFetchFirstInput<T, F> = ProtectedFetchInput<T> & {
  operation: (data: T) => Promise<F>;
};

export type ProtectedMutationFetchFirstInputExtendable<T, F> = Omit<
  ProtectedMutationFetchFirstInput<T, F>,
  "assertPermissions"
>;

export async function protectedFetch<T>(input: ProtectedFetchInput<T>) {
  const { fetch, assertPermissions, not_found_message } = input;
  const data = await findOrThrowNotFound(fetch, not_found_message);
  assertPermissions(data);
  return data;
}

export async function protectedMutation<T>(input: ProtectedMutationInput<T>) {
  const { operation, assertPermissions } = input;
  assertPermissions();
  return operation();
}

export async function protectedMutationFetchFirst<T, F>(
  input: ProtectedMutationFetchFirstInput<T, F>
) {
  const data = await protectedFetch(input);
  return input.operation(data);
}
