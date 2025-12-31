"use node";

import { createMCPClient } from "@ai-sdk/mcp";
import { createSandboxTool, createVirtualBash } from "@packages/ai/sandbox";
import { v } from "convex/values";
import { internalAction } from "../client";
import { chatAgent } from "./agent";

export const generateResponse = internalAction({
	args: {
		threadId: v.string(),
		promptMessageId: v.string(),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const mcpClient = await createMCPClient({
			transport: {
				type: "http",
				url: "https://www.answeroverflow.com/mcp",
			},
		});

		const virtualBash = createVirtualBash({
			gitClone: {
				// TODO: We can pass an installation token here
				credentialProvider: async () => process.env.GITHUB_TOKEN ?? null,
				allowedHosts: ["github.com"],
			},
		});

		const sandboxTool = createSandboxTool({ virtualBash });

		try {
			const mcpTools = await mcpClient.tools();

			await chatAgent.streamText(
				ctx,
				{ threadId: args.threadId },
				{
					promptMessageId: args.promptMessageId,
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
