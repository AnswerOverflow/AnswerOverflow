import { sharedEnvs } from '@answeroverflow/env/shared';

/* eslint-disable @typescript-eslint/restrict-template-expressions */
// TODO: Move these to zod validation
export type DomainVerificationStatusProps =
	| 'Valid Configuration'
	| 'Invalid Configuration'
	| 'Pending Verification'
	| 'Domain Not Found'
	| 'Unknown Error';

// From https://vercel.com/docs/rest-api/endpoints#get-a-project-domain
export interface DomainResponse {
	name: string;
	apexName: string;
	projectId: string;
	redirect?: string | null;
	redirectStatusCode?: (307 | 301 | 302 | 308) | null;
	gitBranch?: string | null;
	updatedAt?: number;
	createdAt?: number;
	/** `true` if the domain is verified for use with the project. If `false` it will not be used as an alias on this project until the challenge in `verification` is completed. */
	verified: boolean;
	/** A list of verification challenges, one of which must be completed to verify the domain for use on the project. After the challenge is complete `POST /projects/:idOrName/domains/:domain/verify` to verify the domain. Possible challenges: - If `verification.type = TXT` the `verification.domain` will be checked for a TXT record matching `verification.value`. */
	verification: {
		type: string;
		domain: string;
		value: string;
		reason: string;
	}[];
}
export type VercelDomainVerificationResponse = DomainResponse & {
	error: { code: string; message: string };
};
// From https://vercel.com/docs/rest-api/endpoints#get-a-domain-s-configuration
export interface DomainConfigResponse {
	/** How we see the domain's configuration. - `CNAME`: Domain has a CNAME pointing to Vercel. - `A`: Domain's A record is resolving to Vercel. - `http`: Domain is resolving to Vercel but may be behind a Proxy. - `null`: Domain is not resolving to Vercel. */
	configuredBy?: ('CNAME' | 'A' | 'http') | null;
	/** Which challenge types the domain can use for issuing certs. */
	acceptedChallenges?: ('dns-01' | 'http-01')[];
	/** Whether or not the domain is configured AND we can automatically generate a TLS certificate. */
	misconfigured: boolean;
}

// From https://vercel.com/docs/rest-api/endpoints#verify-project-domain
export interface DomainVerificationResponse {
	name: string;
	apexName: string;
	projectId: string;
	redirect?: string | null;
	redirectStatusCode?: (307 | 301 | 302 | 308) | null;
	gitBranch?: string | null;
	updatedAt?: number;
	createdAt?: number;
	/** `true` if the domain is verified for use with the project. If `false` it will not be used as an alias on this project until the challenge in `verification` is completed. */
	verified: boolean;
	/** A list of verification challenges, one of which must be completed to verify the domain for use on the project. After the challenge is complete `POST /projects/:idOrName/domains/:domain/verify` to verify the domain. Possible challenges: - If `verification.type = TXT` the `verification.domain` will be checked for a TXT record matching `verification.value`. */
	verification?: {
		type: string;
		domain: string;
		value: string;
		reason: string;
	}[];
}

export const addDomainToVercel = async (domain: string) => {
	return await fetch(
		`https://api.vercel.com/v9/projects/${sharedEnvs.PROJECT_ID_VERCEL}/domains?teamId=${sharedEnvs.TEAM_ID_VERCEL}`,
		{
			body: `{\n  "name": "${domain}"\n}`,
			headers: {
				Authorization: `Bearer ${sharedEnvs.AUTH_BEARER_TOKEN_VERCEL}`,
				'Content-Type': 'application/json',
			},
			method: 'POST',
		},
	).then((res) => res.json());
};

export const removeDomainFromVercelProject = async (domain: string) => {
	return await fetch(
		`https://api.vercel.com/v9/projects/${sharedEnvs.PROJECT_ID_VERCEL}/domains/${domain}?teamId=${sharedEnvs.TEAM_ID_VERCEL}`,
		{
			headers: {
				Authorization: `Bearer ${sharedEnvs.AUTH_BEARER_TOKEN_VERCEL}`,
			},
			method: 'DELETE',
		},
	).then((res) => res.json());
};

export const removeDomainFromVercelTeam = async (domain: string) => {
	return await fetch(
		`https://api.vercel.com/v6/domains/${domain}?teamId=${sharedEnvs.TEAM_ID_VERCEL}`,
		{
			headers: {
				Authorization: `Bearer ${sharedEnvs.AUTH_BEARER_TOKEN_VERCEL}`,
			},
			method: 'DELETE',
		},
	).then((res) => res.json());
};

export const getDomainResponse = async (
	domain: string,
): Promise<VercelDomainVerificationResponse> => {
	// @ts-ignore
	return await fetch(
		`https://api.vercel.com/v9/projects/${sharedEnvs.PROJECT_ID_VERCEL}/domains/${domain}?teamId=${sharedEnvs.TEAM_ID_VERCEL}`,
		{
			method: 'GET',
			headers: {
				Authorization: `Bearer ${sharedEnvs.AUTH_BEARER_TOKEN_VERCEL}`,
				'Content-Type': 'application/json',
			},
		},
	).then((res) => {
		return res.json();
	});
};

export const getConfigResponse = async ({
	domain,
}: {
	domain: string;
}): Promise<DomainConfigResponse> => {
	// @ts-ignore
	return await fetch(
		`https://api.vercel.com/v6/domains/${domain}/config?teamId=${sharedEnvs.TEAM_ID_VERCEL}`,
		{
			method: 'GET',
			headers: {
				Authorization: `Bearer ${sharedEnvs.AUTH_BEARER_TOKEN_VERCEL}`,
				'Content-Type': 'application/json',
			},
		},
	).then((res) => res.json());
};

export const verifyDomain = async (
	domain: string,
): Promise<DomainVerificationResponse> => {
	// @ts-ignore
	return await fetch(
		`https://api.vercel.com/v9/projects/${sharedEnvs.PROJECT_ID_VERCEL}/domains/${domain}/verify?teamId=${sharedEnvs.TEAM_ID_VERCEL}`,
		{
			method: 'POST',
			headers: {
				Authorization: `Bearer ${sharedEnvs.AUTH_BEARER_TOKEN_VERCEL}`,
				'Content-Type': 'application/json',
			},
		},
	).then((res) => res.json());
};

export const getSubdomain = (name: string, apexName: string) => {
	if (name === apexName) return null;
	return name.slice(0, name.length - apexName.length - 1);
};

export const getApexDomain = (url: string) => {
	let domain;
	try {
		domain = new URL(url).hostname;
	} catch (e) {
		return '';
	}
	const parts = domain.split('.');
	if (parts.length > 2) {
		// if it's a subdomain (e.g. dub.vercel.app), return the last 2 parts
		return parts.slice(-2).join('.');
	}
	// if it's a normal domain (e.g. dub.sh), we return the domain
	return domain;
};

// courtesy of ChatGPT: https://sharegpt.com/c/pUYXtRs
export const validDomainRegex = new RegExp(
	/^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/,
);
