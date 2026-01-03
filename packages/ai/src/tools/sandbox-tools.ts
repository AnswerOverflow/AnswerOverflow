import { tool } from "ai";
import { z } from "zod";
import type { VirtualBash } from "../sandbox/virtual-bash";

export interface SandboxToolsOptions {
	virtualBash: VirtualBash;
	workdir?: string;
}

export interface SandboxTools {
	read: ReturnType<typeof createSandboxReadTool>;
	glob: ReturnType<typeof createSandboxGlobTool>;
	grep: ReturnType<typeof createSandboxGrepTool>;
	write: ReturnType<typeof createSandboxWriteTool>;
	edit: ReturnType<typeof createSandboxEditTool>;
	bash: ReturnType<typeof createSandboxBashTool>;
}

export function createSandboxTools(options: SandboxToolsOptions): SandboxTools {
	const { virtualBash, workdir = "/repo" } = options;

	return {
		read: createSandboxReadTool(virtualBash, workdir),
		glob: createSandboxGlobTool(virtualBash, workdir),
		grep: createSandboxGrepTool(virtualBash, workdir),
		write: createSandboxWriteTool(virtualBash, workdir),
		edit: createSandboxEditTool(virtualBash, workdir),
		bash: createSandboxBashTool(virtualBash, workdir),
	};
}

const DEFAULT_READ_LIMIT = 2000;
const MAX_LINE_LENGTH = 2000;

function createSandboxReadTool(virtualBash: VirtualBash, workdir: string) {
	const readInputSchema = z.object({
		filePath: z.string().describe("The path to the file to read"),
		offset: z
			.number()
			.optional()
			.describe("The line number to start reading from (0-based)"),
		limit: z
			.number()
			.optional()
			.describe("The number of lines to read (defaults to 2000)"),
	});

	return tool({
		type: "function",
		description: `Reads a file from the virtual filesystem.

Usage:
- The filePath can be absolute or relative to ${workdir}
- By default, it reads up to 2000 lines starting from the beginning of the file
- You can optionally specify a line offset and limit (especially handy for long files)
- Any lines longer than 2000 characters will be truncated
- Results are returned using cat -n format, with line numbers starting at 1
- This operates on an IN-MEMORY virtual filesystem, not the real disk.`,
		inputSchema: readInputSchema,
		execute: async (input) => {
			const filepath = input.filePath.startsWith("/")
				? input.filePath
				: `${workdir}/${input.filePath}`;

			const result = await virtualBash.exec(`cat "${filepath}"`);

			if (result.exitCode !== 0) {
				if (result.stderr.includes("No such file")) {
					const dirResult = await virtualBash.exec(
						`ls -la "$(dirname "${filepath}")" 2>/dev/null | head -10`,
					);
					if (dirResult.exitCode === 0 && dirResult.stdout.trim()) {
						return `File not found: ${filepath}\n\nFiles in directory:\n${dirResult.stdout}`;
					}
					return `File not found: ${filepath}`;
				}
				return `Error reading file: ${result.stderr}`;
			}

			const content = result.stdout;
			const limit = input.limit ?? DEFAULT_READ_LIMIT;
			const offset = input.offset ?? 0;
			const lines = content.split("\n");
			const raw = lines.slice(offset, offset + limit).map((line) => {
				return line.length > MAX_LINE_LENGTH
					? `${line.substring(0, MAX_LINE_LENGTH)}...`
					: line;
			});
			const formattedContent = raw.map((line, index) => {
				return `${(index + offset + 1).toString().padStart(5, "0")}| ${line}`;
			});

			let output = "<file>\n";
			output += formattedContent.join("\n");

			const totalLines = lines.length;
			const lastReadLine = offset + formattedContent.length;
			const hasMoreLines = totalLines > lastReadLine;

			if (hasMoreLines) {
				output += `\n\n(File has more lines. Use 'offset' parameter to read beyond line ${lastReadLine})`;
			} else {
				output += `\n\n(End of file - total ${totalLines} lines)`;
			}
			output += "\n</file>";

			return output;
		},
	});
}

