import { Bash } from "just-bash";
import {
	createGitCloneCommand,
	type GitCloneCommandOptions,
} from "./git-clone";

export interface VirtualBashOptions {
	gitClone?: GitCloneCommandOptions;
}

export function createVirtualBash(
	options: VirtualBashOptions = {},
): VirtualBash {
	const gitCloneCommand = createGitCloneCommand(options.gitClone ?? {});

	const bashEnv = new Bash({
		customCommands: [gitCloneCommand],
	});

	return {
		exec: bashEnv.exec,
		getBashEnv: () => bashEnv,
	};
}
