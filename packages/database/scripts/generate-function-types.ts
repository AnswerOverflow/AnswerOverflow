#!/usr/bin/env bun

/**
 * Codegen script to extract function types from Convex API
 *
 * This script analyzes the private, public, and authenticated modules to determine
 * which functions are queries, mutations, or actions, and generates a runtime mapping.
 */

import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PACKAGE_ROOT = join(__dirname, "..");
const PRIVATE_DIR = join(PACKAGE_ROOT, "convex/private");
const PUBLIC_DIR = join(PACKAGE_ROOT, "convex/public");
const AUTHENTICATED_DIR = join(PACKAGE_ROOT, "convex/authenticated");
const OUTPUT_FILE = join(PACKAGE_ROOT, "src/generated/function-types.ts");

interface FunctionInfo {
	path: string;
	type: "query" | "mutation" | "action";
}

type DirectoryType = "private" | "public" | "authenticated";

async function extractFunctionsFromFile(
	filePath: string,
	namespace: string,
	directoryType: DirectoryType,
): Promise<FunctionInfo[]> {
	const content = await readFile(filePath, "utf-8");
	const functions: FunctionInfo[] = [];

	let queryPatterns: string[];
	let mutationPatterns: string[];
	let actionPatterns: string[];

	if (directoryType === "authenticated") {
		queryPatterns = ["authenticatedQuery", "guildManagerQuery"];
		mutationPatterns = ["authenticatedMutation", "guildManagerMutation"];
		actionPatterns = [
			"authenticatedAction",
			"guildManagerAction",
			"manageGuildAction",
		];
	} else if (directoryType === "public") {
		queryPatterns = ["publicQuery"];
		mutationPatterns = ["publicMutation"];
		actionPatterns = ["publicAction"];
	} else {
		queryPatterns = ["privateQuery"];
		mutationPatterns = ["privateMutation"];
		actionPatterns = ["privateAction"];
	}

	for (const pattern of queryPatterns) {
		const regex = new RegExp(
			`export\\s+(?:const|function)\\s+(\\w+)\\s*=\\s*${pattern}`,
			"g",
		);
		for (const match of content.matchAll(regex)) {
			const funcName = match[1];
			functions.push({
				path: namespace ? `${namespace}.${funcName}` : funcName,
				type: "query",
			});
		}
	}

	for (const pattern of mutationPatterns) {
		const regex = new RegExp(
			`export\\s+(?:const|function)\\s+(\\w+)\\s*=\\s*${pattern}`,
			"g",
		);
		for (const match of content.matchAll(regex)) {
			const funcName = match[1];
			functions.push({
				path: namespace ? `${namespace}.${funcName}` : funcName,
				type: "mutation",
			});
		}
	}

	for (const pattern of actionPatterns) {
		const regex = new RegExp(
			`export\\s+(?:const|function)\\s+(\\w+)\\s*=\\s*${pattern}`,
			"g",
		);
		for (const match of content.matchAll(regex)) {
			const funcName = match[1];
			functions.push({
				path: namespace ? `${namespace}.${funcName}` : funcName,
				type: "action",
			});
		}
	}

	return functions;
}

async function scanDirectory(
	dir: string,
	directoryType: DirectoryType,
	allFunctions: FunctionInfo[],
	namespaces: Set<string>,
	namespaceToFunctions: Map<string, FunctionInfo[]>,
): Promise<void> {
	const files = await readdir(dir);

	for (const file of files) {
		if (file.endsWith(".test.ts") || !file.endsWith(".ts")) {
			continue;
		}
		if (file === "custom_functions.ts") {
			continue;
		}

		const filePath = join(dir, file);
		const namespace = file.replace(".ts", "");
		namespaces.add(namespace);

		const functions = await extractFunctionsFromFile(
			filePath,
			namespace,
			directoryType,
		);
		allFunctions.push(...functions);

		const existing = namespaceToFunctions.get(namespace) || [];
		namespaceToFunctions.set(namespace, [...existing, ...functions]);
	}
}