function createSandboxGlobTool(virtualBash: VirtualBash, workdir: string) {
	const globInputSchema = z.object({
		pattern: z.string().describe("The glob pattern to match files against"),
		path: z
			.string()
			.optional()
			.describe(
				`The directory to search in. Defaults to ${workdir}. Must be a valid directory path if provided.`,
			),
	});

	return tool({
		type: "function",
		description: `Fast file pattern matching tool for the virtual filesystem.
- Supports glob patterns like "**/*.js" or "src/**/*.ts"
- Returns matching file paths
- Use this tool when you need to find files by name patterns
- This operates on an IN-MEMORY virtual filesystem, not the real disk.`,
		inputSchema: globInputSchema,
		execute: async (input) => {
			const searchPath = input.path ?? workdir;
			const pattern = input.pattern;

			const result = await virtualBash.exec(
				`find "${searchPath}" -type f -name "${pattern.replace(/\*\*/g, "*")}" 2>/dev/null | head -100`,
			);

			if (result.exitCode !== 0 || !result.stdout.trim()) {
				const simpleFind = await virtualBash.exec(
					`find "${searchPath}" -type f 2>/dev/null | grep -E "${pattern.replace(/\./g, "\\.").replace(/\*/g, ".*")}" | head -100`,
				);

				if (!simpleFind.stdout.trim()) {
					return "No files found";
				}

				const files = simpleFind.stdout.trim().split("\n");
				if (files.length >= 100) {
					return (
						files.join("\n") +
						"\n\n(Results are truncated. Consider using a more specific path or pattern.)"
					);
				}
				return files.join("\n");
			}

			const files = result.stdout.trim().split("\n").filter(Boolean);
			if (files.length === 0) {
				return "No files found";
			}

			if (files.length >= 100) {
				return (
					files.join("\n") +
					"\n\n(Results are truncated. Consider using a more specific path or pattern.)"
				);
			}

			return files.join("\n");
		},
	});
}

function createSandboxGrepTool(virtualBash: VirtualBash, workdir: string) {
	const grepInputSchema = z.object({
		pattern: z
			.string()
			.describe("The regex pattern to search for in file contents"),
		path: z
			.string()
			.optional()
			.describe(`The directory to search in. Defaults to ${workdir}.`),
		include: z
			.string()
			.optional()
			.describe('File pattern to include in the search (e.g. "*.js", "*.ts")'),
	});

	return tool({
		type: "function",
		description: `Fast content search tool for the virtual filesystem.
- Searches file contents using regular expressions
- Supports full regex syntax
- Filter files by pattern with the include parameter
- Returns file paths and line numbers with matches
- This operates on an IN-MEMORY virtual filesystem, not the real disk.`,
		inputSchema: grepInputSchema,
		execute: async (input) => {
			if (!input.pattern) {
				return "pattern is required";
			}

			const searchPath = input.path ?? workdir;

			let command = `grep -rn "${input.pattern}" "${searchPath}"`;
			if (input.include) {
				command = `grep -rn --include="${input.include}" "${input.pattern}" "${searchPath}"`;
			}
			command += " 2>/dev/null | head -100";

			const result = await virtualBash.exec(command);

			if (result.exitCode !== 0 && result.exitCode !== 1) {
				return `Error searching: ${result.stderr}`;
			}

			if (!result.stdout.trim()) {
				return "No matches found";
			}

			const lines = result.stdout.trim().split("\n");
			const output = [`Found ${lines.length} matches`, ""];

			let currentFile = "";
			for (const line of lines) {
				const colonIndex = line.indexOf(":");
				if (colonIndex === -1) continue;

				const filePath = line.substring(0, colonIndex);
				const rest = line.substring(colonIndex + 1);
				const secondColon = rest.indexOf(":");
				const lineNum = rest.substring(0, secondColon);
				const lineText = rest.substring(secondColon + 1);

				if (currentFile !== filePath) {
					if (currentFile !== "") {
						output.push("");
					}
					currentFile = filePath;
					output.push(`${filePath}:`);
				}
				const truncatedText =
					lineText.length > 200 ? `${lineText.substring(0, 200)}...` : lineText;
				output.push(`  Line ${lineNum}: ${truncatedText}`);
			}

			if (lines.length >= 100) {
				output.push("");
				output.push(
					"(Results are truncated. Consider using a more specific path or pattern.)",
				);
			}

			return output.join("\n");
		},
	});
}

