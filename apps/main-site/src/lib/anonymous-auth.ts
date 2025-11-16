import { importJWK, type JWK, SignJWT } from "jose";

const ANONYMOUS_AUTH_PRIVATE_KEY = process.env.ANONYMOUS_AUTH_PRIVATE_KEY;
const ANONYMOUS_AUTH_KID = process.env.ANONYMOUS_AUTH_KID ?? "anonymous-key-1";
const ANONYMOUS_AUTH_DOMAIN =
	process.env.ANONYMOUS_AUTH_DOMAIN ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
const ANONYMOUS_AUTH_APPLICATION_ID = "anonymous";

let privateKeyPromise: Promise<CryptoKey> | null = null;

async function getPrivateKey(): Promise<CryptoKey> {
	if (!ANONYMOUS_AUTH_PRIVATE_KEY) {
		throw new Error("ANONYMOUS_AUTH_PRIVATE_KEY is not configured");
	}

	if (!privateKeyPromise) {
		privateKeyPromise = (async () => {
			const jwk: JWK = JSON.parse(ANONYMOUS_AUTH_PRIVATE_KEY);
			const key = await importJWK(jwk, "EdDSA");
			if (!(key instanceof CryptoKey)) {
				throw new Error("Expected CryptoKey for EdDSA algorithm");
			}
			return key;
		})();
	}

	return await privateKeyPromise;
}

export async function signAnonymousToken(sessionId: string): Promise<string> {
	const privateKey = await getPrivateKey();
	const now = Math.floor(Date.now() / 1000);
	const expiresIn = 60 * 15;

	const token = await new SignJWT({
		type: "anonymous",
	})
		.setProtectedHeader({
			alg: "EdDSA",
			kid: ANONYMOUS_AUTH_KID,
		})
		.setIssuedAt(now)
		.setIssuer(ANONYMOUS_AUTH_DOMAIN)
		.setSubject(sessionId)
		.setAudience(ANONYMOUS_AUTH_APPLICATION_ID)
		.setExpirationTime(now + expiresIn)
		.sign(privateKey);

	return token;
}

export async function getPublicJWK(): Promise<JWK> {
	if (!ANONYMOUS_AUTH_PRIVATE_KEY) {
		throw new Error("ANONYMOUS_AUTH_PRIVATE_KEY is not configured");
	}

	const jwk: JWK = JSON.parse(ANONYMOUS_AUTH_PRIVATE_KEY);
	if (!jwk.d) {
		throw new Error("Private key JWK must include private key component");
	}

	return {
		kty: jwk.kty,
		crv: jwk.crv,
		x: jwk.x,
		kid: ANONYMOUS_AUTH_KID,
		alg: "EdDSA",
		use: "sig",
	};
}

export function getJWKSUri(): string {
	return `${ANONYMOUS_AUTH_DOMAIN}/api/auth/anonymous-session/jwks`;
}

export function getOpenIDConfigUri(): string {
	return `${ANONYMOUS_AUTH_DOMAIN}/api/auth/anonymous-session/.well-known/openid-configuration`;
}
