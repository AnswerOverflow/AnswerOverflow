export { authOptions } from "./src/auth-options";
export { getServerSession } from "./src/get-session";
export * from "./src/discord-oauth";
export type { Session } from "next-auth";

declare global {
  // eslint-disable-next-line no-unused-vars
  namespace NodeJS {
    // eslint-disable-next-line no-unused-vars
    interface ProcessEnv {
      /* Discord Oauth */
      DISCORD_CLIENT_ID: string;
      VITE_DISCORD_CLIENT_ID: string;
      DISCORD_CLIENT_SECRET: string;
    }
  }
}
