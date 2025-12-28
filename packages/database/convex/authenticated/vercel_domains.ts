"use node";

import { Vercel } from "@vercel/sdk";
import { Effect, Schema } from "effect";
import { authenticatedAction } from "../client/confectAuthenticated";

const vercel = new Vercel({
	bearerToken: process.env.AUTH_BEARER_TOKEN_VERCEL,
});

const projectId = process.env.PROJECT_ID_VERCEL ?? "";
const teamId = process.env.TEAM_ID_VERCEL;

const ErrorSchemaParser = {
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

const checkDomainStatus = (domain: string): Effect.Effect<DomainStatus> =>
	Effect.gen(function* () {
		const [projectDomain, config] = yield* Effect.promise(() =>
			Promise.allSettled([
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
			]),
		);

		if (projectDomain.status === "rejected") {
			return {
				status: "Domain is not added" as const,
				dnsRecordsToSet: null,
			};
		}

		if (config.status === "rejected") {
			return {
				status: "Domain is not added" as const,
				dnsRecordsToSet: null,
			};
		}

		const verificationTxt = projectDomain.value.verification?.at(0)?.value;

		if (verificationTxt) {
			return {
				status: "Pending Verification" as const,
				dnsRecordsToSet: {
					name: "_vercel",
					type: "TXT" as const,
					value: verificationTxt,
				},
			};
		}

		if (config.value.misconfigured) {
			const isApex = projectDomain.value.apexName === domain;
			const dnsRecord: DNSRecord = isApex
				? {
						name: "@",
						type: "A" as const,
						value: "76.76.21.21",
					}
				: {
						name: projectDomain.value.name.replace(
							projectDomain.value.apexName,
							"",
						),
						type: "CNAME" as const,
						value: "cname.vercel-dns.com",
					};
			return {
				status: "Invalid Configuration" as const,
				dnsRecordsToSet: dnsRecord,
			};
		}

		return {
			status: "Valid Configuration" as const,
			dnsRecordsToSet: null,
		};
	});

const DNSRecordSchema = Schema.Struct({
	type: Schema.Union(
		Schema.Literal("CNAME"),
		Schema.Literal("TXT"),
		Schema.Literal("A"),
	),
	name: Schema.String,
	value: Schema.String,
	ttl: Schema.optional(Schema.String),
});

const DomainStatusSchema = Schema.Union(
	Schema.Struct({
		status: Schema.Union(
			Schema.Literal("Pending Verification"),
			Schema.Literal("Invalid Configuration"),
		),
		dnsRecordsToSet: DNSRecordSchema,
	}),
	Schema.Struct({
		status: Schema.Union(
			Schema.Literal("Domain is not added"),
			Schema.Literal("Valid Configuration"),
		),
		dnsRecordsToSet: Schema.Null,
	}),
);

export const getDomainStatus = authenticatedAction({
	args: Schema.Struct({ domain: Schema.String }),
	returns: DomainStatusSchema,
	handler: ({ domain }) => checkDomainStatus(domain),
});

export const addDomain = authenticatedAction({
	args: Schema.Struct({ domain: Schema.String }),
	returns: DomainStatusSchema,
	handler: ({ domain }) =>
		Effect.gen(function* () {
			yield* Effect.promise(() =>
				vercel.projects
					.addProjectDomain({
						idOrName: projectId,
						teamId,
						requestBody: {
							name: domain,
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
								const parsedError = ErrorSchemaParser.parse(errorBody);
								if (parsedError && parsedError.error.code === "not_found") {
									return null;
								}
							} catch (_parseError) {
								console.log("Failed to parse error:", _parseError);
							}
						}
						return null;
					}),
			);

			return yield* checkDomainStatus(domain);
		}),
});
