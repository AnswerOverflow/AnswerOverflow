export * from "@prisma/client";
export { prisma } from "./src/prisma";
export * from "./src/bitfield";
export * from "./src/zod-schemas";
export * from "./src/default";

declare global {
	namespace NodeJS {
		interface ProcessEnv {
			/* Prisma */
			// eslint-disable-next-line @typescript-eslint/naming-convention
			DATABASE_URL: string;

			// common
			// eslint-disable-next-line @typescript-eslint/naming-convention
			readonly NODE_ENV: "development" | "production" | "test";
		}
	}
}
