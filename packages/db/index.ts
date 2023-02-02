import type { Channel } from "@prisma/client";
export * from "@prisma/client";
export * from "./src/utils";
export * from "./src/default";
export * from "./src/utils/bitfield";
export * from "./src/zod-schemas";
export type Thread = Channel & { parent_id: string };
