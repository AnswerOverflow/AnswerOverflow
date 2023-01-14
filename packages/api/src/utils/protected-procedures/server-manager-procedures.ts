import type { Context } from "~api/router/context";
import { assertCanEditServers } from "../permissions";
import {
  protectedFetch,
  ProtectedFetchInputExtendable,
  protectedMutation,
  protectedMutationFetchFirst,
  ProtectedMutationFetchFirstInputExtendable,
  ProtectedMutationInputExtendable,
} from "./base";

type ServerManagerProtectedFetch<T> = ProtectedFetchInputExtendable<T> & {
  getServerId: (data: T) => string | string[];
  ctx: Context;
};
export async function protectedServerManagerFetch<T>(input: ServerManagerProtectedFetch<T>) {
  return protectedFetch({
    ...input,
    assertPermissions: (data) => assertCanEditServers(input.ctx, input.getServerId(data)),
  });
}

type ServerManagerProtectedMutation<T> = ProtectedMutationInputExtendable<T> & {
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
  input: ProtectedMutationFetchFirstInputExtendable<T, F> & {
    ctx: Context;
    getServerId: (data: T) => string | string[];
  }
) {
  return protectedMutationFetchFirst({
    ...input,
    assertPermissions(data) {
      assertCanEditServers(input.ctx, input.getServerId(data));
    },
  });
}
