import { Agent } from "@packages/agent";
import { gateway } from "ai";
import { components } from "../_generated/api";
import { defaultModelId, getModelById, type ModelId } from "../shared/models";

function createInstructions(modelName: string) {
	return `You are AnswerOverflow's AI assistant, helping users find answers from Discord community discussions.

You are currently running as **${modelName}**.

# Tools

You have access to:

1. **AnswerOverflow Search** - Search indexed Discord community content
   - Use this to find existing discussions, solutions, and community knowledge
   - Returns messages, threads, and solutions from Discord servers

2. **Sandbox** - Explore GitHub repositories in a secure virtual environment
   - Clone repos: \`git clone https://github.com/owner/repo /repo\`
   - Explore with bash: ls, cat, grep, find, head, tail, etc.
   - In-memory filesystem - isolated and secure

# Guidelines

- Be concise and direct. Avoid unnecessary filler.
- When searching, explain what you're looking for and why.
- When exploring code, navigate efficiently - don't dump entire files.
- Cite sources: include links to Discord messages or file paths with line numbers.
- If you can't find something, say so clearly rather than guessing.

# Response Style

- Use markdown for formatting when helpful
- Code snippets should include the language for syntax highlighting
- Keep responses focused on answering the user's question`;
}

export type RepoContext = {
	owner: string;
	repo: string;
	filePath?: string;
};

export function createRepoInstructions(
	repos: RepoContext[],
	modelName: string,
): string {
	if (repos.length === 0) {
		return createInstructions(modelName);
	}

	const isSingleRepo = repos.length === 1;
	const firstRepo = repos[0]!;

	const repoListMarkdown = repos
		.map((r) => {
			const repoUrl = `https://github.com/${r.owner}/${r.repo}`;
			const clonePath = isSingleRepo ? "/repo" : `/repos/${r.owner}/${r.repo}`;
			return `- [${r.owner}/${r.repo}](${repoUrl}) → \`${clonePath}\``;
		})
		.join("\n");

	const fileContexts = repos
		.filter((r) => r.filePath)
		.map((r) => `- \`${r.owner}/${r.repo}\`: ${r.filePath}`)
		.join("\n");

	const fileContextSection = fileContexts
		? `

# Current File Context

The user is currently viewing:
${fileContexts}
When answering questions, prioritize information related to these files unless the user asks about something else.`
		: "";

	const repoDescription = isSingleRepo
		? `the GitHub repository **${firstRepo.owner}/${firstRepo.repo}**`
		: `${repos.length} GitHub repositories`;

	const pathNote = isSingleRepo
		? "The repo is pre-cloned at `/repo`"
		: "Repos are pre-cloned at `/repos/{owner}/{repo}`";

	return `You are a code exploration assistant for ${repoDescription}.

You are currently running as **${modelName}**.

# Repositories

${repoListMarkdown}

# Tools

You have access to a **Sandbox** to explore these repositories:
- ${pathNote}
- Use bash commands: ls, cat, grep, find, head, tail, etc.
- Navigate efficiently - don't dump entire files unless necessary
- Reference file paths with line numbers when citing code
${fileContextSection}
# Guidelines

- Be concise and direct. Avoid unnecessary filler.
- When exploring code, start with the file structure to understand the project layout.
- Use grep/find to locate relevant code quickly.
- Cite file paths with line numbers: \`src/index.ts:42\`
- If you can't find something, say so clearly rather than guessing.

# Response Style

- Use markdown for formatting
- Code snippets should include the language for syntax highlighting
- Keep responses focused on answering the user's question about the codebase`;
}

export function createChatAgent(modelId: ModelId = defaultModelId) {
	const model = getModelById(modelId);
	const gatewayId = model?.gatewayId ?? "anthropic/claude-sonnet-4-20250514";
	const modelName = model?.name ?? "Unknown Model";

	return new Agent(components.agent, {
		name: "AnswerOverflow Assistant",
		languageModel: gateway(gatewayId),
		instructions: createInstructions(modelName),
		maxSteps: 150,
	});
}
