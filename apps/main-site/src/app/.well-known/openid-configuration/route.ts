import { getJWKSUri } from "@/lib/anonymous-auth";
import { NextResponse } from "next/server";

const ANONYMOUS_AUTH_DOMAIN =
	process.env.ANONYMOUS_AUTH_DOMAIN ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";

export async function GET() {
	const issuer = ANONYMOUS_AUTH_DOMAIN;
	const jwksUri = getJWKSUri();

	return NextResponse.json({
		issuer,
		jwks_uri: jwksUri,
		response_types_supported: ["id_token"],
		subject_types_supported: ["public"],
		id_token_signing_alg_values_supported: ["EdDSA"],
	});
}
