import { NextResponse } from "next/server";

import { getJWKSUri } from "../../../lib/anonymous-auth";

const ANONYMOUS_AUTH_DOMAIN = process.env.ANONYMOUS_AUTH_DOMAIN ?? "";

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
