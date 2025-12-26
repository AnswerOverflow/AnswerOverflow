export * from "./client";
export * from "./server";

import type { ClientEvents } from "./client";
import type { ServerEvents } from "./server";

export type AllEvents = ClientEvents & ServerEvents;
export type EventName = keyof AllEvents;
