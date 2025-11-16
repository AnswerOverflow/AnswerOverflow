#!/usr/bin/env bun

/**
 * Script to find unused Convex functions
 *
 * This script analyzes all exported Convex functions and checks if they're actually used
 * by searching for references in the codebase.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { glob } from "glob";

const PACKAGE_ROOT = join(import.meta.dir, "..");
const CONVEX_DIR = join(PACKAGE_ROOT, "convex");

interface FunctionInfo {
	name: string;
	file: string; // Relative path from convex/ directory (e.g., "authenticated/dashboard.ts")
	namespace: string; // Last path component without extension (e.g., "dashboard")
	type:
		| "query"
		| "mutation"
		| "action"
		| "internalQuery"
		| "internalMutation"
		| "internalAction";
}

async function extractFunctionsFromFile(
	filePath: string,
	relativePath: string,
): Promise<FunctionInfo[]> {
	const content = await readFile(filePath, "utf-8");
	const functions: FunctionInfo[] = [];

	// Determine namespace from file path
	// convex/authenticated/channels.ts -> channels
	// convex/private/channels.ts -> channels
	const pathParts = relativePath.split("/");
	const namespace = pathParts[pathParts.length - 1]?.replace(".ts", "") || "";

	// Match exported functions
	const patterns = [
		{
			regex: /export\s+(?:const|function)\s+(\w+)\s*=\s*query\s*\(/g,
			type: "query" as const,
		},
		{
			regex: /export\s+(?:const|function)\s+(\w+)\s*=\s*mutation\s*\(/g,
			type: "mutation" as const,
		},
		{
			regex: /export\s+(?:const|function)\s+(\w+)\s*=\s*action\s*\(/g,
			type: "action" as const,
		},
		{
			regex: /export\s+(?:const|function)\s+(\w+)\s*=\s*internalQuery\s*\(/g,
			type: "internalQuery" as const,
		},
		{
			regex: /export\s+(?:const|function)\s+(\w+)\s*=\s*internalMutation\s*\(/g,
			type: "internalMutation" as const,
		},
		{
			regex: /export\s+(?:const|function)\s+(\w+)\s*=\s*internalAction\s*\(/g,
			type: "internalAction" as const,
		},
		{
			regex: /export\s+(?:const|function)\s+(\w+)\s*=\s*privateQuery\s*\(/g,
			type: "query" as const,
		},
		{
			regex: /export\s+(?:const|function)\s+(\w+)\s*=\s*privateMutation\s*\(/g,
			type: "mutation" as const,
		},
		{
			regex: /export\s+(?:const|function)\s+(\w+)\s*=\s*privateAction\s*\(/g,
			type: "action" as const,
		},
	];

	for (const pattern of patterns) {
		const matches = [...content.matchAll(pattern.regex)];
		for (const match of matches) {
			const funcName = match[1];
			functions.push({
				name: funcName,
				file: relativePath,
				namespace,
				type: pattern.type,
			});
		}
	}

	return functions;
}

async function findAllConvexFunctions(): Promise<FunctionInfo[]> {
	const allFunctions: FunctionInfo[] = [];

	// Find all TypeScript files in convex directory (excluding _generated)
	const files = await glob("**/*.ts", {
		cwd: CONVEX_DIR,
		ignore: ["**/_generated/**", "**/*.test.ts", "**/*.d.ts"],
	});

	for (const file of files) {
		const filePath = join(CONVEX_DIR, file);
		const functions = await extractFunctionsFromFile(filePath, file);
		allFunctions.push(...functions);
	}

	return allFunctions;
}

/**
 * Generate all possible API paths for a function based on its file location.
 * Convex uses file-based routing where the API path mirrors the directory structure.
 *
 * Examples:
 * - convex/authenticated/dashboard.ts -> api.dashboard.* or internal.authenticated.dashboard.*
 * - convex/private/channels.ts -> api.private.channels.*
 * - convex/client/private.ts -> api.client.private.* or internal.client.private.*
 */
function generateApiPaths(
	functionFile: string,
	functionName: string,
): string[] {
	// Remove .ts extension and split path
	const pathWithoutExt = functionFile.replace(/\.ts$/, "");
	const pathParts = pathWithoutExt.split("/").filter(Boolean);

	if (pathParts.length === 0) {
		return [];
	}

	const apiPaths: string[] = [];

	// Build API path by joining path parts with dots
	// e.g., ["public", "dashboard"] -> "public.dashboard"
	const apiPath = pathParts.join(".");

	// Public API path: api.path.to.function
	apiPaths.push(`api\\.${apiPath}\\.${functionName}`);
	apiPaths.push(`api\\.${apiPath}\\.${functionName}\\s*,`);
	apiPaths.push(`api\\.${apiPath}\\.${functionName}\\s*\\)`);

	// Internal API path: internal.path.to.function
	apiPaths.push(`internal\\.${apiPath}\\.${functionName}`);
	apiPaths.push(`internal\\.${apiPath}\\.${functionName}\\s*,`);
	apiPaths.push(`internal\\.${apiPath}\\.${functionName}\\s*\\)`);

	return apiPaths;
}