function createSandboxWriteTool(virtualBash: VirtualBash, workdir: string) {
	const writeInputSchema = z.object({
		content: z.string().describe("The content to write to the file"),
		filePath: z.string().describe("The path to the file to write"),
	});

	return tool({
		type: "function",
		description: `Writes a file to the virtual filesystem.

Usage:
- This tool will overwrite the existing file if there is one at the provided path.
- If this is an existing file, you should use the Read tool first to read the file's contents.
- This operates on an IN-MEMORY virtual filesystem, not the real disk.`,
		inputSchema: writeInputSchema,
		execute: async (input) => {
			const filepath = input.filePath.startsWith("/")
				? input.filePath
				: `${workdir}/${input.filePath}`;

			const escapedContent = input.content
				.replace(/\\/g, "\\\\")
				.replace(/"/g, '\\"')
				.replace(/\$/g, "\\$")
				.replace(/`/g, "\\`");

			const dirPath = filepath.substring(0, filepath.lastIndexOf("/"));
			await virtualBash.exec(`mkdir -p "${dirPath}"`);

			const result = await virtualBash.exec(
				`printf "%s" "${escapedContent}" > "${filepath}"`,
			);

			if (result.exitCode !== 0) {
				return `Error writing file: ${result.stderr}`;
			}

			return `File written: ${filepath}`;
		},
	});
}

function createSandboxEditTool(virtualBash: VirtualBash, workdir: string) {
	const editInputSchema = z.object({
		filePath: z.string().describe("The path to the file to modify"),
		oldString: z.string().describe("The text to replace"),
		newString: z
			.string()
			.describe(
				"The text to replace it with (must be different from oldString)",
			),
		replaceAll: z
			.boolean()
			.optional()
			.describe("Replace all occurrences of oldString (default false)"),
	});

	return tool({
		type: "function",
		description: `Performs string replacements in files on the virtual filesystem.

Usage:
- You should use the Read tool first to read the file's contents before editing.
- The edit will FAIL if oldString is not found in the file.
- Use replaceAll to replace all occurrences of oldString.
- This operates on an IN-MEMORY virtual filesystem, not the real disk.`,
		inputSchema: editInputSchema,
		execute: async (input) => {
			if (input.oldString === input.newString) {
				return "oldString and newString must be different";
			}

			const filepath = input.filePath.startsWith("/")
				? input.filePath
				: `${workdir}/${input.filePath}`;

			const readResult = await virtualBash.exec(`cat "${filepath}"`);
			if (readResult.exitCode !== 0) {
				return `File not found: ${filepath}`;
			}

			const content = readResult.stdout;

			if (!content.includes(input.oldString)) {
				return "oldString not found in content";
			}

			const occurrences = content.split(input.oldString).length - 1;
			if (occurrences > 1 && !input.replaceAll) {
				return `Found ${occurrences} matches for oldString. Provide more surrounding context to identify the correct match, or use replaceAll to replace all occurrences.`;
			}

			let newContent: string;
			if (input.replaceAll) {
				newContent = content.split(input.oldString).join(input.newString);
			} else {
				const index = content.indexOf(input.oldString);
				newContent =
					content.substring(0, index) +
					input.newString +
					content.substring(index + input.oldString.length);
			}

			const escapedContent = newContent
				.replace(/\\/g, "\\\\")
				.replace(/"/g, '\\"')
				.replace(/\$/g, "\\$")
				.replace(/`/g, "\\`");

			const writeResult = await virtualBash.exec(
				`printf "%s" "${escapedContent}" > "${filepath}"`,
			);

			if (writeResult.exitCode !== 0) {
				return `Error writing file: ${writeResult.stderr}`;
			}

			return `File edited: ${filepath}`;
		},
	});
}

const MAX_OUTPUT_LENGTH = 30_000;
const _DEFAULT_TIMEOUT = 2 * 60 * 1000;

function createSandboxBashTool(virtualBash: VirtualBash, workdir: string) {
	const bashInputSchema = z.object({
		command: z.string().describe("The command to execute"),
		description: z
			.string()
			.describe(
				"Clear, concise description of what this command does in 5-10 words.",
			),
	});

	return tool({
		type: "function",
		description: `Executes commands in the sandboxed bash environment with a virtual filesystem.

Available commands: ls, cat, head, tail, grep, find, cd, pwd, echo, wc, sort, uniq, tr, cut, sed, awk, diff, mkdir, rm, cp, mv, touch, and more.

Special commands:
- git clone <url> [dir]: Clone a GitHub repository into the virtual filesystem

This is an IN-MEMORY virtual filesystem - it does NOT access the real disk.

Working directory: ${workdir}

Examples:
- ls -la
- find . -name "*.ts"
- grep -r "function" src/
- git clone https://github.com/user/repo /repo`,
		inputSchema: bashInputSchema,
		execute: async (input) => {
			const fullCommand = `cd "${workdir}" && ${input.command}`;
			const result = await virtualBash.exec(fullCommand);

			let output = result.stdout;
			if (result.stderr) {
				output += (output ? "\n" : "") + result.stderr;
			}

			if (output.length > MAX_OUTPUT_LENGTH) {
				output =
					output.slice(0, MAX_OUTPUT_LENGTH) +
					`\n\n<bash_metadata>\nOutput truncated at ${MAX_OUTPUT_LENGTH} characters\n</bash_metadata>`;
			}

			if (result.exitCode !== 0) {
				output += `\n\n<bash_metadata>\nExit code: ${result.exitCode}\n</bash_metadata>`;
			}

			return output || "(no output)";
		},
	});
}
