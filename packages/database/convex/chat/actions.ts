"use node";

import { createMCPClient } from "@ai-sdk/mcp";
import { createSandboxTools, createVirtualBash } from "@packages/ai/tools";
import { gateway, generateText } from "ai";
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

		if (repos.length > 0) {
			await ctx.runMutation(internal.chat.queries.updateAgentStatus, {
				threadId: args.threadId,
				status: "cloning_repo",
			});
		}

		for (const repo of repos) {
			const clonePath =
				repos.length === 1 ? "/repo" : `/repos/${repo.owner}/${repo.repo}`;
			await virtualBash.exec(
				`git clone https://github.com/${repo.owner}/${repo.repo} ${clonePath}`,
			);
		}

		const workdir = repos.length === 1 ? "/repo" : "/repos";
		const sandboxTools = createSandboxTools({ virtualBash, workdir });

		await ctx.runMutation(internal.chat.queries.updateAgentStatus, {
			threadId: args.threadId,
			status: "thinking",
		});

		const mcpTools = await mcpClient.tools();

		const model = getModelById(modelId);
		const modelName = model?.name ?? "Unknown Model";

		const systemOverride =
			repos.length > 0 ? createRepoInstructions(repos, modelName) : undefined;

		const agent = createChatAgent(modelId);

		await ctx.runMutation(internal.chat.queries.updateAgentStatus, {
			threadId: args.threadId,
			status: "responding",
		});

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

		await ctx.runMutation(internal.chat.queries.updateAgentStatus, {
			threadId: args.threadId,
			status: "idle",
		});
		const threadInfo = await ctx.runQuery(internal.chat.queries.getThreadInfo, {
			threadId: args.threadId,
		});
		if (!threadInfo?.title) {
			await ctx.scheduler.runAfter(0, internal.chat.actions.generateTitle, {
				threadId: args.threadId,
			});
		}

		return null;
	},
});

export const generateTitle = internalAction({
	args: {
		threadId: v.string(),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const messages = await ctx.runQuery(
			internal.chat.queries.getRecentMessages,
			{ threadId: args.threadId, limit: 4 },
		);

		if (messages.length === 0) {
			return null;
		}

		const conversationContext = messages
			.map((m) => `${m.role}: ${m.content}`)
			.join("\n\n");

		const { text } = await generateText({
			model: gateway("google/gemini-2.5-flash"),
			prompt: `Generate a short, descriptive title (max 50 characters) for this conversation. Return ONLY the title, no quotes or extra text.

Conversation:
${conversationContext}`,
		});

		const title = text.trim().slice(0, 50);

		await ctx.runMutation(internal.chat.queries.updateThreadTitle, {
			threadId: args.threadId,
			title,
		});

		return null;
	},
});
