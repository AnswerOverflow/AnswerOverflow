#!/usr/bin/env bun

/**
 * Script to find unused Convex functions
 *
 * This script analyzes all exported Convex functions and checks if they're actually used
 * by searching for references in the codebase.
 */

import { readFile } from "fs/promises";
import { join } from "path";
import { glob } from "glob";

const PACKAGE_ROOT = join(import.meta.dir, "..");
const CONVEX_DIR = join(PACKAGE_ROOT, "convex");

interface FunctionInfo {
	name: string;
	file: string;
	namespace: string;
	type:
		| "query"
		| "mutation"
		| "action"
		| "internalQuery"
		| "internalMutation"
		| "internalAction";
	isPublic: boolean;
}

async function extractFunctionsFromFile(
	filePath: string,
	relativePath: string,
): Promise<FunctionInfo[]> {
	const content = await readFile(filePath, "utf-8");
	const functions: FunctionInfo[] = [];

	// Determine namespace from file path
	// convex/public/channels.ts -> channels
	// convex/publicInternal/channels.ts -> channels
	const pathParts = relativePath.split("/");
	const isPublic =
		pathParts.includes("public") && !pathParts.includes("publicInternal");
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
			regex:
				/export\s+(?:const|function)\s+(\w+)\s*=\s*publicInternalQuery\s*\(/g,
			type: "query" as const,
		},
		{
			regex:
				/export\s+(?:const|function)\s+(\w+)\s*=\s*publicInternalMutation\s*\(/g,
			type: "mutation" as const,
		},
		{
			regex:
				/export\s+(?:const|function)\s+(\w+)\s*=\s*publicInternalAction\s*\(/g,
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
				isPublic,
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

async function searchForFunctionUsage(
	functionName: string,
	namespace: string,
	isPublic: boolean,
): Promise<boolean> {
	// Search patterns:
	// 1. api.namespace.functionName
	// 2. internal.namespace.functionName
	// 3. api.publicInternal.namespace.functionName (for publicInternal functions)
	// 4. ctx.runQuery(api.namespace.functionName, ...)
	// 5. ctx.runMutation(api.namespace.functionName, ...)
	// 6. ctx.runAction(api.namespace.functionName, ...)
	// 7. In FUNCTION_TYPE_MAP (for publicInternal functions)

	const searchDirs = [
		join(PACKAGE_ROOT, "src"),
		join(PACKAGE_ROOT, "../../apps"),
	];

	const patterns = isPublic
		? [
				// Public functions accessed via api
				`api\\.${namespace}\\.${functionName}`,
				`api\\.${namespace}\\.${functionName}\\s*,`,
				`api\\.${namespace}\\.${functionName}\\s*\\)`,
				`internal\\.${namespace}\\.${functionName}`,
				`internal\\.${namespace}\\.${functionName}\\s*,`,
				`internal\\.${namespace}\\.${functionName}\\s*\\)`,
				`ctx\\.runQuery\\(api\\.${namespace}\\.${functionName}`,
				`ctx\\.runMutation\\(api\\.${namespace}\\.${functionName}`,
				`ctx\\.runAction\\(api\\.${namespace}\\.${functionName}`,
				`ctx\\.runQuery\\(internal\\.${namespace}\\.${functionName}`,
				`ctx\\.runMutation\\(internal\\.${namespace}\\.${functionName}`,
				`ctx\\.runAction\\(internal\\.${namespace}\\.${functionName}`,
				// Database service layer access
				`database\\.${namespace}\\.${functionName}`,
				`database\\.${namespace}\\.${functionName}\\s*,`,
				`database\\.${namespace}\\.${functionName}\\s*\\)`,
			]
		: [
				// PublicInternal functions accessed via api.publicInternal
				`api\\.publicInternal\\.${namespace}\\.${functionName}`,
				`api\\.publicInternal\\.${namespace}\\.${functionName}\\s*,`,
				`api\\.publicInternal\\.${namespace}\\.${functionName}\\s*\\)`,
				// Database service layer access
				`database\\.${namespace}\\.${functionName}`,
				`database\\.${namespace}\\.${functionName}\\s*,`,
				`database\\.${namespace}\\.${functionName}\\s*\\)`,
				`"${namespace}\\.${functionName}"`, // In FUNCTION_TYPE_MAP
				`'${namespace}\\.${functionName}'`, // In FUNCTION_TYPE_MAP
			];

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
					for (const pattern of patterns) {
						const regex = new RegExp(pattern, "g");
						if (regex.test(content)) {
							return true;
						}
					}
				} catch (error) {
					// Skip files that can't be read
					continue;
				}
			}
		} catch (error) {
			// Skip directories that don't exist
			continue;
		}
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
		const isUsed = await searchForFunctionUsage(
			func.name,
			func.namespace,
			func.isPublic,
		);
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
		const apiPath = func.isPublic
			? `api.${func.namespace}.${func.name}`
			: `api.publicInternal.${func.namespace}.${func.name}`;
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
