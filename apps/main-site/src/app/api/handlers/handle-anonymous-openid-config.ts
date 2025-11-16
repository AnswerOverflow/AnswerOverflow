import { getJWKSUri, getOpenIDConfigUri } from "@/lib/anonymous-auth";
import type { Context } from "hono";

export async function handleAnonymousOpenIDConfig(c: Context) {
	const issuer =
		process.env.ANONYMOUS_AUTH_DOMAIN ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
	const jwksUri = getJWKSUri();

	return c.json({
		issuer,
		jwks_uri: jwksUri,
		response_types_supported: ["id_token"],
		subject_types_supported: ["public"],
		id_token_signing_alg_values_supported: ["EdDSA"],
	});
}
