import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

type ConvexFunctionSpec = {
	identifier?: string;
	functionType?: "Query" | "Mutation" | "Action" | "HttpAction";
	visibility?: { kind?: "public" | "internal" };
	args?: unknown;
	returns?: unknown;
};

type ConvexFunctionResponse = {
	status: "success" | "error";
	value?: unknown;
	logLines?: unknown[];
	errorMessage?: string;
	errorData?: unknown;
};

type ConvexCredentials = {
	deploymentUrl: string;
	adminKey: string;
	deploymentName: string | null;
	deploymentType: string;
};

const convexArgsSchema = z
	.record(z.string(), z.unknown())
	.default({})
	.optional()
	.describe(
		"Convex-encoded JSON arguments. Use Convex JSON markers such as {$integer: base64} for int64 values.",
	);

function toolResponse(value: unknown) {
	return {
		content: [
			{
				type: "text" as const,
				text: JSON.stringify(value, null, 2),
			},
		],
	};
}

function getConvexCredentials(): ConvexCredentials {
	const deploymentUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
	const adminKey = process.env.CONVEX_DEPLOY_KEY;

	if (!deploymentUrl || !adminKey) {
		throw new Error(
			"Convex internal debugging requires NEXT_PUBLIC_CONVEX_URL and CONVEX_DEPLOY_KEY",
		);
	}

	const url = new URL(deploymentUrl);
	if (url.protocol !== "https:" && url.protocol !== "http:") {
		throw new Error("Convex deployment URL must use HTTP or HTTPS");
	}

	const keyPrefix = adminKey.split("|", 1)[0] ?? "";
	const [deploymentType = "prod", deploymentName] = keyPrefix.split(":");

	return {
		deploymentUrl: url.toString().replace(/\/$/, ""),
		adminKey,
		deploymentName: deploymentName || null,
		deploymentType,
	};
}

async function convexFetch(path: string, init: RequestInit = {}) {
	const { deploymentUrl, adminKey } = getConvexCredentials();
	const headers = new Headers(init.headers);
	headers.set("Authorization", `Convex ${adminKey}`);
	if (!headers.has("Content-Type")) {
		headers.set("Content-Type", "application/json");
	}
	headers.set("Convex-Client", "answer-overflow-internal-debugging");

	const response = await fetch(new URL(path, deploymentUrl), {
		...init,
		headers,
		cache: "no-store",
	});

	if (!response.ok) {
		const body = await response.text();
		throw new Error(`Convex HTTP ${response.status}: ${body.slice(0, 2000)}`);
	}

	return response;
}

