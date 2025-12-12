"use node";

import { Vercel } from "@vercel/sdk";
import { v } from "convex/values";
import { authenticatedAction } from "../client";

const vercel = new Vercel({
	bearerToken: process.env.AUTH_BEARER_TOKEN_VERCEL,
});

const projectId = process.env.PROJECT_ID_VERCEL ?? "";
const teamId = process.env.TEAM_ID_VERCEL;

const ErrorSchema = {
	parse: (
		data: unknown,
	): { error: { code: string; message: string } } | null => {
		if (
			typeof data === "object" &&
			data !== null &&
			"error" in data &&
			typeof data.error === "object" &&
			data.error !== null &&
			"code" in data.error &&
			"message" in data.error &&
			typeof data.error.code === "string" &&
			typeof data.error.message === "string"
		) {
			return data as { error: { code: string; message: string } };
		}
		return null;
	},
};

export type DNSRecord = {
	type: "CNAME" | "TXT" | "A";
	name: string;
	value: string;
	ttl?: string;
};

export type DomainStatus =
	| {
			status: "Pending Verification" | "Invalid Configuration";
			dnsRecordsToSet: DNSRecord;
	  }
	| {
			status: "Domain is not added" | "Valid Configuration";
			dnsRecordsToSet: null;
	  };

async function checkDomainStatus(domain: string): Promise<DomainStatus> {
	const [projectDomain, config] = await Promise.allSettled([
		vercel.projects.getProjectDomain({
			idOrName: projectId,
			teamId,
			domain,
		}),
		vercel.domains.getDomainConfig({
			teamId,
			domain,
		}),
		vercel.projects.verifyProjectDomain({
			idOrName: projectId,
			teamId,
			domain,
		}),
	]);

	if (projectDomain.status === "rejected") {
		return {
			status: "Domain is not added",
			dnsRecordsToSet: null,
		};
	}

	if (config.status === "rejected") {
		return {
			status: "Domain is not added",
			dnsRecordsToSet: null,
		};
	}

	const verificationTxt = projectDomain.value.verification?.at(0)?.value;

	if (verificationTxt) {
		return {
			status: "Pending Verification",
			dnsRecordsToSet: {
				name: "_vercel",
				type: "TXT",
				value: verificationTxt,
			},
		};
	}

	if (config.value.misconfigured) {
		const isApex = projectDomain.value.apexName === domain;
		const dnsRecord: DNSRecord = isApex
			? {
					name: "@",
					type: "A",
					value: "76.76.21.21",
				}
			: {
					name: projectDomain.value.name.replace(
						projectDomain.value.apexName,
						"",
					),
					type: "CNAME",
					value: "cname.vercel-dns.com",
				};
		return {
			status: "Invalid Configuration",
			dnsRecordsToSet: dnsRecord,
		};
	}

	return {
		status: "Valid Configuration",
		dnsRecordsToSet: null,
	};
}

export const getDomainStatus = authenticatedAction({
	args: { domain: v.string() },
	handler: async (_ctx, args) => {
		return checkDomainStatus(args.domain);
	},
});

export const addDomain = authenticatedAction({
	args: { domain: v.string() },
	handler: async (_ctx, args) => {
		await vercel.projects
			.addProjectDomain({
				idOrName: projectId,
				teamId,
				requestBody: {
					name: args.domain,
				},
			})
			.catch((error) => {
				console.log("Error adding domain", error);
				if ("body" in error) {
					try {
						const errorBody =
							typeof error.body === "string"
								? JSON.parse(error.body)
								: error.body;
						const parsedError = ErrorSchema.parse(errorBody);
						if (parsedError && parsedError.error.code === "not_found") {
							return null;
						}
					} catch (_parseError) {
						console.log("Failed to parse error:", _parseError);
					}
				}
				return null;
			});

		const status = await checkDomainStatus(args.domain);
		return status;
	},
});
