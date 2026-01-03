"use node";

import { createMCPClient } from "@ai-sdk/mcp";
import { createSandboxTools, createVirtualBash } from "@packages/ai/tools";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../client";
import { defaultModelId, getModelById, vModelId } from "../shared/models";
import { createChatAgent, createRepoInstructions } from "./agent";

export const generateResponse = internalAction({
	args: {
		threadId: v.string(),
		promptMessageId: v.string(),
		modelId: v.optional(vModelId),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const modelId = args.modelId ?? defaultModelId;
		const threadMetadata = await ctx.runQuery(
			internal.chat.queries.getThreadMetadata,
			{ threadId: args.threadId },
		);

		const mcpClient = await createMCPClient({
			transport: {
				type: "http",
				url: "https://www.answeroverflow.com/mcp",
			},
		});

		const virtualBash = createVirtualBash({
			gitClone: {
				credentialProvider: async () => process.env.GITHUB_TOKEN ?? null,
				allowedHosts: ["github.com"],
			},
		});

		const repos = threadMetadata?.repos ?? [];
		for (const repo of repos) {
			const clonePath =
				repos.length === 1 ? "/repo" : `/repos/${repo.owner}/${repo.repo}`;
			await virtualBash.exec(
				`git clone https://github.com/${repo.owner}/${repo.repo} ${clonePath}`,
			);
		}

		const workdir = repos.length === 1 ? "/repo" : "/repos";
		const sandboxTools = createSandboxTools({ virtualBash, workdir });

		try {
			const mcpTools = await mcpClient.tools();

			const model = getModelById(modelId);
			const modelName = model?.name ?? "Unknown Model";

			const systemOverride =
				repos.length > 0 ? createRepoInstructions(repos, modelName) : undefined;

			const agent = createChatAgent(modelId);

			await agent.streamText(
				ctx,
				{ threadId: args.threadId },
				{
					promptMessageId: args.promptMessageId,
					system: systemOverride,
					tools: {
						...agent.options.tools,
						...mcpTools,
						...sandboxTools,
					},
					providerOptions: {
						gateway: {
							order: ["cerebras"],
						},
					},
				},
				{ saveStreamDeltas: true },
			);
		} finally {
			await mcpClient.close();
		}

		return null;
	},
});
