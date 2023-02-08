// @ts-check
import { client_env, client_schema } from "./schema.mjs";

const _client_env = client_schema.safeParse(client_env);

export const formatErrors = (
  /** @type {import('zod').ZodFormattedError<Map<string,string>,string>} */
  errors
) =>
  Object.entries(errors)
    // @ts-ignore
    .map(([name, value]) => {
      if (value && "_errors" in value) return `${name}: ${value._errors.join(", ")}\n`;
    })
    .filter(Boolean);

if (!_client_env.success) {
  console.error("❌ Invalid environment variables:\n", ...formatErrors(_client_env.error.format()));
  throw new Error("Invalid environment variables");
}

for (let key of Object.keys(_client_env.data)) {
  if (!key.startsWith("NEXT_PUBLIC_")) {
    console.warn("❌ Invalid public environment variable name:", key);

    throw new Error("Invalid public environment variable name");
  }
}

export const env = _client_env.data;
