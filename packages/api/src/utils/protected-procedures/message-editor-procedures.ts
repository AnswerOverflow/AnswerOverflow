import type { Context } from "~api/router/context";
import { assertCanEditMessages } from "../permissions";
import {
  type ProtectedMutationInput,
  protectedMutation,
  type ProtectedFetchInput,
  protectedFetch,
  type ProtectedMutationFetchFirstInput,
  protectedMutationFetchFirst,
} from "./base";

export async function protectedMessageMutation<T>(
  input: Omit<ProtectedMutationInput<T>, "assertPermissions"> & {
    author_id: string;
    ctx: Context;
  }
) {
  return protectedMutation({
    ...input,
    assertPermissions: () => assertCanEditMessages(input.ctx, input.author_id),
  });
}

export async function protectedMessageFetch<T>(
  input: Omit<ProtectedFetchInput<T>, "assertPermissions"> & {
    author_id: string | string[];
    ctx: Context;
  }
) {
  return protectedFetch({
    ...input,
    assertPermissions: () => assertCanEditMessages(input.ctx, input.author_id),
  });
}

export async function protectedMessageMutationFetchFirst<T, F>(
  input: Omit<ProtectedMutationFetchFirstInput<T, F>, "assertPermissions"> & {
    // eslint-disable-next-line no-unused-vars
    getAuthorId: (data: T) => string | string[];
    ctx: Context;
  }
) {
  return protectedMutationFetchFirst({
    ...input,
    assertPermissions: (data) => assertCanEditMessages(input.ctx, input.getAuthorId(data)),
  });
}
