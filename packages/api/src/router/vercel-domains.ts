import { sharedEnvs } from '@answeroverflow/env/shared';

// Vercel API is wrapped in a namespace to keep this file focused on addDomain and getDomainStatus
namespace VercelAPI {
	const VERCEL_PROJECT_ID = sharedEnvs.PROJECT_ID_VERCEL;
	const VERCEL_TEAM_ID = sharedEnvs.TEAM_ID_VERCEL;
	const VERCEL_AUTH_TOKEN = sharedEnvs.AUTH_BEARER_TOKEN_VERCEL;

	type DomainResponse = {
		name: string;
		apexName: string;
		projectId: string;
		verified: boolean;
		verification: {
			value: string;
			type: string;
			domain: string;
			reason: string;
		}[];
		redirect?: string;
		redirectStatusCode?: 307 | 301 | 302 | 308;
		gitBranch?: string;
		updatedAt?: number;
		createdAt?: number;
	};

	interface DomainConfigResponse {
		configuredBy?: ('CNAME' | 'A' | 'http') | null;
		acceptedChallenges?: ('dns-01' | 'http-01')[];
		misconfigured: boolean;
	}

	function callVercelApi(path: string, options: RequestInit) {
		return fetch(
			`https://api.vercel.com/${path}${VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : ''}`,
			{
				...options,
				headers: {
					Authorization: `Bearer ${VERCEL_AUTH_TOKEN}`,
					...options.headers,
				},
			},
		);
	}

	// https://vercel.com/docs/rest-api/endpoints/domains#domains
	export const getDomainResponse = async (
		domain: string,
	): Promise<DomainResponse & { error: { code: string; message: string } }> => {
		return await callVercelApi(
			`v9/projects/${VERCEL_PROJECT_ID}/domains/${domain}`,
			{
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
				},
			},
		).then((res) => {
			return res.json() as Promise<
				DomainResponse & { error: { code: string; message: string } }
			>;
		});
	};

	export const addDomainToVercel = async (domain: string) => {
		return await callVercelApi(`v10/projects/${VERCEL_PROJECT_ID}/domains`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				name: domain,
				// Optional: Redirect www. to root domain
				// ...(domain.startsWith("www.") && {
				//   redirect: domain.replace("www.", ""),
				// }),
			}),
		}).then((res) => res.json());
	};

	export const getConfigResponse = async (
		domain: string,
	): Promise<DomainConfigResponse> => {
		return await callVercelApi(`v6/domains/${domain}/config`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
			},
		}).then((res) => res.json() as Promise<DomainConfigResponse>);
	};

	export const verifyDomain = async (
		domain: string,
	): Promise<DomainResponse> => {
		return await callVercelApi(
			`v9/projects/${VERCEL_PROJECT_ID}/domains/${domain}/verify`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
			},
		).then((res) => res.json() as Promise<DomainResponse>);
	};
}

export const addDomain = async (unsafeDomain: string) => {
	const domain = new URL(`https://${unsafeDomain}`).hostname;
	if (domain.includes('vercel.pub')) {
		return {
			error: 'Cannot use vercel.pub subdomain as your custom domain',
		};
	}

	// TODO: handle case where domain is added to another project
	await Promise.all([
		VercelAPI.addDomainToVercel(domain),
		// Optional: add www subdomain as well and redirect to apex domain
		// addDomainToVercel(`www.${value}`),
	]);
	return;
};

export async function getDomainStatus(unsafeDomain: string) {
	const domain = new URL(`https://${unsafeDomain}`).hostname;
	let status = 'Valid Configuration';

	const [domainJson, configJson] = await Promise.all([
		VercelAPI.getDomainResponse(domain),
		VercelAPI.getConfigResponse(domain),
	]);

	if (domainJson?.error?.code === 'not_found') {
		// domain not found on Vercel project
		status = 'Domain Not Found';

		// unknown error
	} else if (domainJson.error) {
		status = 'Unknown Error';

		// if domain is not verified, we try to verify now
	} else if (!domainJson.verified) {
		status = 'Pending Verification';
		const verificationJson = await VercelAPI.verifyDomain(domain);

		// domain was just verified
		if (verificationJson?.verified) {
			status = 'Valid Configuration';
		}
	} else if (configJson.misconfigured) {
		status = 'Invalid Configuration';
	} else {
		status = 'Valid Configuration';
	}

	return {
		status,
		domainJson,
	};
}
