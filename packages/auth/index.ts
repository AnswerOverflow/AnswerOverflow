export { authOptions } from "./src/auth-options";
export { getServerSession } from "./src/get-session";
export * from "./src/discord-oauth";
export type { Session } from "next-auth";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      /* Discord Oauth */
      DISCORD_CLIENT_ID: string;
      VITE_DISCORD_CLIENT_ID: string;
      DISCORD_CLIENT_SECRET: string;
    }
  }
}
