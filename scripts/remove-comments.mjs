#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { glob } from "glob";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

function shouldKeepComment(line) {
	const trimmed = line.trim();

	if (!trimmed.startsWith("//")) return false;

	// Keep ts-expect-error and biome-ignore comments
	if (
		trimmed.includes("@ts-expect-error") ||
		trimmed.includes("@ts-ignore") ||
		trimmed.includes("biome-ignore") ||
		trimmed.includes("eslint-disable") ||
		trimmed.includes("eslint-enable")
	) {
		return true;
	}

	return false;
}

function removeComments(content) {
	const lines = content.split("\n");
	const result = [];
	let inMultiLineComment = false;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const trimmed = line.trim();

		// Handle multi-line comments
		if (trimmed.startsWith("/*")) {
			// Check if it's a single-line multi-line comment
			if (trimmed.endsWith("*/") && trimmed.length > 2) {
				// Single line /* */ comment - check if we should keep it
				if (shouldKeepComment(line.replace("/*", "//").replace("*/", ""))) {
					result.push(line);
				}
				// Otherwise skip it
				continue;
			} else {
				// Multi-line comment start
				inMultiLineComment = true;
				// Check if we should keep this multi-line comment
				const commentContent = line.substring(line.indexOf("/*"));
				if (
					commentContent.includes("@ts-expect-error") ||
					commentContent.includes("@ts-ignore") ||
					commentContent.includes("biome-ignore") ||
					commentContent.includes("eslint-disable") ||
					commentContent.includes("eslint-enable")
				) {
					result.push(line);
					// Continue reading until we find the end
					while (i < lines.length - 1 && !lines[i].includes("*/")) {
						i++;
						result.push(lines[i]);
					}
					inMultiLineComment = false;
					continue;
				}
				// Skip the opening line
				continue;
			}
		}

		if (inMultiLineComment) {
			// Check if this line ends the multi-line comment
			if (trimmed.includes("*/")) {
				inMultiLineComment = false;
				// Skip the closing line
				continue;
			}
			// Skip lines inside multi-line comment
			continue;
		}

		// Handle single-line comments
		if (trimmed.startsWith("//")) {
			if (shouldKeepComment(line)) {
				result.push(line);
			}
			// Otherwise skip the comment line
			continue;
		}

		// Regular code line - keep it
		result.push(line);
	}

	return result.join("\n");
}

async function main() {
	const targetDirs = [
		"apps/discord-bot/**/*.{ts,tsx}",
		"apps/main-site/**/*.{ts,tsx}",
		"packages/*/**/*.{ts,tsx}",
	];

	const ignorePatterns = [
		"**/node_modules/**",
		"**/.git/**",
		"**/dist/**",
		"**/build/**",
		"**/.next/**",
		"**/.convex/**",
		"**/scripts/**",
		"packages/convex-test/**",
	];

	const allFiles = [];
	for (const pattern of targetDirs) {
		const files = await glob(pattern, {
			cwd: rootDir,
			ignore: ignorePatterns,
		});
		allFiles.push(...files);
	}

	// Remove duplicates
	const uniqueFiles = [...new Set(allFiles)];

	let totalCleaned = 0;
	const cleanedFiles = [];

	for (const file of uniqueFiles) {
		const filePath = join(rootDir, file);
		const originalContent = readFileSync(filePath, "utf-8");
		const cleanedContent = removeComments(originalContent);

		if (originalContent !== cleanedContent) {
			writeFileSync(filePath, cleanedContent, "utf-8");
			totalCleaned++;
			cleanedFiles.push(file);
		}
	}

	console.log(`\nRemoved comments from ${totalCleaned} files:\n`);
	cleanedFiles.forEach((file) => {
		console.log(`  ${file}`);
	});
}

main().catch(console.error);
