// @ts-check
/**
 * This file is included in `/next.config.mjs` which ensures the app isn't built with invalid env vars.
 * It has to be a `.mjs`-file to be imported there.
 */
import { server_schema } from "./schema.mjs";
import { env as clientEnv, formatErrors } from "./client.mjs";

const _server_env = server_schema.safeParse(process.env);

if (!_server_env.success) {
  console.error("❌ Invalid environment variables:\n", ...formatErrors(_server_env.error.format()));
  throw new Error("Invalid environment variables");
}

for (let key of Object.keys(_server_env.data)) {
  if (key.startsWith("NEXT_PUBLIC_")) {
    console.warn("❌ You are exposing a server-side env-variable:", key);

    throw new Error("You are exposing a server-side env-variable");
  }
}

export const env = { ..._server_env.data, ...clientEnv };
