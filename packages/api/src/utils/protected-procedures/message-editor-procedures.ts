import type { Context } from "~api/router/context";
import { assertCanEditMessages } from "../permissions";
import {
  protectedFetch,
  ProtectedFetchInputExtendable,
  protectedMutation,
  protectedMutationFetchFirst,
  ProtectedMutationFetchFirstInputExtendable,
  ProtectedMutationInputExtendable,
} from "./base";

export async function protectedMessageMutation<T>(
  input: ProtectedMutationInputExtendable<T> & {
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
  input: ProtectedFetchInputExtendable<T> & {
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
  input: ProtectedMutationFetchFirstInputExtendable<T, F> & {
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
