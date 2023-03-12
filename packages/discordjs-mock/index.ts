export * from "./src/channel-mock";
export * from "./src/message-mock";
export * from "./src/client-mock";
export * from "./src/guild-mock";
export * from "./src/interaction-mock";
export * from "./src/user-mock";
export * from "./src/helpers";
export * from "./src/scenarios";

declare global {
	namespace NodeJS {
		interface ProcessEnv {
			/* Discord Bot */
			// eslint-disable-next-line @typescript-eslint/naming-convention
			DEFAULT_DELAY_IN_MS: string | undefined;
		}
	}
}
