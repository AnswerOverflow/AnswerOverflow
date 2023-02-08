import { Client, ClientEvents, PermissionFlagsBits, PermissionResolvable } from "discord.js";

// Bit of a hack of a helper function to give async tasks that aren't tracked time to run. A better approach would be to listen to dispatched events
export async function delay(time_in_ms?: number) {
  if (!time_in_ms)
    time_in_ms = process.env.DEFAULT_DELAY_IN_MS ? parseInt(process.env.DEFAULT_DELAY_IN_MS) : 500;
  await new Promise((resolve) => setTimeout(resolve, time_in_ms));
}

export async function emitEvent<E extends keyof ClientEvents>(
  client: Client,
  event: E,
  ...args: ClientEvents[E]
) {
  const status = client.emit(event, ...args);
  await delay();
  return status;
}

export function overrideVariables<T extends {}>(obj: T, overrides: {}) {
  Object.assign(obj, overrides);
}

export function copyClass<T extends { client: Client }>(
  obj: T,
  client: Client,
  overrides: {} = {}
) {
  const created = Object.assign(
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    Object.create(Object.getPrototypeOf(obj)),
    obj
  ) as T;
  overrideVariables(created, { client, ...overrides });
  return created;
}

export type PermissionVariantsTest = {
  permissionsThatShouldWork: PermissionResolvable[];
  operation: (
    permission: PermissionResolvable,
    is_permission_allowed: boolean
  ) => Promise<void> | void;
};

export async function testAllPermissions({
  permissionsThatShouldWork,
  operation,
}: PermissionVariantsTest) {
  // Possibly swap to Promise.All - going in parallel break things sometimes
  for await (const permission of Object.keys(PermissionFlagsBits)) {
    const permission_is_allowed = permissionsThatShouldWork.includes(
      permission as PermissionResolvable
    );
    await operation(permission as PermissionResolvable, permission_is_allowed);
  }
}
