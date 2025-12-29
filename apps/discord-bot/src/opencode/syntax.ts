const EXTENSION_TO_LANGUAGE: Record<string, string> = {
	ts: "typescript",
	tsx: "typescript",
	js: "javascript",
	jsx: "javascript",
	py: "python",
	rb: "ruby",
	rs: "rust",
	go: "go",
	java: "java",
	kt: "kotlin",
	swift: "swift",
	cs: "csharp",
	cpp: "cpp",
	c: "c",
	h: "c",
	hpp: "cpp",
	php: "php",
	html: "html",
	css: "css",
	scss: "scss",
	sass: "sass",
	less: "less",
	json: "json",
	yaml: "yaml",
	yml: "yaml",
	xml: "xml",
	sql: "sql",
	sh: "bash",
	bash: "bash",
	zsh: "bash",
	fish: "fish",
	ps1: "powershell",
	md: "markdown",
	mdx: "markdown",
	graphql: "graphql",
	gql: "graphql",
	dockerfile: "dockerfile",
	toml: "toml",
	ini: "ini",
	env: "bash",
	vue: "vue",
	svelte: "svelte",
	astro: "astro",
	lua: "lua",
	r: "r",
	dart: "dart",
	scala: "scala",
	clj: "clojure",
	ex: "elixir",
	exs: "elixir",
	erl: "erlang",
	hs: "haskell",
	ml: "ocaml",
	fs: "fsharp",
	nim: "nim",
	zig: "zig",
	v: "vlang",
	sol: "solidity",
	tf: "hcl",
	prisma: "prisma",
};

export function getLanguageFromFilename(filename: string): string {
	const ext = filename.split(".").pop()?.toLowerCase();
	if (!ext) return "";

	const baseName = filename.toLowerCase();
	if (baseName === "dockerfile") return "dockerfile";
	if (baseName === "makefile") return "makefile";
	if (baseName.endsWith(".config.ts")) return "typescript";
	if (baseName.endsWith(".config.js")) return "javascript";

	return EXTENSION_TO_LANGUAGE[ext] ?? "";
}

export function formatCodeBlock(
	content: string,
	language?: string,
	maxLines?: number,
): string {
	const lines = content.split("\n");
	const lang = language ?? "";

	if (maxLines && lines.length > maxLines) {
		const truncatedContent = lines.slice(0, maxLines).join("\n");
		return `\`\`\`${lang}\n${truncatedContent}\n... (${lines.length - maxLines} more lines)\n\`\`\``;
	}

	return `\`\`\`${lang}\n${content}\n\`\`\``;
}

export function formatInlineCode(content: string): string {
	if (content.includes("`")) {
		return `\`\` ${content} \`\``;
	}
	return `\`${content}\``;
}

export type DiffLine = {
	type: "add" | "remove" | "context" | "header";
	content: string;
	oldLineNum?: number;
	newLineNum?: number;
};

export function parseDiff(diffContent: string): DiffLine[] {
	const lines = diffContent.split("\n");
	const result: DiffLine[] = [];
	let oldLineNum = 0;
	let newLineNum = 0;

	for (const line of lines) {
		if (line.startsWith("@@")) {
			const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
			if (match) {
				oldLineNum = parseInt(match[1] ?? "0", 10);
				newLineNum = parseInt(match[2] ?? "0", 10);
			}
			result.push({ type: "header", content: line });
		} else if (line.startsWith("+") && !line.startsWith("+++")) {
			result.push({
				type: "add",
				content: line.slice(1),
				newLineNum: newLineNum++,
			});
		} else if (line.startsWith("-") && !line.startsWith("---")) {
			result.push({
				type: "remove",
				content: line.slice(1),
				oldLineNum: oldLineNum++,
			});
		} else if (line.startsWith(" ")) {
			result.push({
				type: "context",
				content: line.slice(1),
				oldLineNum: oldLineNum++,
				newLineNum: newLineNum++,
			});
		} else if (line.startsWith("diff ") || line.startsWith("index ")) {
			result.push({ type: "header", content: line });
		} else if (line.startsWith("---") || line.startsWith("+++")) {
			result.push({ type: "header", content: line });
		}
	}

	return result;
}

export function formatDiffAsCodeBlock(
	diffContent: string,
	maxLines?: number,
): string {
	const lines = diffContent.split("\n");

	if (maxLines && lines.length > maxLines) {
		const truncatedContent = lines.slice(0, maxLines).join("\n");
		return `\`\`\`diff\n${truncatedContent}\n... (${lines.length - maxLines} more lines)\n\`\`\``;
	}

	return `\`\`\`diff\n${diffContent}\n\`\`\``;
}

export function formatDiffStats(additions: number, deletions: number): string {
	const addStr = additions > 0 ? `+${additions}` : "";
	const delStr = deletions > 0 ? `-${deletions}` : "";

	if (addStr && delStr) {
		return `${addStr}, ${delStr}`;
	}
	return addStr || delStr || "no changes";
}

export function truncateText(text: string, maxLength: number): string {
	if (text.length <= maxLength) return text;
	return text.slice(0, maxLength - 3) + "...";
}

export function extractCodeBlocks(
	markdown: string,
): Array<{ language: string; code: string; start: number; end: number }> {
	const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
	const blocks: Array<{
		language: string;
		code: string;
		start: number;
		end: number;
	}> = [];

	let match = codeBlockRegex.exec(markdown);
	while (match !== null) {
		blocks.push({
			language: match[1] ?? "",
			code: match[2] ?? "",
			start: match.index,
			end: match.index + match[0].length,
		});
		match = codeBlockRegex.exec(markdown);
	}

	return blocks;
}

export function formatToolName(tool: string): string {
	const toolNames: Record<string, string> = {
		bash: "Terminal",
		read: "Read File",
		write: "Write File",
		edit: "Edit File",
		glob: "Search Files",
		grep: "Search Content",
		task: "Task",
		webfetch: "Web Fetch",
		todoread: "Read Todos",
		todowrite: "Write Todos",
		skill: "Load Skill",
	};

	return toolNames[tool.toLowerCase()] ?? tool;
}

export function formatDuration(ms: number): string {
	if (ms < 1000) return `${ms}ms`;
	if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
	const minutes = Math.floor(ms / 60000);
	const seconds = Math.floor((ms % 60000) / 1000);
	return `${minutes}m ${seconds}s`;
}

export function formatTokens(tokens: number): string {
	if (tokens < 1000) return tokens.toString();
	if (tokens < 1000000) return `${(tokens / 1000).toFixed(1)}k`;
	return `${(tokens / 1000000).toFixed(2)}M`;
}

export function formatCost(cost: number): string {
	if (cost < 0.01) return `$${cost.toFixed(4)}`;
	if (cost < 1) return `$${cost.toFixed(3)}`;
	return `$${cost.toFixed(2)}`;
}
