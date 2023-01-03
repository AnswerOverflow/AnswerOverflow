import type { Context } from "~api/router/context";
import { assertIsUsers } from "../permissions";
import {
  protectedFetch,
  ProtectedFetchInputExtendable,
  protectedMutation,
  protectedMutationFetchFirst,
  ProtectedMutationFetchFirstInputExtendable,
  ProtectedMutationInputExtendable,
} from "./base";

export async function protectedUserOnlyMutation<T>(
  input: ProtectedMutationInputExtendable<T> & {
    user_id: string | string[];
    ctx: Context;
  }
) {
  return protectedMutation({
    ...input,
    assertPermissions: () => assertIsUsers(input.ctx, input.user_id),
  });
}

export async function protectedUserOnlyFetch<T>(
  input: ProtectedFetchInputExtendable<T> & {
    user_id: string | string[];
    ctx: Context;
  }
) {
  return protectedFetch({
    ...input,
    assertPermissions: () => assertIsUsers(input.ctx, input.user_id),
  });
}

export async function protectedUserOnlyMutationFetchFirst<T, F>(
  input: ProtectedMutationFetchFirstInputExtendable<T, F> & {
    user_id: string;
    ctx: Context;
  }
) {
  return protectedMutationFetchFirst({
    ...input,
    assertPermissions: () => assertIsUsers(input.ctx, input.user_id),
  });
}
