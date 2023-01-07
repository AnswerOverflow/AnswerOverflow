import type { Client, ClientEvents } from "discord.js";

// Bit of a hack of a helper function to give async tasks that aren't tracked time to run. A better approach would be to listen to dispatched events
export async function delay(timeout: number = 100) {
  await new Promise((resolve) => setTimeout(resolve, timeout));
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

export function copyClass<T>(obj: T) {
  return Object.assign(
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    Object.create(Object.getPrototypeOf(obj)),
    obj
  ) as T;
}
