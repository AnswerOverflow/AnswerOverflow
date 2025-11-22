import { readFileSync } from "node:fs";
import { join } from "node:path";
import tseslint from "typescript-eslint";
import noStringComparison from "./eslint-rules/no-string-comparison.mjs";

function getGitignorePatterns() {
	try {
		const gitignoreContent = readFileSync(
			join(process.cwd(), ".gitignore"),
			"utf-8",
		);
		return gitignoreContent
			.split("\n")
			.map((line) => line.trim())
			.filter((line) => line && !line.startsWith("#"))
			.map((pattern) => {
				if (pattern.startsWith("/")) {
					return pattern.slice(1);
				}
				if (pattern.endsWith("/")) {
					return `**/${pattern}**`;
				}
				if (pattern.includes("/")) {
					return `**/${pattern}`;
				}
				return `**/${pattern}`;
			});
	} catch {
		return [];
	}
}

export default tseslint.config(
	{
		files: ["**/*.{ts,tsx}"],
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				ecmaVersion: "latest",
				sourceType: "module",
				projectService: {
					allowDefaultProject: [
						"apps/main-site/src/app/.well-known/openid-configuration/route.ts",
						"packages/database/scripts/dev.ts",
						"packages/database/scripts/find-unused-convex-functions.ts",
						"packages/database/scripts/generate-function-types.ts",
						"packages/discord-api/scripts/sync-openapi.ts",
						"scripts/start-dbs.ts",
					],
				},
			},
		},
		plugins: {
			"no-string-comparison": noStringComparison,
		},
		rules: {
			"no-string-comparison/no-string-comparison": "error",
		},
	},
	{
		ignores: [
			...getGitignorePatterns(),
			"**/convex/_generated/**",
			"**/.context/**",
			"**/packages/convex-test/**",
			"**/packages/discord-api/src/generated.ts",
			"**/packages/database/src/generated/function-types.ts",
			"**/scripts/**",
			"**/packages/*/scripts/**",
			"**/.well-known/**",
		],
	},
);