async function generateFunctionTypes(): Promise<void> {
	const privateAndPublicFunctions: FunctionInfo[] = [];
	const authenticatedFunctions: FunctionInfo[] = [];
	const privatePublicNamespaces = new Set<string>();
	const authenticatedNamespaces = new Set<string>();
	const namespaceToFunctions = new Map<string, FunctionInfo[]>();
	const authenticatedNamespaceToFunctions = new Map<string, FunctionInfo[]>();

	await scanDirectory(
		PRIVATE_DIR,
		"private",
		privateAndPublicFunctions,
		privatePublicNamespaces,
		namespaceToFunctions,
	);
	await scanDirectory(
		PUBLIC_DIR,
		"public",
		privateAndPublicFunctions,
		privatePublicNamespaces,
		namespaceToFunctions,
	);
	await scanDirectory(
		AUTHENTICATED_DIR,
		"authenticated",
		authenticatedFunctions,
		authenticatedNamespaces,
		authenticatedNamespaceToFunctions,
	);

	const allFunctions = [
		...privateAndPublicFunctions,
		...authenticatedFunctions,
	];
	allFunctions.sort((a, b) => a.path.localeCompare(b.path));

	const uniqueFunctions = new Map<string, FunctionInfo>();
	for (const func of allFunctions) {
		if (!uniqueFunctions.has(func.path)) {
			uniqueFunctions.set(func.path, func);
		}
	}

	const typeMapEntries = Array.from(uniqueFunctions.values())
		.map((f) => `  "${f.path}": "${f.type}"`)
		.join(",\n");

	const privatePublicNamespaceArray = Array.from(
		privatePublicNamespaces,
	).sort();
	const authenticatedNamespaceArray = Array.from(
		authenticatedNamespaces,
	).sort();
	const allNamespaces = [
		...new Set([
			...privatePublicNamespaceArray,
			...authenticatedNamespaceArray,
		]),
	].sort();

	const namespaceStructureEntries = privatePublicNamespaceArray
		.map((ns) => {
			const functions = namespaceToFunctions.get(ns) || [];
			const functionNames = [
				...new Set(functions.map((f) => f.path.split(".")[1])),
			].sort();
			return `  "${ns}": ${JSON.stringify(functionNames)}`;
		})
		.join(",\n");

	const authenticatedNamespaceStructureEntries = authenticatedNamespaceArray
		.map((ns) => {
			const functions = authenticatedNamespaceToFunctions.get(ns) || [];
			const functionNames = [
				...new Set(functions.map((f) => f.path.split(".")[1])),
			].sort();
			return `  "${ns}": ${JSON.stringify(functionNames)}`;
		})
		.join(",\n");

	const output = `// Auto-generated by scripts/generate-function-types.ts
// DO NOT EDIT MANUALLY

export const FUNCTION_TYPE_MAP = {
${typeMapEntries}
} as const;

export const NAMESPACES = ${JSON.stringify(allNamespaces)} as const;

export const NAMESPACE_STRUCTURE = {
${namespaceStructureEntries}
} as const;

export const AUTHENTICATED_NAMESPACE_STRUCTURE = {
${authenticatedNamespaceStructureEntries}
} as const;

export type FunctionPath = keyof typeof FUNCTION_TYPE_MAP;
export type FunctionType = typeof FUNCTION_TYPE_MAP[FunctionPath];

export function getFunctionType(path: FunctionPath): FunctionType {
	return FUNCTION_TYPE_MAP[path];
}

export function isNamespace(key: string): key is keyof typeof NAMESPACE_STRUCTURE {
	return key in NAMESPACE_STRUCTURE;
}

export function isAuthenticatedNamespace(key: string): key is keyof typeof AUTHENTICATED_NAMESPACE_STRUCTURE {
	return key in AUTHENTICATED_NAMESPACE_STRUCTURE;
}

export function getNamespaceFunctions(namespace: keyof typeof NAMESPACE_STRUCTURE): readonly string[] {
	return NAMESPACE_STRUCTURE[namespace];
}

export function getAuthenticatedNamespaceFunctions(namespace: keyof typeof AUTHENTICATED_NAMESPACE_STRUCTURE): readonly string[] {
	return AUTHENTICATED_NAMESPACE_STRUCTURE[namespace];
}
`;

	await Bun.write(OUTPUT_FILE, output);
	console.log(
		`Generated ${allFunctions.length} function mappings (${privateAndPublicFunctions.length} private/public, ${authenticatedFunctions.length} authenticated) and ${allNamespaces.length} namespaces in ${OUTPUT_FILE}`,
	);
}

generateFunctionTypes().catch((error) => {
	console.error("Error generating function types:", error);
	process.exit(1);
});
