import type { Context } from "~api/router/context";
import { assertCanEditServers } from "../permissions";
import {
  protectedFetch,
  ProtectedFetchInput,
  protectedMutation,
  protectedMutationFetchFirst,
  ProtectedMutationFetchFirstInput,
  ProtectedMutationInput,
} from "./base";

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
  input: Omit<ProtectedMutationFetchFirstInput<T, F>, "assertPermissions"> & {
    ctx: Context;
    // eslint-disable-next-line no-unused-vars
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
