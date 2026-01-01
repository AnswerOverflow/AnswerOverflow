"use node";

import { createMCPClient } from "@ai-sdk/mcp";
import { createSandboxTool, createVirtualBash } from "@packages/ai/sandbox";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../client";
import { chatAgent, createRepoInstructions } from "./agent";

export const generateResponse = internalAction({
	args: {
		threadId: v.string(),
		promptMessageId: v.string(),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
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

		if (threadMetadata?.repoContext) {
			const { owner, repo } = threadMetadata.repoContext;
			await virtualBash.exec(
				`git clone https://github.com/${owner}/${repo} /repo`,
			);
		}

		const sandboxTool = createSandboxTool({ virtualBash });

		try {
			const mcpTools = await mcpClient.tools();

			const systemOverride = threadMetadata?.repoContext
				? createRepoInstructions(threadMetadata.repoContext)
				: undefined;

			await chatAgent.streamText(
				ctx,
				{ threadId: args.threadId },
				{
					promptMessageId: args.promptMessageId,
					system: systemOverride,
					tools: {
						...chatAgent.options.tools,
						...mcpTools,
						sandbox: sandboxTool,
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