async function searchForFunctionUsage(
	functionName: string,
	functionFile: string,
): Promise<boolean> {
	const searchDirs = [
		join(PACKAGE_ROOT, "src"),
		join(PACKAGE_ROOT, "../../apps"),
		CONVEX_DIR, // Also search within convex directory for cross-function calls
	];

	// Generate all possible API paths dynamically based on file structure
	const baseApiPaths = generateApiPaths(functionFile, functionName);

	// Build comprehensive search patterns
	const patterns: string[] = [];

	// Base API paths (api.* and internal.*)
	for (const path of baseApiPaths) {
		patterns.push(path);
	}

	// ctx.runQuery/runMutation/runAction patterns
	// Use the escaped paths directly since they're already properly escaped for regex
	for (const path of baseApiPaths) {
		patterns.push(`ctx\\.runQuery\\(${path}`);
		patterns.push(`ctx\\.runMutation\\(${path}`);
		patterns.push(`ctx\\.runAction\\(${path}`);
	}

	// Scheduler patterns (runAfter, interval, cron)
	// Use the escaped paths directly since they're already properly escaped for regex
	for (const path of baseApiPaths) {
		patterns.push(`ctx\\.scheduler\\.runAfter\\([^,]+,\\s*${path}`);
		patterns.push(`ctx\\.scheduler\\.interval\\([^,]+,\\s*${path}`);
		patterns.push(`ctx\\.scheduler\\.cron\\([^,]+,\\s*${path}`);
	}

	// Database service layer access (uses namespace, which is the last path component)
	const pathParts = functionFile
		.replace(/\.ts$/, "")
		.split("/")
		.filter(Boolean);
	const namespace = pathParts[pathParts.length - 1] || "";
	if (namespace) {
		patterns.push(`database\\.${namespace}\\.${functionName}`);
		patterns.push(`database\\.${namespace}\\.${functionName}\\s*,`);
		patterns.push(`database\\.${namespace}\\.${functionName}\\s*\\)`);
		// FUNCTION_TYPE_MAP patterns (for private functions)
		patterns.push(`"${namespace}\\.${functionName}"`);
		patterns.push(`'${namespace}\\.${functionName}'`);
	}

	for (const searchDir of searchDirs) {
		try {
			const files = await glob("**/*.{ts,tsx}", {
				cwd: searchDir,
				ignore: [
					"**/node_modules/**",
					"**/_generated/**",
					"**/*.test.ts",
					"**/*.test.tsx",
				],
			});

			for (const file of files) {
				const filePath = join(searchDir, file);
				try {
					const content = await readFile(filePath, "utf-8");
					// We search for API paths (e.g., internal.authenticated.dashboard.functionName),
					// not function definitions, so we don't need to skip the definition file
					for (const pattern of patterns) {
						const regex = new RegExp(pattern, "g");
						if (regex.test(content)) {
							return true;
						}
					}
				} catch {}
			}
		} catch {}
	}

	return false;
}

async function main() {
	console.log("Finding all Convex functions...");
	const allFunctions = await findAllConvexFunctions();
	console.log(`Found ${allFunctions.length} Convex functions\n`);

	console.log("Checking for unused functions...\n");
	const unusedFunctions: FunctionInfo[] = [];

	for (const func of allFunctions) {
		const isUsed = await searchForFunctionUsage(func.name, func.file);
		if (!isUsed) {
			unusedFunctions.push(func);
		}
	}

	if (unusedFunctions.length === 0) {
		console.log("✅ No unused Convex functions found!");
		process.exit(0);
	}

	console.log(
		`❌ Found ${unusedFunctions.length} unused Convex function(s):\n`,
	);
	for (const func of unusedFunctions) {
		// Generate API path dynamically from file structure
		const pathWithoutExt = func.file.replace(/\.ts$/, "");
		const pathParts = pathWithoutExt.split("/").filter(Boolean);
		const apiPath =
			pathParts.length > 0
				? `api.${pathParts.join(".")}.${func.name}`
				: `api.${func.name}`;
		console.log(`  - ${func.name} (${func.type}) in ${func.file}`);
		console.log(`    API path: ${apiPath}`);
		console.log();
	}

	process.exit(1);
}

main().catch((error) => {
	console.error("Error:", error);
	process.exit(1);
});