function normalizeFunctionName(functionName: string): string {
	if (functionName.startsWith("api.") || functionName.startsWith("internal.")) {
		const parts = functionName.split(".");
		if (parts.length < 3) {
			throw new Error(`Invalid Convex function name: ${functionName}`);
		}
		const exportName = parts.pop();
		return `${parts.slice(1).join("/")}:${exportName}`;
	}

	const withoutPrefix = functionName.replace(/^convex\//, "");
	const [filePath = "", exportName = "default"] = withoutPrefix.split(":", 2);
	const normalizedPath = filePath.replace(
		/\.(?:ts|js|tsx|jsx|mts|mjs|cts|cjs)$/,
		"",
	);
	return `${normalizedPath}:${exportName}`;
}

async function runConvexFunction(
	functionName: string,
	args: Record<string, unknown>,
	componentPath?: string,
) {
	const normalizedFunctionName = normalizeFunctionName(functionName);
	const response = await convexFetch("/api/function", {
		method: "POST",
		body: JSON.stringify({
			path: normalizedFunctionName,
			componentPath,
			format: "convex_encoded_json",
			args,
		}),
	});
	const result = (await response.json()) as ConvexFunctionResponse;

	if (result.status !== "success") {
		throw new Error(
			`Convex function ${normalizedFunctionName} failed: ${result.errorMessage ?? JSON.stringify(result)}`,
		);
	}

	return {
		functionName: normalizedFunctionName,
		result: result.value,
		logLines: result.logLines ?? [],
	};
}

async function runConvexQuery(
	functionName: string,
	args: Record<string, unknown>,
	componentPath?: string,
) {
	const normalizedFunctionName = normalizeFunctionName(functionName);
	const response = await convexFetch("/api/query", {
		method: "POST",
		body: JSON.stringify({
			path: normalizedFunctionName,
			componentPath,
			format: "convex_encoded_json",
			args: [args],
		}),
	});
	const result = (await response.json()) as ConvexFunctionResponse;

	if (result.status !== "success") {
		throw new Error(
			`Convex query ${normalizedFunctionName} failed: ${result.errorMessage ?? JSON.stringify(result)}`,
		);
	}

	return {
		functionName: normalizedFunctionName,
		result: result.value,
		logLines: result.logLines ?? [],
	};
}

async function getFunctionSpec(): Promise<ConvexFunctionSpec[]> {
	const response = await runConvexQuery("_system/cli/modules:apiSpec", {});
	if (!Array.isArray(response.result)) {
		throw new Error("Convex returned an invalid function specification");
	}
	return response.result as ConvexFunctionSpec[];
}

async function getFunctionMetadata(functionName: string) {
	const normalized = normalizeFunctionName(functionName);
	const functions = await getFunctionSpec();
	return functions.find(
		(fn) =>
			typeof fn.identifier === "string" &&
			normalizeFunctionName(fn.identifier) === normalized,
	);
}

async function runReadOnlyFunction(
	functionName: string,
	args: Record<string, unknown>,
	componentPath?: string,
) {
	const metadata = await getFunctionMetadata(functionName);
	if (!metadata) {
		throw new Error(`Unknown Convex function: ${functionName}`);
	}
	if (metadata.functionType !== "Query") {
		throw new Error(
			`${functionName} is a ${metadata.functionType ?? "non-query"} function; use convex_run_function for mutating operations`,
		);
	}
	return runConvexQuery(functionName, args, componentPath);
}

async function listTables() {
	const [schemaResponse, shapesResponse] = await Promise.all([
		runConvexQuery("_system/frontend/getSchemas", {}),
		convexFetch("/api/shapes2").then((response) => response.json()),
	]);

	const schemaByTable = new Map<string, unknown>();
	const schemaResult = schemaResponse.result as {
		active?: string | null;
	} | null;
	if (schemaResult?.active) {
		const activeSchema = JSON.parse(schemaResult.active) as {
			tables?: Array<{ tableName?: string }>;
		};
		for (const table of activeSchema.tables ?? []) {
			if (table.tableName) schemaByTable.set(table.tableName, table);
		}
	}

	const shapes = shapesResponse as Record<string, unknown>;
	const tableNames = Array.from(
		new Set([...schemaByTable.keys(), ...Object.keys(shapes)]),
	).sort();

	return {
		tables: Object.fromEntries(
			tableNames.map((tableName) => [
				tableName,
				{
					schema: schemaByTable.get(tableName) ?? null,
					inferredSchema: shapes[tableName] ?? null,
				},
			]),
		),
	};
}

async function runOneOffQuery(query: string) {
	const { adminKey } = getConvexCredentials();
	const response = await convexFetch("/api/run_test_function", {
		method: "POST",
		body: JSON.stringify({
			adminKey,
			args: {},
			bundle: { path: "internalDebugQuery.js", source: query },
			format: "convex_encoded_json",
		}),
	});
	const result = (await response.json()) as ConvexFunctionResponse;
	if (result.status !== "success") {
		throw new Error(
			`Convex one-off query failed: ${result.errorMessage ?? JSON.stringify(result)}`,
		);
	}
	return { result: result.value, logLines: result.logLines ?? [] };
}

async function listEnvironmentVariables(includeValues: boolean) {
	const response = await runConvexQuery(
		"_system/cli/queryEnvironmentVariables",
		{},
	);
	const variables = Array.isArray(response.result) ? response.result : [];
	return {
		variables: variables.map((variable) => {
			const entry = variable as { name?: string; value?: string };
			return includeValues
				? { name: entry.name, value: entry.value }
				: { name: entry.name };
		}),
	};
}

/** Registers generic Convex deployment and dashboard tools. */
export function registerConvexDebugTools(server: McpServer) {
	server.registerTool(
		"convex_deployment_status",
		{
			title: "Convex Deployment Status",
			description:
				"Describe the configured Convex deployment without returning its admin credential.",
			annotations: { readOnlyHint: true, openWorldHint: false },
		},
		async () => {
			const credentials = getConvexCredentials();
			return toolResponse({
				deploymentUrl: credentials.deploymentUrl,
				deploymentName: credentials.deploymentName,
				deploymentType: credentials.deploymentType,
				dashboardUrl: credentials.deploymentName
					? `https://dashboard.convex.dev/d/${credentials.deploymentName}`
					: null,
			});
		},
	);

	server.registerTool(
		"convex_function_spec",
		{
			title: "Convex Function Specification",
			description:
				"Discover live Convex functions and their argument, return, visibility, and operation metadata.",
			inputSchema: {
				search: z.string().max(500).optional(),
				functionTypes: z
					.array(z.enum(["Query", "Mutation", "Action", "HttpAction"]))
					.optional(),
				visibility: z.enum(["public", "internal"]).optional(),
				limit: z.number().int().min(1).max(2000).default(500).optional(),
			},
			annotations: { readOnlyHint: true, openWorldHint: false },
		},
		async ({ search, functionTypes, visibility, limit }) => {
			const functions = await getFunctionSpec();
			const normalizedSearch = search?.toLowerCase();
			const filtered = functions.filter(
				(fn) =>
					(!normalizedSearch ||
						JSON.stringify(fn).toLowerCase().includes(normalizedSearch)) &&
					(!functionTypes?.length ||
						(fn.functionType && functionTypes.includes(fn.functionType))) &&
					(!visibility || fn.visibility?.kind === visibility),
			);
			return toolResponse({
				totalFunctions: functions.length,
				matchingFunctions: filtered.length,
				functions: filtered.slice(0, limit ?? 500),
			});
		},
	);

	server.registerTool(
		"convex_run_query",
		{
			title: "Run Convex Query",
			description:
				"Run any discovered Convex query, including internal queries, with admin authentication.",
			inputSchema: {
				functionName: z.string().min(1),
				args: convexArgsSchema,
				componentPath: z.string().optional(),
			},
			annotations: { readOnlyHint: true, openWorldHint: false },
		},
		async ({ functionName, args, componentPath }) =>
			toolResponse(
				await runReadOnlyFunction(functionName, args ?? {}, componentPath),
			),
	);

	server.registerTool(
		"convex_run_function",
		{
			title: "Run Convex Function",
			description:
				"Run any discovered Convex query, mutation, or action with admin authentication. Inspect the live function specification first.",
			inputSchema: {
				functionName: z.string().min(1),
				args: convexArgsSchema,
				componentPath: z.string().optional(),
			},
			annotations: {
				readOnlyHint: false,
				destructiveHint: true,
				idempotentHint: false,
				openWorldHint: true,
			},
		},
		async ({ functionName, args, componentPath }) =>
			toolResponse(
				await runConvexFunction(functionName, args ?? {}, componentPath),
			),
	);

	server.registerTool(
		"convex_run_readonly_query",
		{
			title: "Run One-Off Convex Query",
			description:
				"Execute a sandboxed one-off JavaScript query. It can read Convex data but cannot modify data or access the network.",
			inputSchema: { query: z.string().min(1).max(100_000) },
			annotations: { readOnlyHint: true, openWorldHint: false },
		},
		async ({ query }) => toolResponse(await runOneOffQuery(query)),
	);

	server.registerTool(
		"convex_tables",
		{
			title: "List Convex Tables",
			description:
				"List all Convex tables with declared and inferred schemas from the dashboard APIs.",
			annotations: { readOnlyHint: true, openWorldHint: false },
		},
		async () => toolResponse(await listTables()),
	);

	server.registerTool(
		"convex_table_data",
		{
			title: "Read Convex Table Data",
			description:
				"Read a page of raw Convex table data using the same system query as the Convex dashboard and CLI.",
			inputSchema: {
				tableName: z.string().min(1),
				order: z.enum(["asc", "desc"]).default("desc").optional(),
				cursor: z.string().nullable().optional(),
				limit: z.number().int().min(1).max(1000).default(100).optional(),
			},
			annotations: { readOnlyHint: true, openWorldHint: false },
		},
		async ({ tableName, order, cursor, limit }) =>
			toolResponse(
				await runConvexQuery("_system/cli/tableData", {
					table: tableName,
					order: order ?? "desc",
					paginationOpts: {
						numItems: limit ?? 100,
						cursor: cursor ?? null,
					},
				}),
			),
	);

	server.registerTool(
		"convex_logs",
		{
			title: "Read Convex Logs",
			description:
				"Fetch a bounded chunk of recent Convex function execution logs, optionally filtered by text such as a request ID or function name.",
			inputSchema: {
				cursor: z.number().int().min(0).default(0).optional(),
				status: z.enum(["all", "success", "failure"]).default("all").optional(),
				search: z.string().max(1000).optional(),
				entriesLimit: z.number().int().min(1).max(1000).default(100).optional(),
				characterLimit: z
					.number()
					.int()
					.min(1000)
					.max(500_000)
					.default(100_000)
					.optional(),
			},
			annotations: { readOnlyHint: true, openWorldHint: false },
		},
		async ({ cursor, status, search, entriesLimit, characterLimit }) => {
			const response = await convexFetch(
				`/api/stream_function_logs?cursor=${cursor ?? 0}`,
			);
			const result = (await response.json()) as {
				entries?: unknown[];
				newCursor?: number;
			};
			const normalizedSearch = search?.toLowerCase();
			const matchingEntries = (result.entries ?? []).filter((entry) => {
				const execution = entry as { kind?: string; error?: unknown };
				const matchesStatus =
					!status ||
					status === "all" ||
					(execution.kind === "Completion" &&
						(status === "failure"
							? execution.error !== null && execution.error !== undefined
							: execution.error === null || execution.error === undefined));
				return (
					matchesStatus &&
					(!normalizedSearch ||
						JSON.stringify(entry).toLowerCase().includes(normalizedSearch))
				);
			});
			const selectedEntries = matchingEntries.slice(-(entriesLimit ?? 100));
			const maxCharacters = characterLimit ?? 100_000;
			const boundedEntries: unknown[] = [];
			let characters = 0;
			for (const entry of selectedEntries.slice().reverse()) {
				const serialized = JSON.stringify(entry);
				if (characters + serialized.length > maxCharacters) break;
				boundedEntries.push(entry);
				characters += serialized.length;
			}
			boundedEntries.reverse();

			return toolResponse({
				entries: boundedEntries,
				matchingEntries: matchingEntries.length,
				returnedEntries: boundedEntries.length,
				newCursor: result.newCursor ?? cursor ?? 0,
			});
		},
	);

	server.registerTool(
		"convex_environment_variables",
		{
			title: "Inspect Convex Environment Variables",
			description:
				"List Convex deployment environment variables. Values are omitted unless includeValues is explicitly true.",
			inputSchema: {
				includeValues: z.boolean().default(false).optional(),
			},
			annotations: { readOnlyHint: true, openWorldHint: false },
		},
		async ({ includeValues }) =>
			toolResponse(await listEnvironmentVariables(includeValues ?? false)),
	);

	server.registerTool(
		"convex_set_environment_variable",
		{
			title: "Set Convex Environment Variable",
			description: "Set one environment variable on the Convex deployment.",
			inputSchema: {
				name: z.string().regex(/^[A-Za-z][A-Za-z0-9_]*$/),
				value: z.string(),
			},
			annotations: {
				readOnlyHint: false,
				destructiveHint: true,
				idempotentHint: true,
				openWorldHint: false,
			},
		},
		async ({ name, value }) => {
			await convexFetch("/api/update_environment_variables", {
				method: "POST",
				body: JSON.stringify({ changes: [{ name, value }] }),
			});
			return toolResponse({ success: true, name });
		},
	);

	server.registerTool(
		"convex_remove_environment_variable",
		{
			title: "Remove Convex Environment Variable",
			description:
				"Remove one environment variable from the Convex deployment.",
			inputSchema: {
				name: z.string().regex(/^[A-Za-z][A-Za-z0-9_]*$/),
			},
			annotations: {
				readOnlyHint: false,
				destructiveHint: true,
				idempotentHint: true,
				openWorldHint: false,
			},
		},
		async ({ name }) => {
			await convexFetch("/api/update_environment_variables", {
				method: "POST",
				body: JSON.stringify({ changes: [{ name }] }),
			});
			return toolResponse({ success: true, name });
		},
	);
}
