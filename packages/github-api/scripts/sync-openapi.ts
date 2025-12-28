#!/usr/bin/env bun

/**
 * Sync script to fetch the latest GitHub REST API OpenAPI specification
 * from GitHub's official repository and create a minimal subset for our needs.
 *
 * The full GitHub API spec is massive (~15MB), so we extract only the endpoints
 * we actually use:
 * - Apps: listInstallationsForAuthenticatedUser, listInstallationReposForAuthenticatedUser
 * - Issues: create
 * - OAuth: token refresh (manually defined since it's not in the REST API spec)
 */

const GITHUB_OPENAPI_URL =
	"https://raw.githubusercontent.com/github/rest-api-description/main/descriptions/api.github.com/api.github.com.json";
const OUTPUT_FILE = "./open-api.json";

const PATHS_TO_KEEP = [
	"/user/installations",
	"/user/installations/{installation_id}/repositories",
	"/repos/{owner}/{repo}/issues",
];

const collectRefs = (
	obj: unknown,
	schemaRefs: Set<string>,
	parameterRefs: Set<string>,
	responseRefs: Set<string>,
	headerRefs: Set<string>,
) => {
	if (obj === null || obj === undefined) return;

	if (typeof obj === "object") {
		if (Array.isArray(obj)) {
			for (const item of obj) {
				collectRefs(item, schemaRefs, parameterRefs, responseRefs, headerRefs);
			}
		} else {
			const record = obj as Record<string, unknown>;
			if (record.$ref && typeof record.$ref === "string") {
				const schemaMatch = record.$ref.match(/#\/components\/schemas\/(.+)/);
				if (schemaMatch?.[1]) schemaRefs.add(schemaMatch[1]);

				const paramMatch = record.$ref.match(/#\/components\/parameters\/(.+)/);
				if (paramMatch?.[1]) parameterRefs.add(paramMatch[1]);

				const responseMatch = record.$ref.match(
					/#\/components\/responses\/(.+)/,
				);
				if (responseMatch?.[1]) responseRefs.add(responseMatch[1]);

				const headerMatch = record.$ref.match(/#\/components\/headers\/(.+)/);
				if (headerMatch?.[1]) headerRefs.add(headerMatch[1]);
			}
			for (const value of Object.values(record)) {
				collectRefs(value, schemaRefs, parameterRefs, responseRefs, headerRefs);
			}
		}
	}
};

const extractMinimalSpec = (
	fullSpec: Record<string, unknown>,
): Record<string, unknown> => {
	const paths: Record<string, unknown> = {};
	const usedSchemas = new Set<string>();
	const usedParameters = new Set<string>();
	const usedResponses = new Set<string>();
	const usedHeaders = new Set<string>();

	const fullPaths = fullSpec.paths as Record<string, unknown>;
	const fullComponents = fullSpec.components as Record<string, unknown>;
	const fullSchemas = (fullComponents?.schemas ?? {}) as Record<
		string,
		unknown
	>;
	const fullParameters = (fullComponents?.parameters ?? {}) as Record<
		string,
		unknown
	>;
	const fullResponses = (fullComponents?.responses ?? {}) as Record<
		string,
		unknown
	>;
	const fullHeaders = (fullComponents?.headers ?? {}) as Record<
		string,
		unknown
	>;

	for (const pathKey of PATHS_TO_KEEP) {
		if (fullPaths[pathKey]) {
			paths[pathKey] = fullPaths[pathKey];
			collectRefs(
				fullPaths[pathKey],
				usedSchemas,
				usedParameters,
				usedResponses,
				usedHeaders,
			);
		}
	}

	const schemas: Record<string, unknown> = {};
	const parameters: Record<string, unknown> = {};
	const responses: Record<string, unknown> = {};
	const headers: Record<string, unknown> = {};

	const resolveAllRefs = () => {
		let changed = true;
		while (changed) {
			changed = false;
			const currentSchemas = [...usedSchemas];
			const currentParams = [...usedParameters];
			const currentResponses = [...usedResponses];
			const currentHeaders = [...usedHeaders];

			for (const name of currentSchemas) {
				if (!schemas[name] && fullSchemas[name]) {
					schemas[name] = fullSchemas[name];
					collectRefs(
						fullSchemas[name],
						usedSchemas,
						usedParameters,
						usedResponses,
						usedHeaders,
					);
					changed = true;
				}
			}

			for (const name of currentParams) {
				if (!parameters[name] && fullParameters[name]) {
					parameters[name] = fullParameters[name];
					collectRefs(
						fullParameters[name],
						usedSchemas,
						usedParameters,
						usedResponses,
						usedHeaders,
					);
					changed = true;
				}
			}

			for (const name of currentResponses) {
				if (!responses[name] && fullResponses[name]) {
					responses[name] = fullResponses[name];
					collectRefs(
						fullResponses[name],
						usedSchemas,
						usedParameters,
						usedResponses,
						usedHeaders,
					);
					changed = true;
				}
			}

			for (const name of currentHeaders) {
				if (!headers[name] && fullHeaders[name]) {
					headers[name] = fullHeaders[name];
					collectRefs(
						fullHeaders[name],
						usedSchemas,
						usedParameters,
						usedResponses,
						usedHeaders,
					);
					changed = true;
				}
			}
		}
	};

	resolveAllRefs();

	return {
		openapi: fullSpec.openapi,
		info: {
			title: "GitHub REST API (Minimal)",
			description: "Minimal subset of GitHub REST API for AnswerOverflow",
			version: (fullSpec.info as Record<string, unknown>)?.version ?? "1.0.0",
		},
		servers: fullSpec.servers,
		paths,
		components: {
			schemas,
			parameters,
			responses,
			headers,
			securitySchemes: fullComponents?.securitySchemes ?? {},
		},
	};
};

async function syncOpenApiSpec() {
	console.log(`Fetching GitHub OpenAPI spec from ${GITHUB_OPENAPI_URL}...`);
	console.log("(This is a large file ~15MB, may take a moment)");

	try {
		const response = await fetch(GITHUB_OPENAPI_URL);
		if (!response.ok) {
			throw new Error(
				`Failed to fetch OpenAPI spec: ${response.status} ${response.statusText}`,
			);
		}

		const fullSpec = await response.json();
		console.log("✅ Fetched full spec");

		console.log("📦 Extracting minimal subset...");
		const minimalSpec = extractMinimalSpec(fullSpec as Record<string, unknown>);

		const specString = JSON.stringify(minimalSpec, null, 2);
		console.log(
			`📝 Minimal spec size: ${(specString.length / 1024).toFixed(1)}KB`,
		);

		await Bun.write(OUTPUT_FILE, specString);

		console.log(`✅ Successfully updated ${OUTPUT_FILE}`);
		console.log(
			`📝 Next step: Run 'bun run gen' to regenerate the TypeScript types`,
		);
	} catch (error) {
		console.error("❌ Error syncing OpenAPI spec:", error);
		process.exit(1);
	}
}

syncOpenApiSpec();
