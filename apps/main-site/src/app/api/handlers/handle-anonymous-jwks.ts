import type { Context } from "hono";
import { getPublicJWK } from "../../../lib/anonymous-auth";

export async function handleAnonymousJWKS(c: Context) {
	try {
		const publicKey = await getPublicJWK();
		return c.json({
			keys: [publicKey],
		});
	} catch (error) {
		return c.json(
			{ error: "Failed to generate JWKS", message: String(error) },
			500,
		);
	}
}
