import { Bash } from "just-bash";
import {
	createGitCloneCommand,
	type GitCloneCommandOptions,
} from "./git-clone";

export interface VirtualBashOptions {
	gitClone?: GitCloneCommandOptions;
}

export interface VirtualBashResult {
	stdout: string;
	stderr: string;
	exitCode: number;
}

export interface VirtualBash {
	exec: (command: string) => Promise<VirtualBashResult>;
	getBashEnv: () => Bash;
}

export function createVirtualBash(
	options: VirtualBashOptions = {},
): VirtualBash {
	const gitCloneCommand = createGitCloneCommand(options.gitClone ?? {});

	const bashEnv = new Bash({
		customCommands: [gitCloneCommand],
	});

	async function exec(command: string): Promise<VirtualBashResult> {
		const result = await bashEnv.exec(command);
		return {
			stdout: result.stdout,
			stderr: result.stderr,
			exitCode: result.exitCode,
		};
	}

	return {
		exec,
		getBashEnv: () => bashEnv,
	};
}
