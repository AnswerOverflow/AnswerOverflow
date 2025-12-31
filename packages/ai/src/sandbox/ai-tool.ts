import { tool } from "ai";
import { z } from "zod";
import type { VirtualBash } from "./virtual-bash";

export interface CreateSandboxToolOptions {
	virtualBash: VirtualBash;
	description?: string;
}

const sandboxInputSchema = z.object({
	command: z
		.string()
		.describe("The bash command to execute in the virtual filesystem"),
});

type SandboxInput = z.infer<typeof sandboxInputSchema>;

export function createSandboxTool(options: CreateSandboxToolOptions) {
	const {
		virtualBash,
		description = `Execute commands in a sandboxed bash environment with a virtual filesystem.

Available commands: ls, cat, head, tail, grep, find, cd, pwd, echo, wc, sort, uniq, tr, cut, sed, awk, diff, and more.

Special commands:
- git clone <url> [dir]: Clone a GitHub repository into the virtual filesystem (shallow clone by default)

This is an IN-MEMORY virtual filesystem - it does NOT access the real disk. Use 'git clone' to load repositories you want to explore.

Examples:
- git clone https://github.com/user/repo /repo
- ls /repo
- cat /repo/README.md
- grep -r "function" /repo/src`,
	} = options;

	return tool({
		type: "function",
		description,
		inputSchema: sandboxInputSchema,
		execute: async (input: SandboxInput) => {
			const result = await virtualBash.exec(input.command);
			return {
				stdout: result.stdout,
				stderr: result.stderr,
				exitCode: result.exitCode,
			};
		},
	});
}
