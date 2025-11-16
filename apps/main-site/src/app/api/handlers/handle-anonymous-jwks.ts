import { getPublicJWK, getJWKSUri } from "@/lib/anonymous-auth";
import type { Context } from "hono";

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
